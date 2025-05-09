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
  revenues: {
    projectCost: number;
    totalSpending: number;
    transactions: Array<{
      date: string;
      accountName: string;
      description: string;
      amount: number;
    }>;
  };
  expenses: {
    projectCost: number;
    totalSpending: number;
    transactions: Array<{
      date: string;
      accountName: string;
      description: string;
      amount: number;
    }>;
  };
  netProfit: number;
  period: {
    startDate: Date;
    endDate: Date;
  };
  calculations: {
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
    otherIncome: number;
  };
} 