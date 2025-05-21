export interface CustomCashFlowStatement {
  id: string;
  name: string;
  amount: number;
  date: string;
  type: 'operating' | 'investing' | 'financing';
  category: string;
  amountType: 'deposit' | 'expense';
} 