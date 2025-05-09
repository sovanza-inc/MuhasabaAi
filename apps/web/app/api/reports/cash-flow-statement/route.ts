import { NextResponse } from 'next/server';
import jsPDF from 'jspdf';

export async function POST(request: Request) {
  try {
    const { data, cashFlowData } = await request.json();

    // Create a new PDF document
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 20;

    // Helper function to format currency
    const formatAmount = (amount: number) => {
      const absAmount = Math.abs(amount);
      const formatted = absAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      return formatted;
    };

    // Helper function to add header
    const addHeader = () => {
      // Add title and date
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Muhasaba', margin, margin + 5);
      
      pdf.setFontSize(14);
      pdf.text('STATEMENT OF CASH FLOWS', margin, margin + 12);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      // Handle date range display with fallback
      let dateRangeText = 'For the Current Period';
      if (data.period?.startDate && data.period?.endDate) {
        const startDate = new Date(data.period.startDate);
        const endDate = new Date(data.period.endDate);
        dateRangeText = `For the Period ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
      }
      pdf.text(dateRangeText, margin, margin + 18);
      
      // Add column headers
      const startY = margin + 30;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      
      pdf.text('Description', margin, startY);
      pdf.text('2024', pageWidth - margin - 35, startY, { align: 'right' });
      pdf.text('2023', pageWidth - margin, startY, { align: 'right' });
      
      // Underline headers
      pdf.setLineWidth(0.2);
      pdf.line(margin, startY + 1, pageWidth - margin, startY + 1);
      
      return startY + 8;
    };

    // Helper function to add section
    const addSection = (title: string, items: any[], startY: number) => {
      let currentY = startY;
      
      // Add section title
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, margin, currentY);
      currentY += 6;
      
      // Add items
      pdf.setFont('helvetica', 'normal');
      items.forEach(item => {
        // Indent based on level
        const xPos = margin + (item.indent || 0) * 5;
        
        // Description
        if (item.isTotal || item.isSubTotal) {
          pdf.setFont('helvetica', 'bold');
        }
        pdf.text(item.description, xPos, currentY);
        
        // Amounts
        const amount2024Text = formatAmount(item.amount2024);
        const amount2023Text = formatAmount(item.amount2023);
        
        pdf.text(amount2024Text, pageWidth - margin - 35, currentY, { align: 'right' });
        pdf.text(amount2023Text, pageWidth - margin, currentY, { align: 'right' });
        
        if (item.isTotal) {
          // Double underline for totals
          pdf.setLineWidth(0.2);
          pdf.line(pageWidth - margin - 70, currentY + 1, pageWidth - margin, currentY + 1);
          pdf.line(pageWidth - margin - 70, currentY + 2, pageWidth - margin, currentY + 2);
        } else if (item.isSubTotal) {
          // Single underline for subtotals
          pdf.setLineWidth(0.2);
          pdf.line(pageWidth - margin - 70, currentY + 1, pageWidth - margin, currentY + 1);
        }
        
        pdf.setFont('helvetica', 'normal');
        currentY += 6;
      });
      
      return currentY + 4;
    };

    // Start generating PDF
    let y = addHeader();

    // Add sections
    y = addSection('Operating Activities', cashFlowData.operatingActivities, y);
    y = addSection('Investing Activities', cashFlowData.investingActivities, y + 4);
    y = addSection('Financing Activities', cashFlowData.financingActivities, y + 4);

    // Calculate total net change in cash
    const totalNet2024 = cashFlowData.operatingActivities[2].amount2024 + 
                        cashFlowData.investingActivities[2].amount2024 + 
                        cashFlowData.financingActivities[2].amount2024;
    const totalNet2023 = cashFlowData.operatingActivities[2].amount2023 + 
                        cashFlowData.investingActivities[2].amount2023 + 
                        cashFlowData.financingActivities[2].amount2023;

    // Add total
    const totalCashFlow = [
      { 
        description: 'Net increase (decrease) in cash and cash equivalents',
        amount2024: totalNet2024,
        amount2023: totalNet2023,
        isTotal: true
      }
    ];
    addSection('', totalCashFlow, y + 4);

    // Add footer note
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    const footerNote = 'The accompanying notes are an integral part of these financial statements.';
    pdf.text(footerNote, margin, pageHeight - margin);

    // Convert PDF to blob
    const pdfOutput = pdf.output('arraybuffer');
    const buffer = Buffer.from(pdfOutput);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=cash-flow-statement.pdf'
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to generate PDF' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 