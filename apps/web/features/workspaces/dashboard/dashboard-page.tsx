'use client'

import { useState } from 'react'
import React from 'react'

import {
  Card,
  CardBody,
  Box,
  Heading,
  Text,
  SimpleGrid,
  HStack,
  Progress,
  Button,
  Icon,
  Spinner,
  Select,
} from '@chakra-ui/react'
import {
  Page,
  PageBody,
  PageHeader,
} from '@saas-ui-pro/react'
import { LuChevronRight } from 'react-icons/lu'

import { WorkspacePageProps } from '#lib/create-page'
import { AreaChart, BarChart } from '@saas-ui/charts'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'

interface ConnectedBank {
  id: string;
  customer_id: string;
  bank_identifier: string;
  permissions: {
    identity: boolean;
    accounts: boolean;
    balance: boolean;
    transactions: boolean;
  };
  bank_type: string;
  created_at: string;
}

interface BankAccount {
  account_id: string;
  status: string;
  currency: string;
  account_type?: string;
  account_sub_type?: string;
  nickname?: string;
  bank_id?: string;
}

interface BankTransaction {
  transaction_id: string;
  account_id: string;
  transaction_information: string;
  transaction_reference: string | null;
  amount: {
    amount: number;
    currency: string;
  };
  credit_debit_indicator: string;
  status: string;
  booking_date_time: string;
  value_date_time: string;
  bank_name?: string;
  bank_id?: string;
  account_type?: string;
  account_name?: string;
}

export function DashboardPage(props: WorkspacePageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [connectedBanks, setConnectedBanks] = useState<ConnectedBank[]>([])
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [workspace] = useCurrentWorkspace()
  const [selectedBankId, setSelectedBankId] = useState<string>('all')

  // Initialize auth token and get customer ID
  React.useEffect(() => {
    const initializeAuth = async () => {
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
        if (workspace?.id) {
          const customerCheckResponse = await fetch(`/api/bank-integration/get-customer?app_user_id=${workspace.id}`, {
            headers: {
              'Authorization': `Bearer ${authData.access_token}`
            }
          });

          if (customerCheckResponse.ok) {
            const customerData = await customerCheckResponse.json();
            setCustomerId(customerData.customer_id);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      }
    };

    initializeAuth();
  }, [workspace?.id]);

  // Fetch connected banks when we have customer ID
  React.useEffect(() => {
    const fetchConnectedBanks = async () => {
      if (!authToken || !customerId) return;

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

        setConnectedBanks(data || []);
      } catch (error) {
        console.error('Error fetching connected banks:', error);
      }
    };

    fetchConnectedBanks();
  }, [authToken, customerId]);

  // Fetch accounts for each bank
  React.useEffect(() => {
    const fetchAccounts = async () => {
      if (!authToken || connectedBanks.length === 0) return;

      try {
        const allAccounts: BankAccount[] = [];

        for (const bank of connectedBanks) {
          const response = await fetch(`/api/bank-integration/fetch-accounts?entity_id=${bank.id}`, {
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${authToken}`
            }
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.details || 'Failed to fetch accounts');
          }

          // Add bank ID to each account
          const accountsWithBank = data.map((account: BankAccount) => ({
            ...account,
            bank_id: bank.id
          }));

          allAccounts.push(...accountsWithBank);
        }

        setAccounts(allAccounts);
      } catch (error) {
        console.error('Error fetching accounts:', error);
      }
    };

    fetchAccounts();
  }, [authToken, connectedBanks]);

  // Fetch transactions when we have accounts
  React.useEffect(() => {
    const fetchTransactions = async () => {
      if (!authToken || accounts.length === 0) return;

      try {
        const allTransactions: BankTransaction[] = [];

        for (const account of accounts) {
          if (!account.account_id || !account.bank_id) continue;

          const response = await fetch(`/api/bank-integration/transactions?account_id=${account.account_id}&entity_id=${account.bank_id}`, {
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${authToken}`
            }
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.details || 'Failed to fetch transactions');
          }

          if (data.transactions) {
            // Add bank information to transactions
            const bank = connectedBanks.find(b => b.id === account.bank_id);
            const accountType = account.account_type || account.account_sub_type || "";
            const accountName = account.nickname || accountType || account.account_id;
            
            const transactionsWithBank = data.transactions.map((transaction: BankTransaction) => ({
              ...transaction,
              bank_name: bank?.bank_identifier || 'Bank',
              bank_id: account.bank_id,
              account_type: accountType,
              account_name: accountName
            }));
            allTransactions.push(...transactionsWithBank);
          }
        }

        // Sort transactions by date (most recent first)
        allTransactions.sort((a, b) => 
          new Date(b.booking_date_time).getTime() - new Date(a.booking_date_time).getTime()
        );

        setTransactions(allTransactions);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [authToken, accounts, connectedBanks]);

  // Get transactions to display
  const transactionsToDisplay = React.useMemo(() => {
    if (selectedBankId === 'all') {
      // For "All Banks", ensure we show transactions from multiple banks with diverse amounts and account types
      // First, group transactions by bank
      const bankTransactionMap = new Map<string, BankTransaction[]>();
      
      // Group transactions by bank ID
      transactions.forEach(transaction => {
        if (!transaction.bank_id) return;
        
        if (!bankTransactionMap.has(transaction.bank_id)) {
          bankTransactionMap.set(transaction.bank_id, []);
        }
        
        bankTransactionMap.get(transaction.bank_id)?.push(transaction);
      });
      
      // If we have banks with transactions
      if (bankTransactionMap.size > 0) {
        const result: BankTransaction[] = [];
        
        // Process each bank separately
        bankTransactionMap.forEach((bankTransactions, bankId) => {
          // Group transactions by account_type
          const callAccountTxns = bankTransactions.filter(t => 
            t.account_type?.toLowerCase().includes('call') || 
            t.account_name?.toLowerCase().includes('call')
          );
          
          const currentAccountTxns = bankTransactions.filter(t => 
            t.account_type?.toLowerCase().includes('current') || 
            t.account_name?.toLowerCase().includes('current')
          );
          
          const otherAccountTxns = bankTransactions.filter(t => 
            !callAccountTxns.includes(t) && !currentAccountTxns.includes(t)
          );
          
          // For each account type, get both credit and debit transactions
          const processAccountGroup = (accountTxns: BankTransaction[]) => {
            if (accountTxns.length === 0) return [];
            
            const credits = accountTxns.filter(t => t.credit_debit_indicator === 'CREDIT');
            const debits = accountTxns.filter(t => t.credit_debit_indicator === 'DEBIT');
            
            const selected: BankTransaction[] = [];
            
            // Take at least one credit transaction if available
            if (credits.length > 0) {
              // Sort by amount descending and take the highest amount
              const highestCredit = [...credits].sort((a, b) => b.amount.amount - a.amount.amount)[0];
              selected.push(highestCredit);
            }
            
            // Take at least one debit transaction if available
            if (debits.length > 0) {
              // Sort by amount descending and take the highest amount
              const highestDebit = [...debits].sort((a, b) => b.amount.amount - a.amount.amount)[0];
              selected.push(highestDebit);
            }
            
            return selected;
          };
          
          // Process each account type
          const callAccountSelected = processAccountGroup(callAccountTxns);
          const currentAccountSelected = processAccountGroup(currentAccountTxns);
          const otherAccountSelected = processAccountGroup(otherAccountTxns);
          
          // Add all selected transactions to result
          result.push(...callAccountSelected, ...currentAccountSelected, ...otherAccountSelected);
        });
        
        // Re-sort all combined transactions by date
        result.sort((a, b) => 
          new Date(b.booking_date_time).getTime() - new Date(a.booking_date_time).getTime()
        );
        
        // Return up to 5 most recent transactions across all banks
        return result.slice(0, 5);
      }
      
      // If no transaction grouping was successful, return top 5
      return transactions.slice(0, 5);
    } else {
      // For specific bank selection, get a diverse mix of transaction types, amounts, and account types
      const bankTransactions = transactions.filter(t => t.bank_id === selectedBankId);
      
      // Group by account type
      const callAccountTxns = bankTransactions.filter(t => 
        t.account_type?.toLowerCase().includes('call') || 
        t.account_name?.toLowerCase().includes('call')
      );
      
      const currentAccountTxns = bankTransactions.filter(t => 
        t.account_type?.toLowerCase().includes('current') || 
        t.account_name?.toLowerCase().includes('current')
      );
      
      const otherAccountTxns = bankTransactions.filter(t => 
        !callAccountTxns.includes(t) && !currentAccountTxns.includes(t)
      );
      
      const result: BankTransaction[] = [];
      
      // Process each account type to get balanced credit/debit transactions
      const processAccountGroup = (accountTxns: BankTransaction[], maxItems: number) => {
        if (accountTxns.length === 0) return [];
        
        const credits = accountTxns.filter(t => t.credit_debit_indicator === 'CREDIT');
        const debits = accountTxns.filter(t => t.credit_debit_indicator === 'DEBIT');
        
        const selected: BankTransaction[] = [];
        
        // Take highest credit transaction if available
        if (credits.length > 0) {
          const highestCredit = [...credits].sort((a, b) => b.amount.amount - a.amount.amount)[0];
          selected.push(highestCredit);
          
          // If we have more than one and maxItems allows, take lowest amount too
          if (credits.length > 1 && selected.length < maxItems) {
            const lowestCredit = [...credits].sort((a, b) => a.amount.amount - b.amount.amount)[0];
            if (lowestCredit.transaction_id !== highestCredit.transaction_id) {
              selected.push(lowestCredit);
            }
          }
        }
        
        // Take highest debit transaction if available
        if (debits.length > 0 && selected.length < maxItems) {
          const highestDebit = [...debits].sort((a, b) => b.amount.amount - a.amount.amount)[0];
          selected.push(highestDebit);
          
          // If we have more than one and maxItems allows, take lowest amount too
          if (debits.length > 1 && selected.length < maxItems) {
            const lowestDebit = [...debits].sort((a, b) => a.amount.amount - b.amount.amount)[0];
            if (lowestDebit.transaction_id !== highestDebit.transaction_id) {
              selected.push(lowestDebit);
            }
          }
        }
        
        return selected;
      };
      
      // Allow up to 2 transactions from each account type
      const callAccountSelected = processAccountGroup(callAccountTxns, 2);
      const currentAccountSelected = processAccountGroup(currentAccountTxns, 2);
      const otherAccountSelected = processAccountGroup(otherAccountTxns, 1);
      
      // Add all selected transactions to result
      result.push(...callAccountSelected, ...currentAccountSelected, ...otherAccountSelected);
      
      // If we didn't get enough transactions, add more from the original list
      if (result.length < 5) {
        const existingIds = new Set(result.map(t => t.transaction_id));
        const remainingTransactions = bankTransactions
          .filter(t => !existingIds.has(t.transaction_id))
          .slice(0, 5 - result.length);
        
        result.push(...remainingTransactions);
      }
      
      // Sort by date (most recent first)
      result.sort((a, b) => 
        new Date(b.booking_date_time).getTime() - new Date(a.booking_date_time).getTime()
      );
      
      return result.slice(0, 5);
    }
  }, [transactions, selectedBankId]);

  // Add a debug log to check transactions and bank ID
  React.useEffect(() => {
    console.log('Selected bank ID:', selectedBankId);
    console.log('Filtered transactions:', transactionsToDisplay.length);
    console.log('All transactions:', transactions.length);
    console.log('First transaction bank ID:', transactions[0]?.bank_id);
    
    // Log unique bank IDs in transactions to debug
    const uniqueBankIds = [...new Set(transactions.map(t => t.bank_id))];
    console.log('Unique bank IDs in transactions:', uniqueBankIds);
  }, [selectedBankId, transactionsToDisplay, transactions]);

  // Calculate account metrics for the receivables cards
  const accountMetrics = React.useMemo(() => {
    console.log('Calculating account metrics');
    console.log('Total transactions:', transactions.length);
    
    // Initialize with empty values
    const metrics = {
      current: { title: "Current Account", cost: 0, spending: 0, progress: 0, label: "Utilized" },
      savings: { title: "Savings Account", cost: 0, spending: 0, progress: 0, label: "Utilized" },
      call: { title: "Call Account", cost: 0, spending: 0, progress: 0, label: "Performance" }
    };
    
    // Filter transactions by selected bank
    const filteredTransactions = selectedBankId === 'all' 
      ? transactions 
      : transactions.filter(t => t.bank_id === selectedBankId);
    
    // Skip calculation if no transactions
    if (filteredTransactions.length === 0) {
      console.warn('No transactions available - using fallback values');
      metrics.current.cost = 13000;
      metrics.current.spending = 2600;
      metrics.current.progress = 20;
      metrics.savings.cost = 15000;
      metrics.savings.spending = 6000;
      metrics.savings.progress = 40;
      metrics.call.cost = 18000;
      metrics.call.spending = 16200;
      metrics.call.progress = 90;
      return metrics;
    }
    
    // First collect all transaction totals
    let totalCredits = 0;
    let totalDebits = 0;
    
    filteredTransactions.forEach(tx => {
      const amount = tx.amount.amount;
      if (tx.credit_debit_indicator === 'CREDIT') {
        totalCredits += amount;
      } else {
        totalDebits += amount;
      }
    });
    
    const totalBalance = totalCredits - totalDebits;
    const totalActivity = totalCredits + totalDebits;
    
    console.log('Total transaction amounts:', { 
      credits: totalCredits, 
      debits: totalDebits, 
      balance: totalBalance,
      activity: totalActivity
    });
    
    // Categorize transactions by account type
    const currentAccountTxns: BankTransaction[] = [];
    const savingsAccountTxns: BankTransaction[] = [];
    const callAccountTxns: BankTransaction[] = [];
    const otherAccountTxns: BankTransaction[] = [];
    
    filteredTransactions.forEach(transaction => {
      const accountType = transaction.account_type?.toLowerCase() || '';
      const accountName = transaction.account_name?.toLowerCase() || '';
      
      if (accountType.includes('current') || accountName.includes('current')) {
        currentAccountTxns.push(transaction);
      } else if (accountType.includes('call') || accountName.includes('call')) {
        callAccountTxns.push(transaction);
      } else if (accountType.includes('saving') || accountName.includes('saving') || 
                accountType.includes('deposit') || accountName.includes('deposit')) {
        savingsAccountTxns.push(transaction);
      } else {
        otherAccountTxns.push(transaction);
      }
    });
    
    console.log('Transaction counts by type:', {
      current: currentAccountTxns.length,
      savings: savingsAccountTxns.length,
      call: callAccountTxns.length,
      other: otherAccountTxns.length
    });
    
    // Calculate metrics for Current Account
    if (currentAccountTxns.length > 0) {
      let currentCredits = 0;
      let currentDebits = 0;
      
      currentAccountTxns.forEach(tx => {
        const amount = tx.amount.amount;
        if (tx.credit_debit_indicator === 'CREDIT') {
          currentCredits += amount;
        } else {
          currentDebits += amount;
        }
      });
      
      const currentBalance = currentCredits - currentDebits;
      metrics.current.cost = Math.max(currentCredits, 1000);
      metrics.current.spending = currentDebits;
      metrics.current.progress = currentCredits > 0 ? 
        Math.min(Math.round((currentDebits / currentCredits) * 100), 100) : 0;
      
      console.log('Current account calculated:', { 
        credits: currentCredits, 
        debits: currentDebits, 
        balance: currentBalance
      });
    } else if (otherAccountTxns.length > 0) {
      // If no specifically labeled current accounts, use "other" transactions
      let otherCredits = 0;
      let otherDebits = 0;
      
      otherAccountTxns.forEach(tx => {
        const amount = tx.amount.amount;
        if (tx.credit_debit_indicator === 'CREDIT') {
          otherCredits += amount;
        } else {
          otherDebits += amount;
        }
      });
      
      metrics.current.cost = Math.max(otherCredits, 1000);
      metrics.current.spending = otherDebits;
      metrics.current.progress = otherCredits > 0 ? 
        Math.min(Math.round((otherDebits / otherCredits) * 100), 100) : 0;
      
      console.log('Current account using other transactions');
    } else {
      // No current or other account transactions - use portion of total
      metrics.current.cost = Math.max(Math.round(totalCredits * 0.4), 1000);
      metrics.current.spending = Math.round(totalDebits * 0.4);
      metrics.current.progress = metrics.current.cost > 0 ? 
        Math.min(Math.round((metrics.current.spending / metrics.current.cost) * 100), 100) : 0;
      
      console.log('Current account using percentage of total');
    }
    
    // Calculate metrics for Savings Account
    if (savingsAccountTxns.length > 0) {
      let savingsCredits = 0;
      let savingsDebits = 0;
      
      savingsAccountTxns.forEach(tx => {
        const amount = tx.amount.amount;
        if (tx.credit_debit_indicator === 'CREDIT') {
          savingsCredits += amount;
        } else {
          savingsDebits += amount;
        }
      });
      
      const savingsBalance = savingsCredits - savingsDebits;
      metrics.savings.cost = Math.max(savingsCredits, 1000);
      metrics.savings.spending = savingsDebits;
      metrics.savings.progress = savingsCredits > 0 ? 
        Math.min(Math.round((savingsDebits / savingsCredits) * 100), 100) : 0;
      
      console.log('Savings account calculated:', { 
        credits: savingsCredits, 
        debits: savingsDebits, 
        balance: savingsBalance
      });
    } else {
      // No savings account transactions - use portion of total
      metrics.savings.cost = Math.max(Math.round(totalCredits * 0.3), 1000);
      metrics.savings.spending = Math.round(totalDebits * 0.3);
      metrics.savings.progress = metrics.savings.cost > 0 ? 
        Math.min(Math.round((metrics.savings.spending / metrics.savings.cost) * 100), 100) : 0;
      
      console.log('Savings account using percentage of total');
    }
    
    // Calculate metrics for Call Account
    if (callAccountTxns.length > 0) {
      let callCredits = 0;
      let callDebits = 0;
      
      callAccountTxns.forEach(tx => {
        const amount = tx.amount.amount;
        if (tx.credit_debit_indicator === 'CREDIT') {
          callCredits += amount;
        } else {
          callDebits += amount;
        }
      });
      
      const callBalance = callCredits - callDebits;
      metrics.call.cost = Math.max(callCredits, 1000);
      metrics.call.spending = callDebits;
      metrics.call.progress = callCredits > 0 ? 
        Math.min(Math.round((callDebits / callCredits) * 100), 100) : 0;
      
      console.log('Call account calculated:', { 
        credits: callCredits, 
        debits: callDebits, 
        balance: callBalance
      });
    } else {
      // No call account transactions - use portion of total
      metrics.call.cost = Math.max(Math.round(totalCredits * 0.3), 1000);
      metrics.call.spending = Math.round(totalDebits * 0.3);
      metrics.call.progress = metrics.call.cost > 0 ? 
        Math.min(Math.round((metrics.call.spending / metrics.call.cost) * 100), 100) : 0;
      
      console.log('Call account using percentage of total');
    }
    
    return metrics;
  }, [transactions, selectedBankId]);

  // Update the charts section to use filtered transactions
  const chartData = React.useMemo(() => {
    // Filter transactions by selected bank
    const filteredTransactions = selectedBankId === 'all' 
      ? transactions 
      : transactions.filter(t => t.bank_id === selectedBankId);

    // Group transactions by month
    const monthlyData = new Map();
    const monthlyAnalysis = new Map();
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1);
    
    // Add default months to ensure we have data to display
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = today.getMonth();
    
    // Add last 5 months (or fewer if we're early in the year)
    for (let i = 4; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12; // Handle wrapping around to previous year
      const month = months[monthIndex];
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { month, income: 0, outcome: 0 });
      }
    }
    
    // Add default days for the area chart
    for (let day = 1; day <= 8; day++) {
      if (!monthlyAnalysis.has(day)) {
        monthlyAnalysis.set(day, { day, lastMonth: 0, thisMonth: 0 });
      }
    }

    // Process transactions
    filteredTransactions.forEach(tx => {
      const date = new Date(tx.booking_date_time);
      const month = date.toLocaleString('default', { month: 'short' });
      const amount = tx.amount.amount;
      const isCredit = tx.credit_debit_indicator === 'CREDIT';

      // For bar chart
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { month, income: 0, outcome: 0 });
      }
      if (isCredit) {
        monthlyData.get(month).income += amount;
      } else {
        monthlyData.get(month).outcome += amount;
      }

      // For area chart
      const isThisMonth = date.getMonth() === today.getMonth();
      const isLastMonth = date.getMonth() === lastMonth.getMonth();
      const day = date.getDate();

      if (isThisMonth || isLastMonth) {
        if (!monthlyAnalysis.has(day)) {
          monthlyAnalysis.set(day, { day, lastMonth: 0, thisMonth: 0 });
        }
        if (isThisMonth) {
          monthlyAnalysis.get(day).thisMonth += isCredit ? amount : -amount;
        } else {
          monthlyAnalysis.get(day).lastMonth += isCredit ? amount : -amount;
        }
      }
    });

    // If we don't have enough transaction data, use placeholder data
    const barData = Array.from(monthlyData.values()).slice(-5);
    const areaData = Array.from(monthlyAnalysis.values())
      .sort((a, b) => a.day - b.day)
      .slice(0, 8);
      
    // Add some placeholder values if we don't have real transaction data
    const hasBarData = barData.some(item => item.income > 0 || item.outcome > 0);
    const hasAreaData = areaData.some(item => item.lastMonth > 0 || item.thisMonth > 0);
    
    const defaultBarData = [
      { month: 'Jan', income: 300, outcome: 200 },
      { month: 'Feb', income: 200, outcome: 150 },
      { month: 'Mar', income: 400, outcome: 300 },
      { month: 'Apr', income: 300, outcome: 250 },
      { month: 'May', income: 500, outcome: 400 }
    ];
    
    const defaultAreaData = [
      { day: 1, lastMonth: 3004, thisMonth: 4504 },
      { day: 2, lastMonth: 3200, thisMonth: 4200 },
      { day: 3, lastMonth: 2800, thisMonth: 4400 },
      { day: 4, lastMonth: 2600, thisMonth: 4100 },
      { day: 5, lastMonth: 2700, thisMonth: 4300 },
      { day: 6, lastMonth: 2800, thisMonth: 4000 },
      { day: 7, lastMonth: 2900, thisMonth: 4200 },
      { day: 8, lastMonth: 3000, thisMonth: 4504 }
    ];

    return {
      barChartData: hasBarData ? barData : defaultBarData,
      areaChartData: hasAreaData ? areaData : defaultAreaData,
      isPlaceholderData: {
        bar: !hasBarData,
        area: !hasAreaData
      }
    };
  }, [transactions, selectedBankId]);

  const body = (
    <Box 
      height="calc(100vh - 128px)"
      overflow="auto"
      sx={{
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        msOverflowStyle: 'none',
        scrollbarWidth: 'none'
      }}
    >
      {/* Receivables Section */}
      <Box mb={8}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Heading size="lg" mb={2}>Receivables</Heading>
            <Text color="gray.600">
              Effortlessly view and manage your accounts in one place with real-time balance updates.
            </Text>
          </Box>
          <HStack spacing={4}>
            <Select 
              maxW="200px"
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              bg="green.50"
              color="green.500"
              borderColor="green.200"
              _hover={{
                borderColor: "green.300"
              }}
            >
              <option value="all">All Banks</option>
              {connectedBanks.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.bank_identifier}
                </option>
              ))}
            </Select>
            <Button
              as="a"
              href="#"
              colorScheme="green"
              variant="link"
              rightIcon={<Icon as={LuChevronRight} />}
            >
              View Reports
            </Button>
          </HStack>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
          <Card borderTop="4px solid" borderTopColor="green.400">
            <CardBody>
              <Text fontSize="md" fontWeight="medium" mb={3}>{accountMetrics.current.title}</Text>
              <HStack mb={2} justify="space-between">
                <Text color="gray.600" fontSize="sm">Total Available: ${accountMetrics.current.cost.toLocaleString()}</Text>
                <Text color="gray.600" fontSize="sm">Total Debits: ${accountMetrics.current.spending.toLocaleString()}</Text>
              </HStack>
              <HStack justify="space-between" mb={2}>
                <Text color="gray.600" fontSize="sm">{accountMetrics.current.label}</Text>
                <Text color="gray.600" fontSize="sm">{accountMetrics.current.progress}%</Text>
              </HStack>
              <Progress value={accountMetrics.current.progress} size="sm" colorScheme="green" />
            </CardBody>
          </Card>

          <Card borderTop="4px solid" borderTopColor="green.400">
            <CardBody>
              <Text fontSize="md" fontWeight="medium" mb={3}>{accountMetrics.savings.title}</Text>
              <HStack mb={2} justify="space-between">
                <Text color="gray.600" fontSize="sm">Total Available: ${accountMetrics.savings.cost.toLocaleString()}</Text>
                <Text color="gray.600" fontSize="sm">Total Debits: ${accountMetrics.savings.spending.toLocaleString()}</Text>
              </HStack>
              <HStack justify="space-between" mb={2}>
                <Text color="gray.600" fontSize="sm">{accountMetrics.savings.label}</Text>
                <Text color="gray.600" fontSize="sm">{accountMetrics.savings.progress}%</Text>
              </HStack>
              <Progress value={accountMetrics.savings.progress} size="sm" colorScheme="green" />
            </CardBody>
          </Card>

          <Card borderTop="4px solid" borderTopColor="green.400">
            <CardBody>
              <Text fontSize="md" fontWeight="medium" mb={3}>{accountMetrics.call.title}</Text>
              <HStack mb={2} justify="space-between">
                <Text color="gray.600" fontSize="sm">Total Capacity: ${accountMetrics.call.cost.toLocaleString()}</Text>
                <Text color="gray.600" fontSize="sm">Current Balance: ${accountMetrics.call.spending.toLocaleString()}</Text>
              </HStack>
              <HStack justify="space-between" mb={2}>
                <Text color="gray.600" fontSize="sm">{accountMetrics.call.label}</Text>
                <Text color="gray.600" fontSize="sm">{accountMetrics.call.progress}%</Text>
              </HStack>
              <Progress value={accountMetrics.call.progress} size="sm" colorScheme="green" />
            </CardBody>
          </Card>
        </SimpleGrid>
      </Box>

      {/* Charts Section */}
      <Box mb={8}>
        <Heading size="lg" mb={2}>Cashflow Analysis</Heading>
        <Text color="gray.600" mb={4}>
          Effortlessly view and manage your accounts in one place with real-time balance updates.
        </Text>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <Card>
            <CardBody height="300px">
              <Heading size="md" mb={4}>Income vs Expenses</Heading>
              <Box position="relative" height="250px">
              <BarChart
                  data={chartData.barChartData}
                categories={['income', 'outcome']}
                index="month"
                height="250px"
                colors={['#38B2AC', '#2C7A7B']}
              />
                {chartData.isPlaceholderData.bar && (
                  <Text position="absolute" top="5" left="0" right="0" textAlign="center" color="gray.500" fontSize="sm">
                    {transactions.length > 0 ? 
                      'Showing sample data. Select a bank with more transaction history.' : 
                      'Showing sample data. Connect a bank to see your actual cash flow.'}
                  </Text>
                )}
              </Box>
            </CardBody>
          </Card>

          <Card>
            <CardBody height="300px">
              <Heading size="md" mb={4}>Monthly Analysis</Heading>
              <Box position="relative" height="250px">
                <AreaChart
                  data={chartData.areaChartData}
                  categories={['lastMonth', 'thisMonth']}
                  index="day"
                  height="200px"
                  colors={['#3182CE', '#38B2AC']}
                  yAxisWidth={65}
                  valueFormatter={(value) => `$${value}`}
                />
                {chartData.isPlaceholderData.area && (
                  <Text position="absolute" top="5" left="0" right="0" textAlign="center" color="gray.500" fontSize="sm">
                    {transactions.length > 0 ? 
                      'Showing sample data. More transaction history needed.' : 
                      'Showing sample data. Connect a bank to see your actual monthly comparison.'}
                  </Text>
                )}
              </Box>
              <HStack justify="center" spacing={8} mt={4}>
                <HStack>
                  <Box w="3" h="3" borderRadius="full" bg="blue.500" />
                  <Text color="gray.600">Last Month</Text>
                  <Text fontWeight="medium">
                    ${!chartData.isPlaceholderData.area 
                      ? (chartData.areaChartData[0]?.lastMonth.toLocaleString() || '0')
                      : '3,004'
                    }
                  </Text>
                </HStack>
                <HStack>
                  <Box w="3" h="3" borderRadius="full" bg="teal.500" />
                  <Text color="gray.600">This Month</Text>
                  <Text fontWeight="medium">
                    ${!chartData.isPlaceholderData.area 
                      ? (chartData.areaChartData[0]?.thisMonth.toLocaleString() || '0')
                      : '4,504'
                    }
                  </Text>
                </HStack>
              </HStack>
            </CardBody>
          </Card>
        </SimpleGrid>
      </Box>

      {/* Transactions Section */}
      <Box mb={6} position="relative">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
        <Heading size="lg" mb={2}>Transactions</Heading>
            <Text color="gray.600">
              Real-time transaction updates from all your connected bank accounts.
        </Text>
          </Box>
        </Box>

        {isLoading ? (
          <Box textAlign="center" py={10}>
            <Spinner size="xl" color="green.500" />
            <Text mt={4} color="gray.600">Loading transactions...</Text>
          </Box>
        ) : transactionsToDisplay.length === 0 ? (
          <Box textAlign="center" py={10}>
            <Text color="gray.600">No transactions found</Text>
          </Box>
        ) : (
        <SimpleGrid columns={1} spacing={4}>
            {transactionsToDisplay.map((transaction) => (
            <Card 
                key={transaction.transaction_id}
              borderLeftWidth="4px"
                borderLeftColor={transaction.credit_debit_indicator === 'CREDIT' ? 'green.400' : 'red.400'}
            >
              <CardBody py={4} px={6}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Text fontSize="md" fontWeight="medium">
                        {transaction.bank_name}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                        {new Date(transaction.booking_date_time).toLocaleString()}
                    </Text>
                      <Text fontSize="sm" color="gray.500" noOfLines={1}>
                        {transaction.transaction_information?.replace(/POS-PURCHASE CARD NO\.\d+\*+ /, '')
                          .replace(/INWARD T\/T\/REF\/MCR\/PAYMENT OF /, '')
                          || 'Bank Transaction'}
                    </Text>
                  </Box>
                  <Text 
                    fontSize="lg" 
                    fontWeight="medium"
                      color={transaction.credit_debit_indicator === 'CREDIT' ? "green.500" : "red.500"}
                  >
                      {transaction.credit_debit_indicator === 'CREDIT' ? '+' : '-'}
                      {transaction.amount.currency} {Math.abs(transaction.amount.amount).toLocaleString()}
                  </Text>
                </Box>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
        )}
      </Box>
    </Box>
  )

  return (
    <Page>
      <PageHeader title="Dashboard" />
      <PageBody
        contentWidth="container.2xl"
        bg="page-body-bg-subtle"
        py={{ base: 4, xl: 8 }}
        px={{ base: 4, xl: 8 }}
      >
        {body}
      </PageBody>
    </Page>
  )
}
