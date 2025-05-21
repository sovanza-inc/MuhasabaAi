export interface CustomStatement {
  id: string;
  name: string;
  amount: number;
  date: string;
  type: 'operating' | 'investing' | 'financing';
  category: string;
  amountType: 'deposit' | 'expense';
}

export interface FilteredCashFlowData {
  period: {
    startDate: Date;
    endDate: Date;
  };
  operatingActivities: {
    inflows: {
      totalAmount: number;
      transactions: Array<{
        date: string;
        accountName: string;
        description: string;
        amount: string;
        bankId: string;
        bankName: string;
      }>;
    };
    outflows: {
      totalAmount: number;
      transactions: Array<{
        date: string;
        accountName: string;
        description: string;
        amount: string;
        bankId: string;
        bankName: string;
      }>;
    };
    netCashFlow: number;
  };
  investingActivities: {
    inflows: {
      totalAmount: number;
      transactions: Array<{
        date: string;
        accountName: string;
        description: string;
        amount: string;
        bankId: string;
        bankName: string;
      }>;
    };
    outflows: {
      totalAmount: number;
      transactions: Array<{
        date: string;
        accountName: string;
        description: string;
        amount: string;
        bankId: string;
        bankName: string;
      }>;
    };
    netCashFlow: number;
  };
  financingActivities: {
    inflows: {
      totalAmount: number;
      transactions: Array<{
        date: string;
        accountName: string;
        description: string;
        amount: string;
        bankId: string;
        bankName: string;
      }>;
    };
    outflows: {
      totalAmount: number;
      transactions: Array<{
        date: string;
        accountName: string;
        description: string;
        amount: string;
        bankId: string;
        bankName: string;
      }>;
    };
    netCashFlow: number;
  };
  netCashFlow: number;
}

export interface OperatingFormData {
  name: string;
  amount: number;
  date?: string;
  category: 'adjustment' | 'working_capital';
  amountType: 'deposit' | 'expense';
} 