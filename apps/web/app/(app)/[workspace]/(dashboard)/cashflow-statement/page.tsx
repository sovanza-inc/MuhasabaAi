'use client'

import {
  Box,
  Heading,
  Text,
  HStack,
  Select,
  Button,
  Spinner,
  useToast,
  Image,
  VStack,
  IconButton
} from '@chakra-ui/react'
import { Card, CardBody } from '@chakra-ui/react'
import { PageHeader } from '#features/common/components/page-header'
import { AreaChart } from '@saas-ui/charts'
import React, { useState } from 'react'
import { LuDownload, LuPlus } from 'react-icons/lu'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import { EditablePdfPreview, FilteredCashFlowData } from './components/EditablePdfPreview'
import { processTransactions } from './utils/processTransactions'
import { CustomStatement } from './types'
import jsPDF from 'jspdf'
import { useModals } from '@saas-ui/react'
import { z } from 'zod'

interface BankTransaction {
  transaction_id: string;
  account_id: string;
  transaction_information: string;
  transaction_reference: string | null;
  amount: {
    amount: number;
    currency: string;
  };
  credit_debit_indicator: string;
  status: string;
  booking_date_time: string;
  value_date_time: string;
  bank_name?: string;
  bank_id?: string;
  account_type?: string;
  account_name?: string;
}

interface Bank {
  id: string;
  bank_identifier: string;
  name: string;
}

export default function CashflowStatementPage() {
  const toast = useToast()
  const [workspace] = useCurrentWorkspace()
  const [isLoading, setIsLoading] = React.useState(true)
  const [transactions, setTransactions] = React.useState<BankTransaction[]>([])
  const [authToken, setAuthToken] = React.useState<string | null>(null)
  const [customerId, setCustomerId] = React.useState<string | null>(null)
  const [connectedBanks, setConnectedBanks] = React.useState<Bank[]>([])
  const [selectedBankId, setSelectedBankId] = React.useState<string>('all')
  const [selectedMonth, setSelectedMonth] = React.useState('all')
  const contentRef = React.useRef<HTMLDivElement>(null)
  const logoRef = React.useRef<HTMLImageElement>(null)
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false)
  const [customStatements, setCustomStatements] = useState<CustomStatement[]>([])
  const modals = useModals()

  // Initialize auth token and customer ID
  React.useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get auth token
        const authResponse = await fetch('/api/bank-integration/auth', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!authResponse.ok) {
          throw new Error('Failed to authenticate');
        }

        const authData = await authResponse.json();
        setAuthToken(authData.access_token);

        // Check if customer exists
        const customerCheckResponse = await fetch(`/api/bank-integration/get-customer?app_user_id=${workspace.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authData.access_token}`
          }
        });

        if (customerCheckResponse.ok) {
          const customerData = await customerCheckResponse.json();
          setCustomerId(customerData.customer_id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        toast({
          title: 'Error',
          description: 'Failed to initialize authentication',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      }
    }

    initializeAuth()
  }, [workspace?.id, toast])

  // Fetch connected banks and their accounts
  const fetchConnectedBanks = React.useCallback(async () => {
    if (!customerId || !authToken) return []

    try {
      const response = await fetch(`/api/bank-integration/accounts?customer_id=${customerId}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || 'Failed to fetch connected banks')
      }

      setConnectedBanks(data)
      return data
    } catch (error) {
      console.error('Error fetching connected banks:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch connected banks',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      return []
    }
  }, [customerId, authToken, toast])

  // Fetch accounts for each bank
  const fetchAccountsForBank = React.useCallback(async (entityId: string) => {
    try {
      const response = await fetch(`/api/bank-integration/fetch-accounts?entity_id=${entityId}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || 'Failed to fetch bank accounts')
      }

      return data
    } catch (error) {
      console.error('Error fetching bank accounts:', error)
      return []
    }
  }, [authToken])

  // Fetch transactions for an account
  const fetchTransactionsForAccount = React.useCallback(async (accountId: string, entityId: string) => {
    try {
      const response = await fetch(`/api/bank-integration/transactions?account_id=${accountId}&entity_id=${entityId}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || 'Failed to fetch transactions')
      }

      return data.transactions || []
    } catch (error) {
      console.error('Error fetching transactions:', error)
      return []
    }
  }, [authToken])

  // Fetch all transactions
  React.useEffect(() => {
    const fetchAllTransactions = async () => {
      if (!customerId || !authToken) return;

      setIsLoading(true);
      try {
        const banks = await fetchConnectedBanks();
        let allTransactions: BankTransaction[] = [];

        for (const bank of banks) {
          const accounts = await fetchAccountsForBank(bank.id);

          for (const account of accounts) {
            const accountTransactions = await fetchTransactionsForAccount(account.account_id, bank.id);
            const transactionsWithBank = accountTransactions.map((transaction: BankTransaction) => ({
              ...transaction,
              bank_name: bank.bank_identifier || bank.name,
              bank_id: bank.id
            }));

            allTransactions = [...allTransactions, ...transactionsWithBank];
          }
        }

        // Sort transactions by date (most recent first)
        allTransactions.sort((a, b) =>
          new Date(b.booking_date_time).getTime() - new Date(a.booking_date_time).getTime()
        );

        setTransactions(allTransactions);
      } catch (error) {
        console.error('Error fetching all transactions:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch transactions',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllTransactions();
  }, [customerId, authToken, fetchConnectedBanks, fetchAccountsForBank, fetchTransactionsForAccount, toast]);

  // Filter transactions based on selected bank and month
  const filteredTransactions = React.useMemo(() => {
    return transactions.filter((transaction: BankTransaction) => {
      // Filter by bank
      if (selectedBankId !== 'all' && transaction.bank_id !== selectedBankId) {
        return false;
      }

      // Filter by month
      if (selectedMonth !== 'all') {
        const transactionMonth = new Date(transaction.booking_date_time).toLocaleString('default', { month: 'long' });
        if (transactionMonth !== selectedMonth) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, selectedBankId, selectedMonth]);

  // Calculate daily cash flow data for the chart
  const chartData = React.useMemo(() => {
    const dailyData: { [key: string]: { income: number; spending: number } } = {}

    filteredTransactions.forEach(transaction => {
      const date = new Date(transaction.booking_date_time).toISOString().split('T')[0]
      const amount = transaction.amount.amount

      if (!dailyData[date]) {
        dailyData[date] = { income: 0, spending: 0 }
      }

      const isCredit = transaction.credit_debit_indicator === 'CREDIT' ||
        transaction.credit_debit_indicator === 'C' ||
        transaction.transaction_information?.includes('SALARY') ||
        transaction.transaction_information?.includes('CREDIT') ||
        transaction.transaction_information?.includes('DEPOSIT');

      if (isCredit) {
        dailyData[date].income += amount
      } else {
        dailyData[date].spending += amount
      }
    })

    // Convert to array and sort by date
    return Object.entries(dailyData)
      .map(([day, values]) => ({
        day,
        value: values.income - values.spending // Net value for the day
      }))
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-30) // Show last 30 days
  }, [filteredTransactions])

  // Get available months from transactions
  const availableMonths = React.useMemo(() => {
    const months = new Set<string>()
    transactions.forEach(transaction => {
      const month = new Date(transaction.booking_date_time).toLocaleString('default', { month: 'long' })
      months.add(month)
    })
    return Array.from(months).sort()
  }, [transactions])

  // Format currency for display
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return `$${value.toFixed(0)}`
  }

  const handleExportPDF = async () => {
    setIsPdfPreviewOpen(true);
  };

  const handleExportPdfData = async (filteredData: FilteredCashFlowData) => {
    if (!contentRef.current || !logoRef.current) return;

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      const indentSize = 10;
      let yPos = margin;

      // Helper function to format amounts consistently
      const formatAmount = (amount: number) => {
        const absAmount = Math.abs(amount);
        const formatted = absAmount.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        return amount < 0 ? `(${formatted})` : formatted;
      };

      // Add logo using canvas
      try {
        const logoCanvas = document.createElement('canvas');
        const logoCtx = logoCanvas.getContext('2d');
        if (logoCtx && logoRef.current) {
          logoCanvas.width = logoRef.current.naturalWidth;
          logoCanvas.height = logoRef.current.naturalHeight;
          logoCtx.drawImage(logoRef.current, 0, 0);
          const logoData = logoCanvas.toDataURL('image/png');
          const logoWidth = 40;
          const aspectRatio = logoRef.current.naturalWidth / logoRef.current.naturalHeight;
          const logoHeight = logoWidth / aspectRatio;
          const logoX = pageWidth - margin - logoWidth;
          doc.addImage(logoData, 'PNG', logoX, margin - 5, logoWidth, logoHeight);
        }
      } catch (logoError) {
        console.error('Error adding logo to PDF:', logoError);
        toast({
          title: "Warning",
          description: "Could not add logo to PDF",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
      }

      // Add title and date with consistent styling
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Muhasaba', margin, margin + 5);
      
      doc.setFontSize(14);
      doc.text('STATEMENT OF CASH FLOWS', margin, margin + 12);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const startDate = new Date(filteredData.period.startDate);
      const endDate = new Date(filteredData.period.endDate);
      const formattedStartDate = startDate.toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
      const formattedEndDate = endDate.toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
      doc.text(
        `For the Period ${formattedStartDate} to ${formattedEndDate}`,
        margin,
        margin + 18
      );

      // Add column headers
      const startY = margin + 30;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      
      doc.text('Description', margin, startY);
      const currentYear = endDate.getFullYear();
      doc.text(currentYear.toString(), pageWidth - margin - 40, startY, { align: 'right' });
      doc.text((currentYear - 1).toString(), pageWidth - margin, startY, { align: 'right' });

      // Add line under headers
      doc.setLineWidth(0.2);
      doc.line(margin, startY + 1, pageWidth - margin, startY + 1);
      yPos = startY + 8;

      // OPERATING ACTIVITIES SECTION
      doc.setFont('helvetica', 'bold');
      doc.text('CASH FLOWS FROM OPERATING ACTIVITIES', margin, yPos);
      yPos += 8;

      // Add operating activities
      filteredData.operatingActivities.forEach(item => {
        if (!item.isSubTotal) {
          doc.setFont('helvetica', 'normal');
          doc.text(item.description, margin + (item.indent ? indentSize : 0), yPos);
          doc.text(formatAmount(item.amount2024), pageWidth - margin - 40, yPos, { align: 'right' });
          yPos += 6;
        }
      });

      // Operating Cash Flow Total
      const operatingCashFlow = filteredData.operatingActivities.find(x => x.isSubTotal)?.amount2024 || 0;
      doc.line(pageWidth - margin - 70, yPos, pageWidth - margin, yPos);
      yPos += 4;
      doc.setFont('helvetica', 'bold');
      doc.text('Operating Cash Flow', margin, yPos);
      doc.text(formatAmount(operatingCashFlow), pageWidth - margin - 40, yPos, { align: 'right' });
      yPos += 12;

      // INVESTING ACTIVITIES SECTION
      doc.setFont('helvetica', 'bold');
      doc.text('CASH FLOWS FROM INVESTING ACTIVITIES', margin, yPos);
      yPos += 8;

      // Add investing activities
      filteredData.investingActivities.forEach(item => {
        if (!item.isSubTotal) {
          doc.setFont('helvetica', 'normal');
          doc.text(item.description, margin + (item.indent ? indentSize : 0), yPos);
          doc.text(formatAmount(item.amount2024), pageWidth - margin - 40, yPos, { align: 'right' });
          yPos += 6;
        }
      });

      // Investing Cash Flow Total
      const investingCashFlow = filteredData.investingActivities.find(x => x.isSubTotal)?.amount2024 || 0;
      doc.line(pageWidth - margin - 70, yPos, pageWidth - margin, yPos);
      yPos += 4;
      doc.setFont('helvetica', 'bold');
      doc.text('Investing Cash Flow', margin, yPos);
      doc.text(formatAmount(investingCashFlow), pageWidth - margin - 40, yPos, { align: 'right' });
      yPos += 12;

      // FINANCING ACTIVITIES SECTION
      doc.setFont('helvetica', 'bold');
      doc.text('CASH FLOWS FROM FINANCING ACTIVITIES', margin, yPos);
      yPos += 8;

      // Add financing activities
      filteredData.financingActivities.forEach(item => {
        if (!item.isSubTotal) {
          doc.setFont('helvetica', 'normal');
          doc.text(item.description, margin + (item.indent ? indentSize : 0), yPos);
          doc.text(formatAmount(item.amount2024), pageWidth - margin - 40, yPos, { align: 'right' });
          yPos += 6;
        }
      });

      // Financing Cash Flow Total
      const financingCashFlow = filteredData.financingActivities.find(x => x.isSubTotal)?.amount2024 || 0;
      doc.line(pageWidth - margin - 70, yPos, pageWidth - margin, yPos);
      yPos += 4;
      doc.setFont('helvetica', 'bold');
      doc.text('Financing Cash Flow', margin, yPos);
      doc.text(formatAmount(financingCashFlow), pageWidth - margin - 40, yPos, { align: 'right' });
      yPos += 12;

      // Final Cash Summary
      yPos += 6;

      // Opening Cash Balance
      doc.text('Opening Cash Balance', margin, yPos);
      doc.text(formatAmount(filteredData.openingCashBalance), pageWidth - margin - 40, yPos, { align: 'right' });
      yPos += 6;

      // Net Cash Change
      const netCashChange = operatingCashFlow + investingCashFlow + financingCashFlow;
      doc.text('Net Cash Change', margin, yPos);
      doc.text(formatAmount(netCashChange), pageWidth - margin - 40, yPos, { align: 'right' });
      yPos += 6;

      // Closing Cash Balance
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 4;
      doc.setFont('helvetica', 'bold');
      doc.text('Closing Cash Balance', margin, yPos);
      doc.text(formatAmount(filteredData.openingCashBalance + netCashChange), pageWidth - margin - 40, yPos, { align: 'right' });

      // Footer
      const footerText = 'The accompanying notes are an integral part of these financial statements.';
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Save the PDF
      doc.save('cash-flow-statement.pdf');

      setIsPdfPreviewOpen(false);
      toast({
        title: 'PDF exported successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Failed to export PDF',
        description: error instanceof Error ? error.message : 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Process transactions for the selected bank and month
  const processedData = React.useMemo(() => {
    const filteredTransactions = transactions.filter(t => {
      if (selectedBankId !== 'all' && t.bank_id !== selectedBankId) {
        return false;
      }

      if (selectedMonth !== 'all') {
        const transactionMonth = new Date(t.booking_date_time).getMonth().toString();
        if (transactionMonth !== selectedMonth) {
          return false;
        }
      }

      return true;
    });

    // Get base data from transactions
    const data = processTransactions(filteredTransactions);

    // Create a new copy of the data to avoid mutating the original
    const processedData = {
      ...data,
      investingActivities: data.investingActivities.filter(item => !item.isSubTotal),
      financingActivities: data.financingActivities.filter(item => !item.isSubTotal)
    };

    return processedData;
  }, [transactions, selectedBankId, selectedMonth]);

  // Calculate section totals including custom statements
  const sectionTotals = React.useMemo(() => {
    const investingTotal = 
      processedData.investingActivities.reduce((sum, item) => sum + (item.amount2024 ?? 0), 0) +
      customStatements
        .filter(stmt => stmt.type === 'investing')
        .reduce((sum, stmt) => sum + stmt.amount, 0);

    const financingTotal = 
      processedData.financingActivities.reduce((sum, item) => sum + (item.amount2024 ?? 0), 0) +
      customStatements
        .filter(stmt => stmt.type === 'financing')
        .reduce((sum, stmt) => sum + stmt.amount, 0);

    return {
      investing: investingTotal,
      financing: financingTotal
    };
  }, [processedData, customStatements]);

  // Load custom statements from local storage on mount
  React.useEffect(() => {
    if (workspace?.id) {
      const storageKey = `cashflowStatements_${workspace.id}`;
      const savedStatements = localStorage.getItem(storageKey);
      if (savedStatements) {
        try {
          const parsedStatements = JSON.parse(savedStatements);
          setCustomStatements(parsedStatements);
        } catch (error) {
          console.error('Error parsing saved statements:', error);
          localStorage.removeItem(storageKey);
        }
      }
    }
  }, [workspace?.id]);

  // Save custom statements to local storage whenever they change
  React.useEffect(() => {
    if (workspace?.id) {
      const storageKey = `cashflowStatements_${workspace.id}`;
      localStorage.setItem(storageKey, JSON.stringify(customStatements));
    }
  }, [customStatements, workspace?.id]);

  // Clear storage on auth token change (indicates login/logout)
  React.useEffect(() => {
    if (!authToken && workspace?.id) {
      const storageKey = `cashflowStatements_${workspace.id}`;
      localStorage.removeItem(storageKey);
    }
  }, [authToken, workspace?.id]);

  const handleAddStatement = async (type: 'operating' | 'investing' | 'financing') => {
    interface BaseFormData {
      name: string;
      amount: number;
      date?: string;
    }

    interface OperatingFormData extends BaseFormData {
      category: 'adjustment' | 'working_capital';
    }

    // Define schema based on activity type
    const baseSchema = {
      name: z.string().min(1, 'Name is required'),
      amount: z.string().min(1, 'Amount is required').transform(val => Number(val)),
      date: z.string().optional(),
      amountType: z.enum(['deposit', 'expense']).default('deposit')
    };

    const formSchema = type === 'operating' 
      ? z.object({
          ...baseSchema,
          category: z.enum(['adjustment', 'working_capital']).default('adjustment')
        })
      : z.object(baseSchema);

    const onSubmit = (formData: any) => {
      const newStatement: CustomStatement = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name,
        amount: formData.amountType === 'expense' ? -Math.abs(formData.amount) : Math.abs(formData.amount),
        date: formData.date || new Date().toISOString().split('T')[0],
        type,
        category: type === 'operating' ? formData.category : 'inflow',
        amountType: formData.amountType
      };

      setCustomStatements(prev => [...prev, newStatement]);

      toast({
        title: "Statement added",
        description: `New ${type} activity statement has been added successfully`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      modals.closeAll();
      return true;
    };

    // Define form fields based on activity type
    const baseFields = {
      name: {
        label: 'Statement Name',
        placeholder: 'Enter statement name'
      },
      amount: {
        label: 'Amount (AED)',
        type: 'number',
        placeholder: '0.00'
      },
      amountType: {
        label: 'Amount Type',
        type: 'select',
        options: [
          { label: 'Deposit', value: 'deposit' },
          { label: 'Expense', value: 'expense' }
        ]
      },
      date: {
        label: 'Date',
        type: 'date'
      }
    };

    const fields = type === 'operating' 
      ? {
          ...baseFields,
          category: {
            label: 'Category',
            type: 'select',
            options: [
              { label: 'Adjustment', value: 'adjustment' },
              { label: 'Working Capital', value: 'working_capital' }
            ]
          }
        }
      : baseFields;

    modals.form({
      title: `Add New ${type.charAt(0).toUpperCase() + type.slice(1)} Activity`,
      schema: formSchema,
      defaultValues: {
        date: new Date().toISOString().split('T')[0],
        ...(type === 'operating' ? { category: 'adjustment' as const } : {})
      },
      onSubmit,
      fields
    });
  };

  return (
    <Box>
      <PageHeader />
      <Box p={4}>
        {/* Hidden logo for PDF generation */}
        <Image
          ref={logoRef}
          src="/img/onboarding/muhasaba-logo.png"
          alt="Muhasaba Logo"
          style={{ display: 'none' }}
          crossOrigin="anonymous"
          width="30px"
          height="15px"
        />

        <Box
          height="calc(100vh - 65px)"
          position="relative"
          display="flex"
          flexDirection="column"
          overflowY="auto"
          sx={{
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none'
          }}
        >
          {/* Header Section */}
          <Box mb={6}>
            <Box mb={4}>
              <HStack 
                justify="space-between" 
                align="center"
                sx={{
                  '@media screen and (min-width: 321px) and (max-width: 740px)': {
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '1rem'
                  }
                }}
              >
                <Box>
                  <Heading size="lg" mb={2}>Cash Flow Statement</Heading>
                  <Text color="gray.600" mb={4} fontSize="md">
                    Track your cash inflows and outflows with detailed transaction history and analysis.
                  </Text>
                </Box>
                <Button
                  leftIcon={<LuDownload />}
                  colorScheme="green"
                  onClick={handleExportPDF}
                  isLoading={isLoading}
                >
                  Export as PDF
                </Button>
              </HStack>
            </Box>

            <Box display="flex" justifyContent="flex-end" mb={4}>
              <Select
                maxW="200px"
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                bg="green.50"
                color="green.500"
                borderColor="green.200"
                _hover={{ borderColor: "green.300" }}
              >
                <option value="all">All Banks</option>
                {connectedBanks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.bank_identifier || bank.name}
                  </option>
                ))}
              </Select>
            </Box>
          </Box>

          {/* Main Content */}
          <Box ref={contentRef}>
            {isLoading ? (
              <Box display="flex" justifyContent="center" p={8}>
                <Spinner size="xl" />
              </Box>
            ) : (
              <>
                {/* Cashflow Chart */}
                <Card mb={8}>
                  <CardBody>
                    <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Heading size="md">Cash Flow Summary</Heading>
                        <Text color="gray.600">{filteredTransactions.length} Transactions</Text>
                      </Box>

                      <Select
                        size="sm"
                        maxW="120px"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        borderColor="gray.200"
                      >
                        <option value="all">All Months</option>
                        {availableMonths.map((month) => (
                          <option key={month} value={month}>{month}</option>
                        ))}
                      </Select>
                    </Box>

                    <Box position="relative" height="300px">
                      <AreaChart
                        data={chartData}
                        categories={['value']}
                        index="day"
                        colors={['#38B2AC']}
                        yAxisWidth={65}
                        valueFormatter={formatCurrency}
                        height="300px"
                        showLegend={false}
                        showGrid={true}
                        showYAxis={true}
                        variant="gradient"
                        strokeWidth="2"
                        minValue={Math.min(...chartData.map(d => d.value)) * 1.1}
                        maxValue={Math.max(...chartData.map(d => d.value)) * 1.1}
                      />

                      {chartData.length > 0 && (
                        <Box
                          position="absolute"
                          top="20%"
                          left="30%"
                          bg="green.500"
                          color="white"
                          px={3}
                          py={1}
                          borderRadius="md"
                          boxShadow="md"
                        >
                          Peak: {formatCurrency(Math.max(...chartData.map(d => d.value)))}
                        </Box>
                      )}
                    </Box>
                  </CardBody>
                </Card>

                {/* Cashflow Statement */}
                <Card>
                  <CardBody>
                    <Box textAlign="center" mb={6}>
                      <Heading size="md" mb={2}>Muhasaba</Heading>
                      <Text fontSize="lg" fontWeight="medium">Statement of Cash Flows (Indirect Method)</Text>
                      <Text color="gray.600">For the period ended {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                    </Box>

                    {/* Operating Activities Section */}
                    <Box mb={8} borderRadius="lg" overflow="hidden">
                      <Box bg="blue.50" p={4} display="flex" alignItems="center" justifyContent="space-between">
                        <Heading size="md" color="blue.700">Operating Activities</Heading>
                        <IconButton
                          aria-label="Add operating activity"
                          icon={<LuPlus />}
                          size="sm"
                          colorScheme="blue"
                          variant="ghost"
                          onClick={() => handleAddStatement('operating')}
                        />
                      </Box>
                      <Box p={4} bg="white">
                        <VStack spacing={3} align="stretch">
                          {/* Net Profit */}
                          <HStack justify="space-between">
                            <Text color="gray.700">Net Profit</Text>
                            <Text fontWeight="medium">{(processedData.indirectMethod?.netProfit ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'AED' })}</Text>
                          </HStack>

                          {/* Adjustments */}
                          <Text fontWeight="bold" color="gray.700" mt={4}>Adjustments:</Text>
                          <Box pl={4}>
                            <VStack spacing={3} align="stretch">
                              <HStack justify="space-between">
                                <Text color="gray.600">Depreciation</Text>
                                <Text fontWeight="medium">{(processedData.indirectMethod?.adjustments?.depreciation ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'AED' })}</Text>
                              </HStack>
                              <HStack justify="space-between">
                                <Text color="gray.600">Amortization</Text>
                                <Text fontWeight="medium">{(processedData.indirectMethod?.adjustments?.amortization ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'AED' })}</Text>
                              </HStack>
                              <HStack justify="space-between">
                                <Text color="gray.600">Interest Expense</Text>
                                <Text fontWeight="medium">{(processedData.indirectMethod?.adjustments?.interestExpense ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'AED' })}</Text>
                              </HStack>
                              {/* Custom Operating Adjustments */}
                              {customStatements
                                .filter(stmt => stmt.type === 'operating' && stmt.category === 'adjustment')
                                .map(stmt => (
                                  <HStack key={stmt.id} justify="space-between">
                                    <Text color="gray.600">{stmt.name}</Text>
                                    <Text fontWeight="medium">{stmt.amount.toLocaleString('en-US', { style: 'currency', currency: 'AED' })}</Text>
                                  </HStack>
                                ))}
                            </VStack>
                          </Box>

                          {/* Working Capital Adjustments */}
                          <Text fontWeight="bold" color="gray.700" mt={4}>Working Capital Adjustments:</Text>
                          <Box pl={4}>
                            <VStack spacing={3} align="stretch">
                              <HStack justify="space-between">
                                <HStack>
                                  <Text color="gray.600">Accounts Receivable</Text>
                                  <Text fontSize="xs" color="gray.500">(Increase = Outflow, Decrease = Inflow)</Text>
                                </HStack>
                                <Text fontWeight="medium">{(processedData.indirectMethod?.workingCapital?.accountsReceivable ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'AED' })}</Text>
                              </HStack>
                              {/* Custom Working Capital Adjustments */}
                              {customStatements
                                .filter(stmt => stmt.type === 'operating' && stmt.category === 'working_capital')
                                .map(stmt => (
                                  <HStack key={stmt.id} justify="space-between">
                                    <Text color="gray.600">{stmt.name}</Text>
                                    <Text fontWeight="medium">{stmt.amount.toLocaleString('en-US', { style: 'currency', currency: 'AED' })}</Text>
                                  </HStack>
                                ))}
                              <HStack justify="space-between">
                                <HStack>
                                  <Text color="gray.600">Inventory</Text>
                                  <Text fontSize="xs" color="gray.500">(Increase = Outflow, Decrease = Inflow)</Text>
                                </HStack>
                                <Text fontWeight="medium">{(processedData.indirectMethod?.workingCapital?.inventory ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'AED' })}</Text>
                              </HStack>
                              <HStack justify="space-between">
                                <HStack>
                                  <Text color="gray.600">Accounts Payable</Text>
                                  <Text fontSize="xs" color="gray.500">(Increase = Inflow, Decrease = Outflow)</Text>
                                </HStack>
                                <Text fontWeight="medium">{(processedData.indirectMethod?.workingCapital?.accountsPayable ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'AED' })}</Text>
                              </HStack>
                              <HStack justify="space-between">
                                <HStack>
                                  <Text color="gray.600">VAT Payable/Receivable</Text>
                                  <Text fontSize="xs" color="gray.500">(Difference in net VAT balances)</Text>
                                </HStack>
                                <Text fontWeight="medium">{(processedData.indirectMethod?.workingCapital?.vatPayable ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'AED' })}</Text>
                              </HStack>
                            </VStack>
                          </Box>

                          {/* Operating Cash Flow Total */}
                          <HStack justify="space-between" mt={4} pt={4} borderTop="1px" borderColor="gray.200">
                            <Text fontWeight="bold" color="blue.700">Operating Cash Flow</Text>
                            <Text fontWeight="bold" color="blue.700">
                              {(
                                (processedData.indirectMethod?.netProfit ?? 0) +
                                (processedData.indirectMethod?.adjustments?.depreciation ?? 0) +
                                (processedData.indirectMethod?.adjustments?.amortization ?? 0) +
                                (processedData.indirectMethod?.adjustments?.interestExpense ?? 0) +
                                (processedData.indirectMethod?.workingCapital?.accountsReceivable ?? 0) +
                                (processedData.indirectMethod?.workingCapital?.inventory ?? 0) +
                                (processedData.indirectMethod?.workingCapital?.accountsPayable ?? 0) +
                                (processedData.indirectMethod?.workingCapital?.vatPayable ?? 0) +
                                // Add custom operating statements separately
                                customStatements
                                  .filter(stmt => stmt.type === 'operating' && stmt.category === 'adjustment')
                                  .reduce((sum, stmt) => sum + stmt.amount, 0) +
                                customStatements
                                  .filter(stmt => stmt.type === 'operating' && stmt.category === 'working_capital')
                                  .reduce((sum, stmt) => sum + stmt.amount, 0)
                              ).toLocaleString('en-US', { style: 'currency', currency: 'AED' })}
                            </Text>
                          </HStack>
                        </VStack>
                      </Box>
                    </Box>

                    {/* Investing Activities Section */}
                    <Box mb={8} borderRadius="lg" overflow="hidden">
                      <Box bg="purple.50" p={4} display="flex" alignItems="center" justifyContent="space-between">
                        <Heading size="md" color="purple.700">Investing Activities</Heading>
                        <IconButton
                          aria-label="Add investing activity"
                          icon={<LuPlus />}
                          size="sm"
                          colorScheme="purple"
                          variant="ghost"
                          onClick={() => handleAddStatement('investing')}
                        />
                      </Box>
                      <Box p={4} bg="white">
                        <VStack spacing={3} align="stretch">
                          {/* Regular Investing Activities */}
                          {processedData.investingActivities.map((item, index) => (
                            <HStack key={index} justify="space-between">
                              <Text color="gray.600">{item.description}</Text>
                              <Text fontWeight="medium" color={item.amount2024 >= 0 ? "green.600" : "red.600"}>
                                {Math.abs(item.amount2024 ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'AED' })}
                              </Text>
                            </HStack>
                          ))}

                          {/* Custom Investing Activities */}
                          {customStatements
                            .filter(stmt => stmt.type === 'investing')
                            .map(stmt => (
                              <HStack key={stmt.id} justify="space-between">
                                <Text color="gray.600">{stmt.name}</Text>
                                <Text fontWeight="medium">{stmt.amount.toLocaleString('en-US', { style: 'currency', currency: 'AED' })}</Text>
                              </HStack>
                            ))}
                          
                          {/* Investing Cash Flow Total */}
                          <HStack justify="space-between" pt={4} borderTop="1px" borderColor="gray.200">
                            <Text fontWeight="bold" color="purple.700">Investing Cash Flow</Text>
                            <Text fontWeight="bold" color="purple.700">
                              {sectionTotals.investing.toLocaleString('en-US', { style: 'currency', currency: 'AED' })}
                            </Text>
                          </HStack>
                        </VStack>
                      </Box>
                    </Box>

                    {/* Financing Activities Section */}
                    <Box mb={8} borderRadius="lg" overflow="hidden">
                      <Box bg="orange.50" p={4} display="flex" alignItems="center" justifyContent="space-between">
                        <Heading size="md" color="orange.700">Financing Activities</Heading>
                        <IconButton
                          aria-label="Add financing activity"
                          icon={<LuPlus />}
                          size="sm"
                          colorScheme="orange"
                          variant="ghost"
                          onClick={() => handleAddStatement('financing')}
                        />
                      </Box>
                      <Box p={4} bg="white">
                        <VStack spacing={3} align="stretch">
                          {/* Regular Financing Activities */}
                          {processedData.financingActivities.map((item, index) => (
                            <HStack key={index} justify="space-between">
                              <Text color="gray.600">{item.description}</Text>
                              <Text fontWeight="medium" color={item.amount2024 >= 0 ? "green.600" : "red.600"}>
                                {Math.abs(item.amount2024 ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'AED' })}
                              </Text>
                            </HStack>
                          ))}

                          {/* Custom Financing Activities */}
                          {customStatements
                            .filter(stmt => stmt.type === 'financing')
                            .map(stmt => (
                              <HStack key={stmt.id} justify="space-between">
                                <Text color="gray.600">{stmt.name}</Text>
                                <Text fontWeight="medium">{stmt.amount.toLocaleString('en-US', { style: 'currency', currency: 'AED' })}</Text>
                              </HStack>
                            ))}
                          
                          {/* Financing Cash Flow Total */}
                          <HStack justify="space-between" pt={4} borderTop="1px" borderColor="gray.200">
                            <Text fontWeight="bold" color="orange.700">Financing Cash Flow</Text>
                            <Text fontWeight="bold" color="orange.700">
                              {sectionTotals.financing.toLocaleString('en-US', { style: 'currency', currency: 'AED' })}
                            </Text>
                          </HStack>
                        </VStack>
                      </Box>
                    </Box>

                    {/* Final Cash Summary */}
                    <Box p={4} bg="gray.50" borderRadius="lg">
                      <VStack spacing={3} align="stretch">
                        <HStack justify="space-between">
                          <Text fontWeight="bold" color="gray.700">Opening Cash Balance</Text>
                          <Text fontWeight="bold" color="gray.700">
                            {(processedData.openingCashBalance ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'AED' })}
                          </Text>
                        </HStack>
                                                <HStack justify="space-between">
                          <Text fontWeight="bold" color="gray.700">Net Cash Change</Text>
                          {(() => {
                            // Calculate operating activities total
                            const operatingTotal = processedData.operatingActivities.reduce((sum, item) => {
                              if (!item.isSubTotal) {
                                return sum + (item.amount2024 ?? 0);
                              }
                              return sum;
                            }, 0);
                            
                            // Calculate operating custom statements
                            const operatingCustom = customStatements
                              .filter(stmt => stmt.type === 'operating')
                              .reduce((total, stmt) => total + stmt.amount, 0);

                            // Calculate investing activities total
                            const investingTotal = processedData.investingActivities.reduce((sum, item) => {
                              if (!item.isSubTotal) {
                                return sum + (item.amount2024 ?? 0);
                              }
                              return sum;
                            }, 0);
                            
                            // Calculate investing custom statements
                            const investingCustom = customStatements
                              .filter(stmt => stmt.type === 'investing')
                              .reduce((total, stmt) => total + stmt.amount, 0);

                            // Calculate financing activities total
                            const financingTotal = processedData.financingActivities.reduce((sum, item) => {
                              if (!item.isSubTotal) {
                                return sum + (item.amount2024 ?? 0);
                              }
                              return sum;
                            }, 0);
                            
                            // Calculate financing custom statements
                            const financingCustom = customStatements
                              .filter(stmt => stmt.type === 'financing')
                              .reduce((total, stmt) => total + stmt.amount, 0);
                            
                            console.log('Detailed Net Cash Change Calculation:', {
                              operatingTotal,
                              operatingCustom,
                              investingTotal,
                              investingCustom,
                              financingTotal,
                              financingCustom,
                              customStatements,
                              total: operatingTotal + operatingCustom + investingTotal + investingCustom + financingTotal + financingCustom
                            });
                            
                            const total = operatingTotal + operatingCustom + investingTotal + investingCustom + financingTotal + financingCustom;
                            return (
                              <Text fontWeight="bold" color="gray.700">
                                {total.toLocaleString('en-US', { style: 'currency', currency: 'AED' })}
                              </Text>
                            );
                          })()}
                        </HStack>
                        <HStack justify="space-between" pt={4} borderTop="2px" borderColor="gray.300">
                          <Text fontWeight="bold" fontSize="lg" color="gray.700">Closing Cash Balance</Text>
                          {(() => {
                            // Calculate operating activities total
                            const operatingTotal = processedData.operatingActivities.reduce((sum, item) => {
                              if (!item.isSubTotal) {
                                return sum + (item.amount2024 ?? 0);
                              }
                              return sum;
                            }, 0);
                            
                            // Calculate operating custom statements
                            const operatingCustom = customStatements
                              .filter(stmt => stmt.type === 'operating')
                              .reduce((total, stmt) => total + stmt.amount, 0);

                            // Calculate investing activities total
                            const investingTotal = processedData.investingActivities.reduce((sum, item) => {
                              if (!item.isSubTotal) {
                                return sum + (item.amount2024 ?? 0);
                              }
                              return sum;
                            }, 0);
                            
                            // Calculate investing custom statements
                            const investingCustom = customStatements
                              .filter(stmt => stmt.type === 'investing')
                              .reduce((total, stmt) => total + stmt.amount, 0);

                            // Calculate financing activities total
                            const financingTotal = processedData.financingActivities.reduce((sum, item) => {
                              if (!item.isSubTotal) {
                                return sum + (item.amount2024 ?? 0);
                              }
                              return sum;
                            }, 0);
                            
                            // Calculate financing custom statements
                            const financingCustom = customStatements
                              .filter(stmt => stmt.type === 'financing')
                              .reduce((total, stmt) => total + stmt.amount, 0);

                            // Get opening balance
                            const openingBalance = processedData.openingCashBalance ?? 0;
                            
                            console.log('Detailed Closing Balance Calculation:', {
                              openingBalance,
                              operatingTotal,
                              operatingCustom,
                              investingTotal,
                              investingCustom,
                              financingTotal,
                              financingCustom,
                              customStatements,
                              total: openingBalance + operatingTotal + operatingCustom + investingTotal + investingCustom + financingTotal + financingCustom
                            });
                            
                            const total = openingBalance + operatingTotal + operatingCustom + investingTotal + investingCustom + financingTotal + financingCustom;
                            return (
                              <Text fontWeight="bold" fontSize="lg" color="gray.700">
                                {total.toLocaleString('en-US', { style: 'currency', currency: 'AED' })}
                              </Text>
                            );
                          })()}
                        </HStack>
                      </VStack>
                    </Box>
                  </CardBody>
                </Card>
              </>
            )}
          </Box>

          {/* Add EditablePdfPreview component */}
          <EditablePdfPreview
            isOpen={isPdfPreviewOpen}
            onClose={() => setIsPdfPreviewOpen(false)}
            onExport={handleExportPdfData}
            data={processedData}
            logoRef={logoRef}
          />

          {/* Summary Footer */}
          <Box
            bg="teal.700"
            color="white"
            p={4}
            data-summary-footer
            position="sticky"
            bottom={0}
            zIndex={1}
          >
            <HStack justify="space-between">
              <Text>Summary: Cash Flow</Text>
              <Text>Net Cash Flow: {filteredTransactions.reduce((total, transaction) => {
                const amount = transaction.amount.amount;
                return total + (transaction.credit_debit_indicator === 'CREDIT' ? amount : -amount);
              }, 0).toLocaleString('en-US', { style: 'currency', currency: 'AED' })}</Text>
            </HStack>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
