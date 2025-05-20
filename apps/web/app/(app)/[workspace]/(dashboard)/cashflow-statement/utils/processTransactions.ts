import { CustomStatement } from '../types';

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

interface CashFlowData {
  operatingActivities: CashFlowItem[];
  investingActivities: CashFlowItem[];
  financingActivities: CashFlowItem[];
  indirectMethod: {
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
  period: {
    startDate: Date;
    endDate: Date;
  };
  openingCashBalance: number;
}

export const processTransactions = (transactions: BankTransaction[], customStatements: CustomStatement[] = []) => {
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
      if (info.includes('loan') || info.includes('borrowing') || info.includes('debt') || 
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
      // Rest of the categorization logic
      else if (info.includes('depreciat') || info.includes('depr.')) {
        totals.depreciation += amount;
      }
      else if (info.includes('amort') || info.includes('intangible')) {
        totals.amortization += amount;
      }
      else if (info.includes('interest') || info.includes('int.')) {
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
      else if (info.includes('equipment') || info.includes('investment') || info.includes('asset') || 
               info.includes('property') || info.includes('machine')) {
        if (isCredit) totals.investingIncome += amount;
        else totals.investingExpenses += amount;
      }
      else if (info.includes('loan') || info.includes('dividend') || info.includes('capital') || 
               info.includes('share') || info.includes('equity')) {
        if (isCredit) totals.financingInflows.ownerCapitalContributions += amount;
      }
      else {
        // Default to operating activities if no specific category matches
        if (isCredit) totals.operatingIncome += amount;
        else totals.operatingExpenses += amount;
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

    // Log investing activities totals
    console.log('Investing Activities Totals:', {
      income: totals.investingIncome,
      expenses: totals.investingExpenses,
      netInvesting: totals.investingIncome - totals.investingExpenses
    });

    return totals;
  };

  const currentYearTotals = calculateYearlyTotals(currentYearTransactions);
  const lastYearTotals = calculateYearlyTotals(lastYearTransactions);

  // Debug log final totals
  console.log('Final totals:', {
    currentYear: {
      investing: {
        income: currentYearTotals.investingIncome,
        expenses: currentYearTotals.investingExpenses
      },
      financing: {
        inflows: currentYearTotals.financingInflows,
        outflows: currentYearTotals.financingOutflows
      }
    }
  });

  // Create the return object with investing activities
  const returnData: CashFlowData = {
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
      { 
        description: 'Purchase of Fixed Assets',
        amount2024: -Math.max(0, currentYearTotals.investingExpenses * 0.7), // 70% of investing expenses
        amount2023: -Math.max(0, lastYearTotals.investingExpenses * 0.7)
      },
      { 
        description: 'Purchase of Intangible Assets',
        amount2024: -Math.max(0, currentYearTotals.investingExpenses * 0.3), // 30% of investing expenses
        amount2023: -Math.max(0, lastYearTotals.investingExpenses * 0.3)
      },
      { 
        description: 'Sale of Assets',
        amount2024: Math.max(0, currentYearTotals.investingIncome),
        amount2023: Math.max(0, lastYearTotals.investingIncome)
      },
      { 
        description: 'Net cash used in investing activities',
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
        description: 'Loan Principal Repayments', 
        amount2024: -currentYearTotals.financingOutflows.loanRepayments,
        amount2023: -lastYearTotals.financingOutflows.loanRepayments
      },
      { 
        description: 'Lease Principal Payments', 
        amount2024: -currentYearTotals.financingOutflows.leasePayments,
        amount2023: -lastYearTotals.financingOutflows.leasePayments
      },
      { 
        description: 'Owner\'s Capital Contributions', 
        amount2024: currentYearTotals.financingInflows.ownerCapitalContributions,
        amount2023: lastYearTotals.financingInflows.ownerCapitalContributions
      },
      { 
        description: 'Net cash from financing activities',
        amount2024: (
          currentYearTotals.financingInflows.loanProceeds + 
          currentYearTotals.financingInflows.ownerCapitalContributions - 
          currentYearTotals.financingOutflows.loanRepayments - 
          currentYearTotals.financingOutflows.leasePayments
        ), // Inflows - Outflows
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

  // Log final investing activities
  console.log('Final Investing Activities:', {
    fixedAssetsPurchase: returnData.investingActivities[0],
    intangibleAssetsPurchase: returnData.investingActivities[1],
    assetsSale: returnData.investingActivities[2],
    netInvesting: returnData.investingActivities[3]
  });

  return returnData;
};

// Helper functions to categorize transactions
function isOperatingActivity(transaction: BankTransaction): boolean {
  const description = transaction.transaction_information?.toLowerCase() || '';
  return (
    description.includes('sales') ||
    description.includes('revenue') ||
    description.includes('payment') ||
    description.includes('salary') ||
    description.includes('rent') ||
    description.includes('utilities') ||
    description.includes('supplies') ||
    description.includes('inventory')
  );
}

function isInvestingActivity(transaction: BankTransaction): boolean {
  const description = transaction.transaction_information?.toLowerCase() || '';
  return (
    description.includes('equipment') ||
    description.includes('property') ||
    description.includes('asset') ||
    description.includes('investment') ||
    description.includes('securities')
  );
}

function isFinancingActivity(transaction: BankTransaction): boolean {
  const description = transaction.transaction_information?.toLowerCase() || '';
  return (
    description.includes('loan') ||
    description.includes('dividend') ||
    description.includes('capital') ||
    description.includes('share') ||
    description.includes('equity') ||
    description.includes('debt')
  );
} 