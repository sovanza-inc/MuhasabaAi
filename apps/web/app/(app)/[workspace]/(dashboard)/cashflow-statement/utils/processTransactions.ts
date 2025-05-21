interface BankTransaction {
  transaction_id: string;
  account_id: string;
  transaction_information: string | null;
  transaction_reference: string | null;
  amount: {
    amount: number;
    currency: string;
  };
  credit_debit_indicator: string;
  status: string;
  booking_date_time: string;
  value_date_time?: string;
  bank_name?: string;
  bank_id?: string;
  account_type?: string;
  account_name?: string;
}

interface CashFlowItem {
  description: string;
  amount2024: number;
  amount2023: number;
  indent?: number;
  isSubTotal?: boolean;
}

export const processTransactions = (transactions: BankTransaction[]) => {
  // Debug log incoming transactions
  console.log('Processing transactions:', {
    totalTransactions: transactions.length,
    sampleTransaction: transactions[0],
    transactionTypes: transactions.map(t => t.transaction_information).slice(0, 5)
  });

  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;
  
  // Calculate the period
  const dates = transactions.map(t => new Date(t.booking_date_time));
  const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const endDate = new Date(Math.max(...dates.map(d => d.getTime())));

  // Debug log transaction dates
  console.log('Transaction period:', { startDate, endDate });
  
  // Calculate opening cash balance from earliest transactions
  const openingBalance = transactions
    .filter(t => t.booking_date_time.startsWith(startDate.toISOString().split('T')[0]))
    .reduce((total, t) => {
      const amount = t.amount.amount;
      return total + (t.credit_debit_indicator === 'CREDIT' ? amount : -amount);
    }, 0);
  
  // Filter transactions by year
  const currentYearTransactions = transactions.filter(t => 
    new Date(t.booking_date_time).getFullYear() === currentYear
  );
  const lastYearTransactions = transactions.filter(t => 
    new Date(t.booking_date_time).getFullYear() === lastYear
  );

  // Debug log filtered transactions
  console.log('Filtered transactions:', {
    currentYear,
    lastYear,
    currentYearCount: currentYearTransactions.length,
    lastYearCount: lastYearTransactions.length
  });

  // Calculate totals for each category
  const calculateYearlyTotals = (yearTransactions: BankTransaction[]) => {
    const totals = {
      operatingIncome: 0,
      operatingExpenses: 0,
      investingIncome: 0,
      investingExpenses: 0,
      financingInflows: {
        loanProceeds: 0,
        ownerCapitalContributions: 0
      },
      financingOutflows: {
        loanRepayments: 0,
        leasePayments: 0
      },
      depreciation: 0,
      amortization: 0,
      interestExpense: 0,
      accountsReceivable: 0,
      inventory: 0,
      accountsPayable: 0,
      vatPayable: 0
    };

    // Debug array to track categorized transactions
    const categorizedTransactions: { type: string; info: string; amount: number }[] = [];

    yearTransactions.forEach(transaction => {
      const amount = transaction.amount.amount;
      const isCredit = transaction.credit_debit_indicator === 'CREDIT' || 
                      transaction.credit_debit_indicator === 'C';
      const info = (transaction.transaction_information || '').toLowerCase();
      const reference = (transaction.transaction_reference || '').toLowerCase();
      
      // Log each transaction being processed
      console.log('Processing transaction:', {
        info,
        reference,
        amount,
        isCredit
      });

      // Investing Activities - Enhanced categorization
      const isInvestingTransaction = 
        // Fixed Assets
        info.includes('fixed asset') || info.includes('equipment') || 
        info.includes('property') || info.includes('machine') || 
        info.includes('plant') || info.includes('capex') ||
        info.includes('capital expenditure') || info.includes('asset purchase') ||
        info.includes('furniture') || info.includes('vehicle') ||
        // Common asset purchase references
        reference.includes('fa-') || reference.includes('asset-') ||
        reference.includes('capex-') || reference.includes('equipment-') ||
        // Large transactions (potentially assets)
        (amount >= 10000 && (
          info.includes('purchase') || info.includes('acquisition') ||
          info.includes('investment') || info.includes('capital')
        ));

      const isIntangibleTransaction = 
        info.includes('intangible') || info.includes('software') || 
        info.includes('patent') || info.includes('trademark') || 
        info.includes('license') || info.includes('intellectual property') ||
        info.includes('goodwill') || info.includes('development cost') ||
        reference.includes('int-') || reference.includes('soft-') ||
        reference.includes('ip-');

      if (isInvestingTransaction) {
        console.log('Found investing transaction:', {
          type: 'fixed_asset',
          info,
          reference,
          amount,
          isCredit
        });
        
        if (isCredit) {
          // Sale of Assets
          totals.investingIncome += amount;
        } else {
          // Purchase of Fixed Assets
          totals.investingExpenses += amount;
        }
      }
      else if (isIntangibleTransaction) {
        console.log('Found intangible asset transaction:', {
          type: 'intangible_asset',
          info,
          reference,
          amount,
          isCredit
        });
        
        if (!isCredit) {
          totals.investingExpenses += amount;
        }
      }
      // Financing Activities
      else if (info.includes('loan') || info.includes('borrowing') || info.includes('debt') || 
               info.includes('credit facility') || info.includes('financing')) {
        if (isCredit || info.includes('proceed') || info.includes('disbursement') || 
            info.includes('drawdown')) {
          totals.financingInflows.loanProceeds += amount;
          categorizedTransactions.push({ type: 'loan_proceed', info, amount });
        } else if (info.includes('repayment') || info.includes('installment') || 
                   info.includes('settlement')) {
          totals.financingOutflows.loanRepayments += amount;
          categorizedTransactions.push({ type: 'loan_repayment', info, amount });
        }
      }
      else if (info.includes('lease') && (info.includes('payment') || info.includes('installment') || 
               info.includes('rent'))) {
        totals.financingOutflows.leasePayments += amount;
        categorizedTransactions.push({ type: 'lease_payment', info, amount });
      }
      else if (info.includes('capital') || info.includes('owner') || info.includes('equity') || 
               info.includes('share') || info.includes('investment') || 
               (info.includes('contribution') && !info.includes('social'))) {
        totals.financingInflows.ownerCapitalContributions += amount;
        categorizedTransactions.push({ type: 'capital_contribution', info, amount });
      }
      // Operating Activities (default)
      else {
        if (isCredit) {
          totals.operatingIncome += amount;
          categorizedTransactions.push({ type: 'operating_income', info, amount });
        } else {
          totals.operatingExpenses += amount;
          categorizedTransactions.push({ type: 'operating_expense', info, amount });
        }
      }
    });

    // Debug log categorized transactions
    console.log('Categorized Transactions:', {
      totalProcessed: categorizedTransactions.length,
      byCategory: categorizedTransactions.reduce((acc, curr) => {
        acc[curr.type] = (acc[curr.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      examples: categorizedTransactions.slice(0, 3)
    });

    return totals;
  };

  const currentYearTotals = calculateYearlyTotals(currentYearTransactions);
  const lastYearTotals = calculateYearlyTotals(lastYearTransactions);

  // Debug log final totals
  console.log('Final totals:', {
    currentYear: {
      operating: {
        income: currentYearTotals.operatingIncome,
        expenses: currentYearTotals.operatingExpenses,
        net: currentYearTotals.operatingIncome - currentYearTotals.operatingExpenses
      },
      investing: {
        income: currentYearTotals.investingIncome,
        expenses: currentYearTotals.investingExpenses,
        net: currentYearTotals.investingIncome - currentYearTotals.investingExpenses
      },
      financing: {
        inflows: currentYearTotals.financingInflows,
        outflows: currentYearTotals.financingOutflows,
        net: (
          currentYearTotals.financingInflows.loanProceeds + 
          currentYearTotals.financingInflows.ownerCapitalContributions -
          currentYearTotals.financingOutflows.loanRepayments -
          currentYearTotals.financingOutflows.leasePayments
        )
      }
    }
  });

  return {
    operatingActivities: [
      { 
        description: 'Operating Income',
        amount2024: currentYearTotals.operatingIncome,
        amount2023: lastYearTotals.operatingIncome
      },
      { 
        description: 'Operating Expenses',
        amount2024: -currentYearTotals.operatingExpenses,
        amount2023: -lastYearTotals.operatingExpenses,
        indent: 1
      },
      { 
        description: 'Net Operating Cash Flow',
        amount2024: currentYearTotals.operatingIncome - currentYearTotals.operatingExpenses,
        amount2023: lastYearTotals.operatingIncome - lastYearTotals.operatingExpenses,
        isSubTotal: true
      }
    ],
    investingActivities: [
      { 
        description: 'Sale of Assets',
        amount2024: currentYearTotals.investingIncome,
        amount2023: lastYearTotals.investingIncome
      },
      { 
        description: 'Purchase of Fixed Assets',
        amount2024: -currentYearTotals.investingExpenses,
        amount2023: -lastYearTotals.investingExpenses,
        indent: 1
      },
      { 
        description: 'Net Investing Cash Flow',
        amount2024: currentYearTotals.investingIncome - currentYearTotals.investingExpenses,
        amount2023: lastYearTotals.investingIncome - lastYearTotals.investingExpenses,
        isSubTotal: true
      }
    ],
    financingActivities: [
      { 
        description: 'Loan Proceeds',
        amount2024: currentYearTotals.financingInflows.loanProceeds,
        amount2023: lastYearTotals.financingInflows.loanProceeds
      },
      { 
        description: 'Owner Capital Contributions',
        amount2024: currentYearTotals.financingInflows.ownerCapitalContributions,
        amount2023: lastYearTotals.financingInflows.ownerCapitalContributions
      },
      { 
        description: 'Loan Repayments',
        amount2024: -currentYearTotals.financingOutflows.loanRepayments,
        amount2023: -lastYearTotals.financingOutflows.loanRepayments,
        indent: 1
      },
      { 
        description: 'Lease Payments',
        amount2024: -currentYearTotals.financingOutflows.leasePayments,
        amount2023: -lastYearTotals.financingOutflows.leasePayments,
        indent: 1
      },
      { 
        description: 'Net Financing Cash Flow',
        amount2024: (
          currentYearTotals.financingInflows.loanProceeds + 
          currentYearTotals.financingInflows.ownerCapitalContributions -
          currentYearTotals.financingOutflows.loanRepayments -
          currentYearTotals.financingOutflows.leasePayments
        ),
        amount2023: (
          lastYearTotals.financingInflows.loanProceeds + 
          lastYearTotals.financingInflows.ownerCapitalContributions -
          lastYearTotals.financingOutflows.loanRepayments -
          lastYearTotals.financingOutflows.leasePayments
        ),
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
    },
    period: {
      startDate,
      endDate
    },
    openingCashBalance: openingBalance
  };
}; 