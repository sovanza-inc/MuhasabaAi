interface BankTransaction {
  transaction_id: string;
  account_id: string;
  transaction_information: string;
  amount: {
    amount: number;
    currency: string;
  };
  credit_debit_indicator: string;
  status: string;
  booking_date_time: string;
}

interface CashFlowData {
  operatingActivities: any[];
  investingActivities: any[];
  financingActivities: any[];
  indirectMethod?: {
    netProfit: number;
    adjustments: {
      depreciation: number;
      amortization: number;
      interestExpense: number;
    };
    workingCapital: {
      accountsReceivable: number;
      inventory: number;
      accountsPayable: number;
      vatPayable: number;
    };
  };
}

export const processTransactions = (transactions: BankTransaction[]): CashFlowData => {
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;
  
  // Debug logging
  console.log('Processing transactions:', {
    total: transactions.length,
    currentYear,
    lastYear
  });
  
  // Filter transactions by year
  const currentYearTransactions = transactions.filter(t => 
    new Date(t.booking_date_time).getFullYear() === currentYear
  );
  const lastYearTransactions = transactions.filter(t => 
    new Date(t.booking_date_time).getFullYear() === lastYear
  );

  // Debug logging
  console.log('Filtered transactions:', {
    currentYear: currentYearTransactions.length,
    lastYear: lastYearTransactions.length
  });

  // Calculate totals for each category
  const calculateYearlyTotals = (transactions: BankTransaction[]) => {
    const totals = {
      operatingIncome: 0,
      operatingExpenses: 0,
      investingIncome: 0,
      investingExpenses: 0,
      financingIncome: 0,
      financingExpenses: 0,
      depreciation: 0,
      amortization: 0,
      interestExpense: 0,
      accountsReceivable: 0,
      inventory: 0,
      accountsPayable: 0,
      vatPayable: 0
    };

    transactions.forEach(transaction => {
      const amount = transaction.amount.amount;
      const isCredit = transaction.credit_debit_indicator === 'CREDIT' || 
                      transaction.credit_debit_indicator === 'C' ||
                      transaction.transaction_information?.toLowerCase().includes('credit');
      const info = transaction.transaction_information?.toLowerCase() || '';

      // Debug logging for each transaction
      console.log('Processing transaction:', {
        info,
        amount,
        isCredit,
        date: transaction.booking_date_time
      });

      // Categorize based on transaction information with more inclusive keywords
      if (info.includes('depreciat') || info.includes('depr.')) {
        totals.depreciation += amount;
      }
      else if (info.includes('amort') || info.includes('intangible')) {
        totals.amortization += amount;
      }
      else if (info.includes('interest') || info.includes('int.') || info.includes('loan payment')) {
        totals.interestExpense += amount;
      }
      else if (info.includes('receivable') || info.includes('ar') || info.includes('account rec')) {
        totals.accountsReceivable += (isCredit ? -amount : amount);
      }
      else if (info.includes('inventory') || info.includes('stock') || info.includes('goods')) {
        totals.inventory += (isCredit ? -amount : amount);
      }
      else if (info.includes('payable') || info.includes('ap') || info.includes('account pay')) {
        totals.accountsPayable += (isCredit ? amount : -amount);
      }
      else if (info.includes('vat') || info.includes('tax') || info.includes('duty')) {
        totals.vatPayable += (isCredit ? amount : -amount);
      }
      else if (info.includes('salary') || info.includes('revenue') || info.includes('sales') || 
               info.includes('income') || info.includes('service') || isCredit) {
        if (isCredit) totals.operatingIncome += amount;
        else totals.operatingExpenses += amount;
      }
      else if (info.includes('equipment') || info.includes('investment') || info.includes('asset') || 
               info.includes('property') || info.includes('machine')) {
        if (isCredit) totals.investingIncome += amount;
        else totals.investingExpenses += amount;
      }
      else if (info.includes('loan') || info.includes('dividend') || info.includes('capital') || 
               info.includes('share') || info.includes('equity')) {
        if (isCredit) totals.financingIncome += amount;
        else totals.financingExpenses += amount;
      }
      else {
        // Default to operating activities if no specific category matches
        if (isCredit) totals.operatingIncome += amount;
        else totals.operatingExpenses += amount;
      }
    });

    // Debug logging for totals
    console.log('Category totals:', totals);

    return totals;
  };

  const currentYearTotals = calculateYearlyTotals(currentYearTransactions);
  const lastYearTotals = calculateYearlyTotals(lastYearTransactions);

  // Debug logging for final totals
  console.log('Final totals:', {
    currentYear: currentYearTotals,
    lastYear: lastYearTotals
  });

  return {
    operatingActivities: [
      { description: 'Cash received from operations', amount2024: currentYearTotals.operatingIncome, amount2023: lastYearTotals.operatingIncome },
      { description: 'Cash paid for operations', amount2024: -currentYearTotals.operatingExpenses, amount2023: -lastYearTotals.operatingExpenses, indent: 1 },
      { description: 'Net cash from operating activities', 
        amount2024: currentYearTotals.operatingIncome - currentYearTotals.operatingExpenses,
        amount2023: lastYearTotals.operatingIncome - lastYearTotals.operatingExpenses,
        isSubTotal: true 
      }
    ],
    investingActivities: [
      { description: 'Proceeds from sale of investments', amount2024: currentYearTotals.investingIncome, amount2023: lastYearTotals.investingIncome },
      { description: 'Purchase of investments and equipment', amount2024: -currentYearTotals.investingExpenses, amount2023: -lastYearTotals.investingExpenses },
      { description: 'Net cash used in investing activities',
        amount2024: currentYearTotals.investingIncome - currentYearTotals.investingExpenses,
        amount2023: lastYearTotals.investingIncome - lastYearTotals.investingExpenses,
        isSubTotal: true
      }
    ],
    financingActivities: [
      { description: 'Proceeds from loans and capital', amount2024: currentYearTotals.financingIncome, amount2023: lastYearTotals.financingIncome },
      { description: 'Repayment of loans and dividends', amount2024: -currentYearTotals.financingExpenses, amount2023: -lastYearTotals.financingExpenses },
      { description: 'Net cash from financing activities',
        amount2024: currentYearTotals.financingIncome - currentYearTotals.financingExpenses,
        amount2023: lastYearTotals.financingIncome - lastYearTotals.financingExpenses,
        isSubTotal: true
      }
    ],
    indirectMethod: {
      netProfit: currentYearTotals.operatingIncome - currentYearTotals.operatingExpenses,
      adjustments: {
        depreciation: currentYearTotals.depreciation,
        amortization: currentYearTotals.amortization,
        interestExpense: currentYearTotals.interestExpense
      },
      workingCapital: {
        accountsReceivable: currentYearTotals.accountsReceivable,
        inventory: currentYearTotals.inventory,
        accountsPayable: currentYearTotals.accountsPayable,
        vatPayable: currentYearTotals.vatPayable
      }
    }
  };
}; 