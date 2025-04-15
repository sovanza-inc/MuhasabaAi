import { useState, useEffect, useCallback } from 'react';
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace';
import { useApiCache } from '#features/common/hooks/use-api-cache';

interface Transaction {
  transaction_id: string;
  account_id: string;
  amount: {
    amount: string | number;
    currency: string;
  };
  credit_debit_indicator: 'CREDIT' | 'DEBIT';
  status: string;
  booking_date_time: string;
  value_date_time: string;
  transaction_information: string;
  bankId?: string;
  bankName?: string;
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
  const { prefetchData, CACHE_KEYS } = useApiCache();
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
      // Create a unique cache key that includes the customer ID
      const cacheKey = `${CACHE_KEYS.ACCOUNTS}_${customerId}`;
      return await prefetchData(
        cacheKey,
        async () => {
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
        }
      );
    } catch (err: any) {
      setError('Failed to fetch connected banks: ' + err.message);
      return [];
    }
  }, [customerId, authToken, prefetchData, CACHE_KEYS.ACCOUNTS]);

  // Step 3: Fetch accounts for a bank
  const fetchAccountsForBank = useCallback(async (entityId: string) => {
    try {
      // Create a unique cache key that includes both customer ID and entity ID
      const cacheKey = `${CACHE_KEYS.ACCOUNTS}_${customerId}_${entityId}`;
      return await prefetchData(
        cacheKey,
        async () => {
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
        }
      );
    } catch (err: any) {
      console.error('Error fetching bank accounts:', err);
      return [];
    }
  }, [authToken, customerId, prefetchData, CACHE_KEYS.ACCOUNTS]);

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
      
      // Log raw API response
      console.log('API Response:', {
        accountId,
        entityId,
        status: response.status,
        statusText: response.statusText,
        data: data
      });
      
      if (!response.ok) {
        throw new Error(data.details || 'Failed to fetch transactions');
      }

      // Log transactions if they exist
      if (data.transactions && data.transactions.length > 0) {
        console.log('Found transactions:', {
          count: data.transactions.length,
          sample: data.transactions[0]
        });
      } else {
        console.log('No transactions found for account:', accountId);
      }

      return data.transactions || [];
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      return [];
    }
  }, [authToken, customerId, CACHE_KEYS.TRANSACTIONS]);

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
        console.log('Connected Banks:', connectedBanks);
        setBanks(connectedBanks);
        
        let allTransactions: Transaction[] = [];
        
        // Step 3 & 4: For each bank, get accounts and their transactions
        for (const bank of connectedBanks) {
          console.log('Processing bank:', bank.name);
          
          // Skip if a specific bank is selected and this isn't it
          if (selectedBankId !== 'all' && bank.id !== selectedBankId) {
            console.log('Skipping bank due to selection:', bank.name);
            continue;
          }
          
          const accounts = await fetchAccountsForBank(bank.id);
          console.log('Found accounts for bank:', {
            bankName: bank.name,
            accountCount: accounts.length
          });
          
          for (const account of accounts) {
            console.log('Fetching transactions for account:', account.account_id);
            const accountTransactions = await fetchTransactionsForAccount(account.account_id, bank.id);
            
            if (accountTransactions && accountTransactions.length > 0) {
              console.log('Adding transactions:', {
                accountId: account.account_id,
                count: accountTransactions.length
              });
              
              allTransactions = [...allTransactions, ...accountTransactions.map((t: any) => ({
                ...t,
                bankId: bank.id,
                bankName: bank.bank_identifier || bank.name
              }))];
            }
          }
        }

        console.log('Total transactions found:', allTransactions.length);

        // Simple calculation of totals
        const revenues = allTransactions
          .filter(t => t.credit_debit_indicator === 'CREDIT')
          .reduce((sum, t) => sum + Number(t.amount.amount), 0);

        const expenses = allTransactions
          .filter(t => t.credit_debit_indicator === 'DEBIT')
          .reduce((sum, t) => sum + Number(t.amount.amount), 0);

        const calculateTotalSpending = (transactions: Transaction[]) => {
          if (!Array.isArray(transactions) || transactions.length === 0) {
            return '0.000';
          }

          try {
            const baseAmount = transactions.reduce((sum, t) => 
              sum + Math.abs(Number(t.amount.amount)), 0);
            
            // Calculate additional costs based on transaction patterns
            const uniqueBanks = new Set(transactions.filter(t => t.bankId).map(t => t.bankId)).size;
            const transactionCount = transactions.length;
            
            // Dynamic multiplier based on transaction complexity
            const complexityMultiplier = Math.min(
              ((uniqueBanks * 0.1) + (transactionCount * 0.01)), 
              0.95
            );
            
            const total = baseAmount * (1 + complexityMultiplier);
            return Number(total).toFixed(3);
          } catch (error) {
            console.error('Error calculating total spending:', error);
            return '0.000';
          }
        };

        const calculatePercentage = (projectCost: number, totalSpending: number) => {
          try {
            if (!projectCost || !totalSpending) return '0%';
            
            // Calculate the difference and convert to percentage
            const difference = totalSpending - projectCost;
            const percentageIncrease = (difference / projectCost) * 100;
            
            // Ensure percentage is between 0 and 100 for the progress bar
            const normalizedPercentage = Math.min(Math.max(Math.round(percentageIncrease), 0), 100);
            
            // Return as string with % symbol
            return normalizedPercentage.toString() + '%';
          } catch (error) {
            console.error('Error calculating percentage:', error);
            return '0%';
          }
        };

        // Ensure we have valid transaction arrays
        const revenueTransactions = Array.isArray(allTransactions) 
          ? allTransactions.filter(t => t && t.credit_debit_indicator === 'CREDIT')
          : [];
        
        const expenseTransactions = Array.isArray(allTransactions)
          ? allTransactions.filter(t => t && t.credit_debit_indicator === 'DEBIT')
          : [];

        // Format transactions for display
        const formatTransactions = (transactions: Transaction[]) => {
          if (!Array.isArray(transactions)) return [];
          
          return transactions.map(t => ({
            date: new Date(t.booking_date_time).toLocaleDateString(),
            accountName: t.bankName || 'Unknown',
            description: t.transaction_information,
            amount: `${Math.abs(Number(t.amount.amount))} ${t.amount.currency}`,
            bankId: t.bankId || '',
            bankName: t.bankName || 'Unknown'
          }));
        };

        // Calculate values with safe defaults
        const revenueProjectCost = Number(revenues || 0).toFixed(3);
        const revenueTotalSpending = calculateTotalSpending(revenueTransactions);
        
        const expenseProjectCost = Number(expenses || 0).toFixed(3);
        const expenseTotalSpending = calculateTotalSpending(expenseTransactions);

        // Set the data with enhanced calculations
        setData({
          revenues: {
            projectCost: revenueProjectCost,
            totalSpending: revenueTotalSpending,
            thisMonth: calculatePercentage(Number(revenueProjectCost), Number(revenueTotalSpending)),
            transactions: formatTransactions(revenueTransactions)
          },
          expenses: {
            projectCost: expenseProjectCost,
            totalSpending: expenseTotalSpending,
            thisMonth: calculatePercentage(Number(expenseProjectCost), Number(expenseTotalSpending)),
            transactions: formatTransactions(expenseTransactions)
          },
          netProfit: (revenues - expenses).toString(),
          selectedBankId,
          banks
        });

        setIsLoading(false);
      } catch (err: any) {
        console.error('Error in fetchAllData:', err);
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
