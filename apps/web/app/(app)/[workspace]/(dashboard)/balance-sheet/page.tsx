'use client'

import { Box, Heading, Text, SimpleGrid, HStack, Card, CardBody, Select, Spinner } from '@chakra-ui/react'
import { PageHeader } from '#features/common/components/page-header'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import { useApiCache } from '#features/common/hooks/use-api-cache'
import React from 'react'

interface BankAccount {
  id?: string;
  account_id: string;
  status: string;
  status_update_date_time: string | null;
  currency: string;
  account_type?: string;
  account_sub_type?: string;
  nickname?: string;
  opening_date?: string | null;
  account?: Array<{
    scheme_name: string;
    identification: string;
    name: string | null;
  }>;
  bank_id?: string;
  bank_name?: string;
}

interface BankBalance {
  account_id: string;
  balance: number;
  currency: string;
  type: string;
  credit_debit_indicator?: string;
  updated_at: string;
}

interface AccountWithBalance extends BankAccount {
  balance?: BankBalance;
}

interface BankWithAccounts {
  id: string;
  name: string;
  bank_identifier?: string;
  accounts: AccountWithBalance[];
}

interface Transaction {
  transaction_id: string;
  account_id: string;
  transaction_information: string;
  amount: {
    amount: number;
    currency: string;
  };
  credit_debit_indicator: string;
  status: string;
  booking_date_time: string;
  bank_name?: string;
}

export default function BalanceSheetPage() {
  const [workspace] = useCurrentWorkspace()
  const { CACHE_KEYS, prefetchData } = useApiCache()
  const [selectedAccount, setSelectedAccount] = React.useState('all')
  const [isLoading, setIsLoading] = React.useState(true)
  const [authToken, setAuthToken] = React.useState<string | null>(null)
  const [customerId, setCustomerId] = React.useState<string | null>(null)
  const [bankAccounts, setBankAccounts] = React.useState<BankWithAccounts[]>([])
  const [transactions, setTransactions] = React.useState<Transaction[]>([])

  // Initialize auth token and customer ID
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
        const customerCheckResponse = await fetch(`/api/bank-integration/get-customer?app_user_id=${workspace.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authData.access_token}`
          }
        });

        if (customerCheckResponse.ok) {
          const customerData = await customerCheckResponse.json();
          setCustomerId(customerData.customer_id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      }
    }

    if (workspace?.id) {
      initializeAuth()
    }
  }, [workspace?.id])

  // Fetch connected banks and their accounts
  const fetchConnectedBanks = React.useCallback(async () => {
    if (!customerId || !authToken) return []

    try {
      // Create a unique cache key that includes the customer ID
      const cacheKey = `${CACHE_KEYS.ACCOUNTS}_${customerId}`
      const cachedData = await prefetchData(
        cacheKey,
        async () => {
          const response = await fetch(`/api/bank-integration/accounts?customer_id=${customerId}`, {
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${authToken}`
            }
          })

          const data = await response.json()
          
          if (!response.ok) {
            throw new Error(data.details || 'Failed to fetch connected banks')
          }

          return data
        }
      )

      return cachedData
    } catch (error) {
      console.error('Error fetching connected banks:', error)
      return []
    }
  }, [customerId, authToken, prefetchData])

  // Fetch accounts for each bank
  const fetchAccountsForBank = React.useCallback(async (entityId: string) => {
    try {
      // Create a unique cache key that includes both customer ID and entity ID
      const cacheKey = `${CACHE_KEYS.ACCOUNTS}_${customerId}_${entityId}`
      return await prefetchData(
        cacheKey,
        async () => {
          const response = await fetch(`/api/bank-integration/fetch-accounts?entity_id=${entityId}`, {
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${authToken}`
            }
          })

          const data = await response.json()
          
          if (!response.ok) {
            throw new Error(data.details || 'Failed to fetch bank accounts')
          }

          return data
        }
      )
    } catch (error) {
      console.error('Error fetching bank accounts:', error)
      return []
    }
  }, [authToken, customerId, prefetchData])

  // Fetch balance for an account
  const fetchBalanceForAccount = React.useCallback(async (accountId: string, entityId: string) => {
    try {
      // Create a unique cache key that includes customer ID, account ID, and entity ID
      const cacheKey = `${CACHE_KEYS.ACCOUNTS}_balance_${customerId}_${accountId}_${entityId}`
      return await prefetchData(
        cacheKey,
        async () => {
          const response = await fetch(`/api/bank-integration/balance?account_id=${accountId}&entity_id=${entityId}`, {
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${authToken}`
            }
          })

          const data = await response.json()
          
          if (!response.ok) {
            throw new Error(data.details || 'Failed to fetch balance')
          }

          return data
        }
      )
    } catch (error) {
      console.error('Error fetching balance:', error)
      return null
    }
  }, [authToken, customerId, prefetchData])

  // Fetch transactions for an account
  const fetchTransactionsForAccount = React.useCallback(async (accountId: string, entityId: string) => {
    try {
      // Create a unique cache key that includes customer ID, account ID, and entity ID
      const cacheKey = `${CACHE_KEYS.TRANSACTIONS}_${customerId}_${accountId}_${entityId}`
      return await prefetchData(
        cacheKey,
        async () => {
          const response = await fetch(`/api/bank-integration/transactions?account_id=${accountId}&entity_id=${entityId}`, {
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${authToken}`
            }
          })

          const data = await response.json()
          
          if (!response.ok) {
            throw new Error(data.details || 'Failed to fetch transactions')
          }

          return data.transactions || []
        }
      )
    } catch (error) {
      console.error('Error fetching transactions:', error)
      return []
    }
  }, [authToken, customerId, prefetchData])

  // Fetch all data
  React.useEffect(() => {
    const fetchAllData = async () => {
      if (!customerId || !authToken) return

      setIsLoading(true)
      try {
        const connectedBanks = await fetchConnectedBanks()
        const banksWithAccounts: BankWithAccounts[] = []
        let allTransactions: Transaction[] = []
        
        for (const bank of connectedBanks) {
          const accounts = await fetchAccountsForBank(bank.id)
          const accountsWithBalances: AccountWithBalance[] = []
          
          for (const account of accounts) {
            const balance = await fetchBalanceForAccount(account.account_id, bank.id)
            accountsWithBalances.push({
              ...account,
              balance,
              bank_id: bank.id,
              bank_name: bank.bank_identifier || bank.name
            })

            const accountTransactions = await fetchTransactionsForAccount(account.account_id, bank.id)
            allTransactions = [...allTransactions, ...accountTransactions.map((t: any) => ({
              ...t,
              bank_name: bank.bank_identifier || bank.name
            }))]
          }

          if (accountsWithBalances.length > 0) {
            banksWithAccounts.push({
              id: bank.id,
              name: bank.bank_identifier || bank.name,
              accounts: accountsWithBalances
            })
          }
        }

        // Sort transactions by date (most recent first)
        allTransactions.sort((a, b) => 
          new Date(b.booking_date_time).getTime() - new Date(a.booking_date_time).getTime()
        )

        setBankAccounts(banksWithAccounts)
        setTransactions(allTransactions)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (customerId && authToken) {
      fetchAllData()
    }
  }, [customerId, authToken, fetchConnectedBanks, fetchAccountsForBank, fetchBalanceForAccount, fetchTransactionsForAccount])

  // Calculate balance totals
  const balanceData = React.useMemo(() => {
    const totals = {
      cash: 0,
      ePayment: 0,
      bank: 0
    }

    bankAccounts.forEach(bank => {
      // Skip if a specific bank is selected and this isn't it
      if (selectedAccount !== 'all' && bank.id !== selectedAccount) {
        return;
      }

      bank.accounts.forEach(account => {
        // Get the balance amount directly from the account
        const amount = account.balance?.balance || 0;
        const accountName = (account.nickname || '').toLowerCase();
        
        // Categorize based on account name
        if (accountName.includes('current')) {
          totals.cash += amount;
        } else if (accountName.includes('call')) {
          totals.bank += amount;
        }
      })
    })

    return [
      {
        amount: `$ ${totals.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      title: 'Total Cash Account Balance'
    },
    {
        amount: `$ ${totals.ePayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      title: 'E-Payment Balance'
    },
    {
        amount: `$ ${totals.bank.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      title: 'Total Bank Account Balance'
    }
  ]
  }, [bankAccounts, selectedAccount])

  // Calculate net profit based on filtered transactions
  const netProfit = React.useMemo(() => {
    const relevantTransactions = selectedAccount === 'all' 
      ? transactions 
      : transactions.filter(t => {
          const bank = bankAccounts.find(b => b.id === selectedAccount);
          return bank?.accounts.some(a => a.account_id === t.account_id);
        });

    const total = relevantTransactions.reduce((acc, transaction) => {
      const amount = transaction.amount.amount;
      return acc + (transaction.credit_debit_indicator === 'CREDIT' ? amount : -amount);
    }, 0);

    return total;
  }, [transactions, selectedAccount, bankAccounts])

  // Filter transactions based on selected account
  const filteredTransactions = React.useMemo(() => {
    const relevantTransactions = selectedAccount === 'all'
      ? transactions
      : transactions.filter(t => {
          const bank = bankAccounts.find(b => b.id === selectedAccount);
          return bank?.accounts.some(a => a.account_id === t.account_id);
        });

    if (selectedAccount === 'all') {
      // Shuffle the transactions array and take first 5
      const shuffled = [...relevantTransactions].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 5);
    }

    // For specific bank selection, show most recent 4 transactions
    return relevantTransactions.slice(0, 4);
  }, [transactions, selectedAccount, bankAccounts])

  return (
    <Box>
      <PageHeader />
      <Box 
        height="calc(100vh - 65px)"
        position="relative"
        display="flex"
        flexDirection="column"
      >
        <Box
          flex="1"
          overflow="auto"
          py={6} 
          px={8}
          sx={{
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none'
          }}
        >
          {/* Reports Section */}
          <Box mb={6}>
            <Box mb={4}>
              <Heading size="lg" mb={2}>Reports</Heading>
              <Text color="gray.600" mb={4} fontSize="md">
                Effortlessly view and analyze your financial reports in one place with real-time insights and data updates.
              </Text>
            </Box>

            <Box display="flex" justifyContent="flex-end" mb={4}>
              <Select 
                maxW="200px"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                bg="green.50"
                color="green.500"
                borderColor="green.200"
                _hover={{
                  borderColor: "green.300"
                }}
              >
                <option value="all">All Banks</option>
                {bankAccounts.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.bank_identifier || bank.name}
                  </option>
                ))}
              </Select>
            </Box>
          </Box>

          {isLoading ? (
            <Box textAlign="center" py={10}>
              <Spinner size="xl" color="green.500" />
              <Text mt={4} color="gray.600">Loading balance sheet...</Text>
            </Box>
          ) : (
            <>
          {/* Balance Cards */}
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
            {balanceData.map((item, index) => (
              <Card 
                key={index} 
                p={6} 
                borderRadius="lg" 
                boxShadow="sm"
                borderTop="4px solid"
                borderTopColor="green.400"
              >
                <CardBody p={0}>
                  <Text fontSize="2xl" fontWeight="semibold" mb={2}>
                    {item.amount}
                  </Text>
                  <Text color="gray.600">{item.title}</Text>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>

          {/* Transactions Section */}
          <Box mb={6}>
                <Heading size="md" mb={4}>Recent Transactions</Heading>
            <Text color="gray.600" mb={6} fontSize="md">
              Effortlessly view and manage your accounts in one place with real-time balance updates.
            </Text>

            <SimpleGrid columns={1} spacing={4}>
                  {filteredTransactions.map((transaction) => (
                <Card 
                      key={transaction.transaction_id}
                  borderLeftWidth="4px"
                      borderLeftColor={transaction.credit_debit_indicator === 'CREDIT' ? 'green.400' : 'red.400'}
                  boxShadow="sm"
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
                        <Text fontSize="sm" color="gray.500">
                              Transaction ID: {transaction.transaction_id}
                        </Text>
                      </Box>
                      <Text 
                        fontSize="lg" 
                        fontWeight="medium"
                        color={transaction.credit_debit_indicator === 'CREDIT' ? "green.500" : "red.500"}
                      >
                        {transaction.credit_debit_indicator === 'CREDIT' ? '+$' : '-$'}
                        {Math.abs(transaction.amount.amount).toLocaleString()}
                      </Text>
                    </Box>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </Box>
            </>
          )}
        </Box>

        {/* Summary Footer */}
        <Box 
          bg="teal.700" 
          color="white" 
          p={4}
        >
          <HStack justify="space-between">
            <Text>Summary: Revenue-Expenses</Text>
            <Text>Net Profit: $ {Math.abs(netProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </HStack>
        </Box>
      </Box>
    </Box>
  )
}
