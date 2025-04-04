import { useState, useEffect, useCallback } from 'react';
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace';

interface Transaction {
  transaction_id: string;
  account_id: string;
  amount: {
    amount: number;
    currency: string;
  };
  credit_debit_indicator: string;
  status: string;
  booking_date_time: string;
  value_date_time: string;
  transaction_information: string;
}

interface Bank {
  id: string;
  bank_identifier: string;
  name: string;
}

interface ProfitLossData {
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
  selectedBankId: string;
  banks: Bank[];
}

export function useProfitLoss() {
  const [workspace] = useCurrentWorkspace();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string>('all');
  const [banks, setBanks] = useState<Bank[]>([]);

  // Step 1: Initialize auth and get customer ID
  const initializeAuth = useCallback(async () => {
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
      const customerCheckResponse = await fetch(`/api/bank-integration/get-customer?app_user_id=${workspace?.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authData.access_token}`
        }
      });

      if (customerCheckResponse.ok) {
        const customerData = await customerCheckResponse.json();
        setCustomerId(customerData.customer_id);
      }
    } catch (err: any) {
      setError('Failed to initialize authentication: ' + err.message);
      setIsLoading(false);
    }
  }, [workspace?.id]);

  // Step 2: Fetch connected banks
  const fetchConnectedBanks = useCallback(async () => {
    if (!customerId || !authToken) return [];

    try {
      const response = await fetch(`/api/bank-integration/accounts?customer_id=${customerId}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.details || 'Failed to fetch connected banks');
      }

      return data;
    } catch (err: any) {
      setError('Failed to fetch connected banks: ' + err.message);
      return [];
    }
  }, [customerId, authToken]);

  // Step 3: Fetch accounts for a bank
  const fetchAccountsForBank = useCallback(async (entityId: string) => {
    try {
      const response = await fetch(`/api/bank-integration/fetch-accounts?entity_id=${entityId}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.details || 'Failed to fetch bank accounts');
      }

      return data;
    } catch (err: any) {
      console.error('Error fetching bank accounts:', err);
      return [];
    }
  }, [authToken]);

  // Step 4: Fetch transactions for an account
  const fetchTransactionsForAccount = useCallback(async (accountId: string, entityId: string) => {
    try {
      const response = await fetch(`/api/bank-integration/transactions?account_id=${accountId}&entity_id=${entityId}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.details || 'Failed to fetch transactions');
      }

      return data.transactions || [];
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      return [];
    }
  }, [authToken]);

  // Main effect to fetch all data
  useEffect(() => {
    const fetchAllData = async () => {
      if (!workspace?.id) {
        setError('Workspace ID is required');
        setIsLoading(false);
        return;
      }

      try {
        // Step 1: Get auth token and customer ID if not already present
        if (!authToken || !customerId) {
          await initializeAuth();
          return; // The auth state change will trigger this effect again
        }

        // Step 2: Get connected banks
        const connectedBanks = await fetchConnectedBanks();
        setBanks(connectedBanks);
        let allTransactions: any[] = [];
        
        // Step 3 & 4: For each bank, get accounts and their transactions
        for (const bank of connectedBanks) {
          // Skip if a specific bank is selected and this isn't it
          if (selectedBankId !== 'all' && bank.id !== selectedBankId) continue;
          
          const accounts = await fetchAccountsForBank(bank.id);
          
          for (const account of accounts) {
            const accountTransactions = await fetchTransactionsForAccount(account.account_id, bank.id);
            const transactionsWithBank = accountTransactions.map((t: any) => ({
              ...t,
              bankId: bank.id,
              bankName: bank.bank_identifier || bank.name
            }));
            allTransactions = [...allTransactions, ...transactionsWithBank];
          }
        }

        // Separate revenues and expenses
        const revenueTransactions = allTransactions.filter(
          (t: any) => t.credit_debit_indicator === 'CREDIT'
        );
        const expenseTransactions = allTransactions.filter(
          (t: any) => t.credit_debit_indicator === 'DEBIT'
        );

        // Calculate totals
        const revenueTotal = revenueTransactions.reduce(
          (sum: number, t: Transaction) => sum + t.amount.amount,
          0
        );
        const expenseTotal = expenseTransactions.reduce(
          (sum: number, t: Transaction) => sum + t.amount.amount,
          0
        );

        // Calculate this month's transactions
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const revenueThisMonth = revenueTransactions
          .filter((t: Transaction) => new Date(t.booking_date_time) >= startOfMonth)
          .reduce((sum: number, t: Transaction) => sum + t.amount.amount, 0);
        
        const expenseThisMonth = expenseTransactions
          .filter((t: Transaction) => new Date(t.booking_date_time) >= startOfMonth)
          .reduce((sum: number, t: Transaction) => sum + t.amount.amount, 0);

        // Format transaction data for display
        const formatTransactions = (transactions: any[]) =>
          transactions.map((t) => ({
            date: new Date(t.booking_date_time).toLocaleDateString(),
            accountName: t.bankName,
            description: t.transaction_information,
            amount: `${t.amount.amount}${t.amount.currency}`,
            bankId: t.bankId,
            bankName: t.bankName
          }));

        // Calculate percentages (assuming monthly target is total/12)
        const revenuePercentage = Math.min(
          Math.round((revenueThisMonth / (revenueTotal / 12)) * 100),
          100
        );
        const expensePercentage = Math.min(
          Math.round((expenseThisMonth / (expenseTotal / 12)) * 100),
          100
        );

        setData({
          revenues: {
            projectCost: `${revenueTotal}$`,
            totalSpending: `${revenueThisMonth}$`,
            thisMonth: `${revenuePercentage}%`,
            transactions: formatTransactions(revenueTransactions)
          },
          expenses: {
            projectCost: `${expenseTotal}$`,
            totalSpending: `${expenseThisMonth}$`,
            thisMonth: `${expensePercentage}%`,
            transactions: formatTransactions(expenseTransactions)
          },
          netProfit: `${revenueTotal - expenseTotal}$`,
          selectedBankId,
          banks
        });

        setIsLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch transaction data');
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [workspace?.id, authToken, customerId, selectedBankId, initializeAuth, fetchConnectedBanks, fetchAccountsForBank, fetchTransactionsForAccount]);

  const selectBank = (bankId: string) => {
    setSelectedBankId(bankId);
  };

  return { data, isLoading, error, selectBank };
}
