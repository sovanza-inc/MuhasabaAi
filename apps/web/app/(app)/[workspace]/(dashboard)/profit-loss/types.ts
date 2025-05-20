export interface ProfitLossData {
  revenues: {
    projectCost: string;
    totalSpending: string;
    thisMonth: string;
    transactions: Array<{
      date: string;
      accountName: string;
      description: string;
      amount: string;
      bankId: string;
      bankName: string;
    }>;
  };
  expenses: {
    projectCost: string;
    totalSpending: string;
    thisMonth: string;
    transactions: Array<{
      date: string;
      accountName: string;
      description: string;
      amount: string;
      bankId: string;
      bankName: string;
    }>;
  };
  netProfit: string;
}

export interface FilteredProfitLossData {
  period: {
    startDate: Date;
    endDate: Date;
  };
  revenues: {
    totalSpending: number;
    transactions: any[];
  };
  calculations: {
    otherIncome: number;
    cogs: number;
    grossProfit: number;
    operatingExpenses: {
      salariesAndWages: number;
      rentAndUtilities: number;
      marketingAndAdvertising: number;
      administrativeExpenses: number;
      depreciation: number;
      amortization: number;
      total: number;
    };
    operatingProfit: number;
    financeCosts: number;
  };
  netProfit: number;
}

export interface CustomStatement {
  id: string;
  name: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
} 