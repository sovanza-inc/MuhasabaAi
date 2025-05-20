export interface CustomBalanceSheetStatement {
  id: string;
  name: string;
  amount: number;
  date: string;
  type: 'asset' | 'liability' | 'equity';
  category: 'current' | 'non-current';
}

export interface BalanceSheetData {
  assets: {
    currentAssets: {
      cash: string;
      bank: string;
      savings: string;
      totalCurrent: string;
      transactions: Array<{
        date: string;
        accountName: string;
        description: string;
        amount: string;
        bankId: string;
        bankName: string;
      }>;
    };
    nonCurrentAssets: {
      fixedAssets: string;
      investments: string;
      totalNonCurrent: string;
      transactions: Array<{
        date: string;
        accountName: string;
        description: string;
        amount: string;
        bankId: string;
        bankName: string;
      }>;
    };
    totalAssets: string;
  };
  liabilities: {
    currentLiabilities: {
      accountsPayable: string;
      shortTermLoans: string;
      totalCurrent: string;
      transactions: Array<{
        date: string;
        accountName: string;
        description: string;
        amount: string;
        bankId: string;
        bankName: string;
      }>;
    };
    nonCurrentLiabilities: {
      longTermLoans: string;
      totalNonCurrent: string;
      transactions: Array<{
        date: string;
        accountName: string;
        description: string;
        amount: string;
        bankId: string;
        bankName: string;
      }>;
    };
    totalLiabilities: string;
  };
  equity: {
    ownerEquity: string;
    retainedEarnings: string;
    totalEquity: string;
  };
} 