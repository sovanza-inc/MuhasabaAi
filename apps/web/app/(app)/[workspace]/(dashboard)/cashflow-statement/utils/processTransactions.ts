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

export const processTransactions = (transactions: BankTransaction[]) => {
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;
  
  // Filter transactions by year
  const currentYearTransactions = transactions.filter(t => 
    new Date(t.booking_date_time).getFullYear() === currentYear
  );
  const lastYearTransactions = transactions.filter(t => 
    new Date(t.booking_date_time).getFullYear() === lastYear
  );

  // Calculate totals for each category
  const calculateYearlyTotals = (transactions: BankTransaction[]) => {
    const totals = {
      operatingIncome: 0,
      operatingExpenses: 0,
      investingIncome: 0,
      investingExpenses: 0,
      financingIncome: 0,
      financingExpenses: 0
    };

    transactions.forEach(transaction => {
      const amount = transaction.amount.amount;
      const isCredit = transaction.credit_debit_indicator === 'CREDIT';
      const info = transaction.transaction_information?.toLowerCase() || '';

      // Categorize based on transaction information
      if (info.includes('salary') || info.includes('revenue') || info.includes('sales')) {
        if (isCredit) totals.operatingIncome += amount;
        else totals.operatingExpenses += amount;
      }
      else if (info.includes('equipment') || info.includes('investment') || info.includes('asset')) {
        if (isCredit) totals.investingIncome += amount;
        else totals.investingExpenses += amount;
      }
      else if (info.includes('loan') || info.includes('dividend') || info.includes('capital')) {
        if (isCredit) totals.financingIncome += amount;
        else totals.financingExpenses += amount;
      }
      else {
        // Default to operating activities
        if (isCredit) totals.operatingIncome += amount;
        else totals.operatingExpenses += amount;
      }
    });

    return totals;
  };

  const currentYearTotals = calculateYearlyTotals(currentYearTransactions);
  const lastYearTotals = calculateYearlyTotals(lastYearTransactions);

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
    ]
  };
}; 