'use client'

import { Box, Heading, Text, VStack, HStack, Flex, Spinner, useToast, Select, SimpleGrid } from '@chakra-ui/react'
import { Card, CardBody } from '@chakra-ui/react'
import { BarChart } from '@saas-ui/charts'
import { LuShoppingCart, LuBus, LuHeart, LuTv, LuWallet, LuBuilding, LuUtensils } from 'react-icons/lu'
import { PageHeader } from '#features/common/components/page-header'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import React from 'react'
import { useApiCache } from '#features/common/hooks/use-api-cache'
import { useQueryClient } from '@tanstack/react-query'

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
}

interface CategoryDetail {
  amount: number;
  transactionCount: number;
  firstPayment: number;
  lastPayment: number;
  regularity: number;
  averageDays: number;
}

interface CategoryData {
  id: string;
  title: string;
  icon: any;
  transactions: number;
  totalAmount: number;
  details: Record<string, CategoryDetail>;
}

interface Bank {
  id: string;
  bank_identifier: string;
  name: string;
}

interface TransactionWithBank extends BankTransaction {
  bank_id?: string;
  bank_name?: string;
}

interface ProcessedData {
  categories: Record<string, CategoryData>;
  totals: { income: number; spent: number };
}

export default function CashflowPage() {
  const toast = useToast()
  const { CACHE_KEYS, prefetchData } = useApiCache()
  const [workspace] = useCurrentWorkspace()
  const [expandedSection, setExpandedSection] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [transactions, setTransactions] = React.useState<TransactionWithBank[]>([])
  const [authToken, setAuthToken] = React.useState<string | null>(null)
  const [customerId, setCustomerId] = React.useState<string | null>(null)
  const [connectedBanks, setConnectedBanks] = React.useState<Bank[]>([])
  const [selectedBankId, setSelectedBankId] = React.useState<string>('all')
  const queryClient = useQueryClient()

  // Format value for chart tooltips and axis labels
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return `$${value.toFixed(0)}`
  }

  // Filter transactions based on selected bank with caching
  const filteredTransactions = React.useMemo(() => {
    const filteredCacheKey = `${CACHE_KEYS.CASHFLOW}_filtered_${customerId}_${selectedBankId}`
    const cachedFiltered = queryClient.getQueryData<TransactionWithBank[]>([filteredCacheKey])
    
    if (cachedFiltered) {
      return cachedFiltered
    }

    let filtered = transactions;
    if (selectedBankId !== 'all') {
      filtered = transactions.filter(t => t.bank_id === selectedBankId);
    }

    // Ensure we have valid transactions
    filtered = filtered.filter(t => 
      t && t.amount && typeof t.amount.amount === 'number' && 
      t.credit_debit_indicator && 
      t.transaction_information
    );

    queryClient.setQueryData([filteredCacheKey], filtered)
    return filtered
  }, [transactions, selectedBankId, customerId, queryClient, CACHE_KEYS.CASHFLOW])

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
        toast({
          title: 'Error',
          description: 'Failed to initialize authentication',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      }
    }

    if (workspace?.id) {
      initializeAuth()
    }
  }, [workspace?.id, toast])

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

          // Ensure we return an array
          return Array.isArray(data) ? data : []
        }
      )

      // Update connected banks state immediately after fetching
      setConnectedBanks(Array.isArray(cachedData) ? cachedData : [])
      return cachedData
    } catch (error) {
      console.error('Error fetching connected banks:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch connected banks',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      return []
    }
  }, [customerId, authToken, toast, prefetchData, CACHE_KEYS.ACCOUNTS])

  // Add a separate effect to fetch connected banks when auth is ready
  React.useEffect(() => {
    if (customerId && authToken) {
      fetchConnectedBanks()
    }
  }, [customerId, authToken, fetchConnectedBanks])

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
  }, [authToken, prefetchData, customerId])

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
  }, [authToken, customerId, prefetchData, CACHE_KEYS.TRANSACTIONS])

  // Categorize transaction based on description
  const categorizeTransaction = (description: string): string => {
    description = description.toLowerCase();
    if (description.includes('shopping') || description.includes('retail') || description.includes('store')) {
      return 'shopping';
    } else if (description.includes('transport') || description.includes('uber') || description.includes('taxi') || description.includes('bus')) {
      return 'transport';
    } else if (description.includes('health') || description.includes('medical') || description.includes('pharmacy')) {
      return 'health';
    } else if (description.includes('entertainment') || description.includes('movie') || description.includes('game')) {
      return 'entertainment';
    } else if (description.includes('food') || description.includes('restaurant') || description.includes('cafe')) {
      return 'food';
    } else if (description.includes('housing') || description.includes('rent') || description.includes('mortgage')) {
      return 'housing';
    }
    return 'other';
  }

  // Process transactions into categories with improved caching
  const processCategorizedData = React.useCallback((transactions: BankTransaction[]): ProcessedData => {
    const categorizedCacheKey = `${CACHE_KEYS.CASHFLOW}_categorized_${customerId}_${selectedBankId}`
    const cachedCategorized = queryClient.getQueryData<ProcessedData>([categorizedCacheKey])
    
    if (cachedCategorized) {
      return cachedCategorized
    }

    const categories: Record<string, CategoryData> = {
      shopping: {
        id: 'shopping',
        title: 'Shopping',
        icon: LuShoppingCart,
        transactions: 0,
        totalAmount: 0,
        details: {}
      },
      transport: {
        id: 'transport',
        title: 'Transport',
        icon: LuBus,
        transactions: 0,
        totalAmount: 0,
        details: {}
      },
      health: {
        id: 'health',
        title: 'Health & Wellbeing',
        icon: LuHeart,
        transactions: 0,
        totalAmount: 0,
        details: {}
      },
      entertainment: {
        id: 'entertainment',
        title: 'Entertainment',
        icon: LuTv,
        transactions: 0,
        totalAmount: 0,
        details: {}
      },
      food: {
        id: 'food',
        title: 'Food & Dining',
        icon: LuUtensils,
        transactions: 0,
        totalAmount: 0,
        details: {}
      },
      housing: {
        id: 'housing',
        title: 'Housing',
        icon: LuBuilding,
        transactions: 0,
        totalAmount: 0,
        details: {}
      },
      other: {
        id: 'other',
        title: 'Other',
        icon: LuWallet,
        transactions: 0,
        totalAmount: 0,
        details: {}
      }
    };

    let newTotals = { income: 0, spent: 0 };

    if (transactions && transactions.length > 0) {
      transactions.forEach(transaction => {
        if (!transaction || !transaction.amount || typeof transaction.amount.amount !== 'number') return;

        const category = categorizeTransaction(transaction.transaction_information || '');
        const amount = transaction.amount.amount;
        const isCredit = transaction.credit_debit_indicator === 'CREDIT';

        if (isCredit) {
          newTotals.income += amount;
        } else {
          newTotals.spent += amount;
          
          if (!categories[category]) return;

          categories[category].transactions += 1;
          categories[category].totalAmount += amount;

          const key = transaction.transaction_information || 'Unknown Transaction';
          if (!categories[category].details[key]) {
            categories[category].details[key] = {
              amount: 0,
              transactionCount: 0,
              firstPayment: amount,
              lastPayment: amount,
              regularity: 0,
              averageDays: 0
            };
          }

          const detail = categories[category].details[key];
          detail.amount += amount;
          detail.transactionCount += 1;
          detail.firstPayment = Math.min(detail.firstPayment, amount);
          detail.lastPayment = Math.max(detail.lastPayment, amount);
        }
      });
    }

    // Only add sample data if we have no real transaction data
    if (newTotals.income === 0 && newTotals.spent === 0) {
      Object.keys(categories).forEach(category => {
        categories[category].transactions = Math.floor(Math.random() * 5) + 1;
        categories[category].totalAmount = Math.random() * 1000 + 100;
        categories[category].details['Sample Transaction'] = {
          amount: categories[category].totalAmount,
          transactionCount: categories[category].transactions,
          firstPayment: categories[category].totalAmount / 2,
          lastPayment: categories[category].totalAmount / 2,
          regularity: 30,
          averageDays: 30
        };
      });
      newTotals = { income: 5000, spent: 3000 };
    }

    // Cache the results
    queryClient.setQueryData([categorizedCacheKey], { categories, totals: newTotals });
    
    return { categories, totals: newTotals };
  }, [customerId, selectedBankId, queryClient, CACHE_KEYS.CASHFLOW]);

  const { categories: categorizedData, totals } = React.useMemo(() => {
    return processCategorizedData(filteredTransactions);
  }, [filteredTransactions, processCategorizedData]);

  const chartData: Record<string, string | number>[] = React.useMemo(() => {
    // Try to get cached chart data
    const chartDataCacheKey = `${CACHE_KEYS.CASHFLOW}_chart_${customerId}_${selectedBankId}`
    const cachedChartData = queryClient.getQueryData<Record<string, string | number>[]>([chartDataCacheKey])
    if (cachedChartData && filteredTransactions === (queryClient.getQueryData([chartDataCacheKey + '_transactions']))) {
      return cachedChartData
    }

    const monthlyData: Record<string, { income: number; outcome: number }> = {};
    
    // Get last 6 months including current month
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthYear = date.toLocaleString('default', { month: 'short' });
      months.push(monthYear);
      monthlyData[monthYear] = { income: 0, outcome: 0 };
    }
    
    // Process transactions if they exist
    if (filteredTransactions && filteredTransactions.length > 0) {
      filteredTransactions.forEach(transaction => {
        if (!transaction || !transaction.amount || typeof transaction.amount.amount !== 'number') return;

        const date = new Date(transaction.booking_date_time);
        const monthYear = date.toLocaleString('default', { month: 'short' });
        
        if (monthlyData[monthYear]) {
          const amount = Math.abs(transaction.amount.amount);
          if (transaction.credit_debit_indicator === 'CREDIT') {
            monthlyData[monthYear].income += amount;
          } else {
            monthlyData[monthYear].outcome += amount;
          }
        }
      });
    }

    // Check if we have any actual data
    const hasData = Object.values(monthlyData).some(data => 
      data.income > 0 || data.outcome > 0
    );

    // If no actual data was found, add sample data
    if (!hasData) {
      months.forEach(month => {
        monthlyData[month] = {
          income: Math.random() * 1000 + 500,
          outcome: Math.random() * 800 + 300
        };
      });
    }

    // Transform data into the format expected by BarChart
    const result: Record<string, string | number>[] = months.map(month => ({
      name: month,
      Income: Number(monthlyData[month].income.toFixed(2)),
      Outcome: Number(monthlyData[month].outcome.toFixed(2))
    }));

    // Cache the chart data and the transactions reference
    queryClient.setQueryData([chartDataCacheKey], result);
    queryClient.setQueryData([chartDataCacheKey + '_transactions'], filteredTransactions);

    return result;
  }, [filteredTransactions, customerId, selectedBankId, queryClient, CACHE_KEYS.CASHFLOW]);

  // Fetch all transactions with improved caching
  React.useEffect(() => {
    const fetchAllTransactions = async () => {
      if (!customerId || !authToken) return

      setIsLoading(true)
      try {
        // Check cache first
        const allTransactionsCacheKey = `${CACHE_KEYS.TRANSACTIONS}_all_${customerId}`
        const cachedTransactions = queryClient.getQueryData<TransactionWithBank[]>([allTransactionsCacheKey])

        // If we have cached transactions, use them
        if (cachedTransactions) {
          setTransactions(cachedTransactions)
          setIsLoading(false)
          return
        }

        // Fetch fresh data
        const banks = await fetchConnectedBanks()
        let allTransactions: TransactionWithBank[] = []
        
        // Fetch all accounts and transactions in parallel for better performance
        const bankPromises = banks.map(async (bank: { id: string; bank_identifier: any; name: any }) => {
          const accounts = await fetchAccountsForBank(bank.id)
          const accountPromises = accounts.map(async (account: { account_id: string }) => {
            const accountTransactions = await fetchTransactionsForAccount(account.account_id, bank.id)
            return accountTransactions.map((t: BankTransaction) => ({
              ...t,
              bank_name: bank.bank_identifier || bank.name,
              bank_id: bank.id
            }))
          })
          const bankTransactions = await Promise.all(accountPromises)
          return bankTransactions.flat()
        })

        const bankResults = await Promise.all(bankPromises)
        allTransactions = bankResults.flat()

        // Sort transactions by date (most recent first)
        allTransactions.sort((a, b) => 
          new Date(b.booking_date_time).getTime() - new Date(a.booking_date_time).getTime()
        )

        // Cache transactions
        queryClient.setQueryData([allTransactionsCacheKey], allTransactions)

        // Update state
        setTransactions(allTransactions)
      } catch (error) {
        console.error('Error fetching transactions:', error)
        toast({
          title: 'Error',
          description: 'Failed to fetch transactions',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllTransactions()
  }, [customerId, authToken, fetchConnectedBanks, fetchAccountsForBank, fetchTransactionsForAccount, queryClient, CACHE_KEYS.TRANSACTIONS, toast])

  return (
    <Box>
      <PageHeader />
      <Box 
        height="calc(100vh - 128px)"
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
        <Box mb={6}>
          <Flex justify="space-between" align="center" mb={4}>
            <Box>
              <Heading size="lg" mb={2}>Cashflow Analysis</Heading>
              <Text color="gray.600" fontSize="md">
                Effortlessly view and manage your accounts in one place with real-time balance updates.
              </Text>
            </Box>
            {/* Always show the Select, but disable it when loading or no banks */}
            <Select
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              width="250px"
              bg="white"
              isDisabled={isLoading || !connectedBanks.length}
            >
              <option value="all">All Banks</option>
              {connectedBanks.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.bank_identifier || bank.name}
                </option>
              ))}
            </Select>
          </Flex>

          {isLoading ? (
            <Box textAlign="center" py={10}>
              <Spinner size="xl" color="green.500" />
              <Text mt={4} color="gray.600">Loading transactions...</Text>
            </Box>
          ) : (
            <>
          {/* Analytics Chart Section */}
          <Card variant="unstyled" bg="white" mb={6}>
            <CardBody p={4}>
              <Heading size="md" mb={4}>Analytics</Heading>
              <Box height="300px" pl={4}>
                <BarChart
                  data={chartData}
                  categories={['Income', 'Outcome']}
                  index="name"
                  height="100%"
                  valueFormatter={formatCurrency}
                  showLegend={true}
                  showGrid={true}
                  showYAxis={true}
                  colors={['#10B981', '#064E3B']}
                  yAxisWidth={65}
                  minValue={0}
                  maxValue={Math.max(
                    ...chartData.map((item: Record<string, string | number>) => 
                      Math.max(Number(item.Income) || 0, Number(item.Outcome) || 0)
                    )
                  ) * 1.2}
                />
              </Box>
            </CardBody>
          </Card>

          {/* Summary Stats */}
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
                <Card>
                  <CardBody>
                    <Text fontSize="md" color="gray.600">Total Spent</Text>
                    <Text fontSize="xl" fontWeight="bold">
                      ${totals.spent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <Text fontSize="md" color="gray.600">Total Income</Text>
                    <Text fontSize="xl" fontWeight="bold">
                      ${totals.income.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <Text fontSize="md" color="gray.600">Disposable Income</Text>
                    <Text fontSize="xl" fontWeight="bold">
                      ${(totals.income - totals.spent).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                  </CardBody>
                </Card>
              </SimpleGrid>

          {/* Categories */}
          <VStack spacing={4} align="stretch">
                {Object.values(categorizedData).map((category) => (
              <Card 
                key={category.id}
                position="relative"
                borderLeftWidth="4px"
                borderLeftColor="green.400"
                overflow="hidden"
                cursor="pointer"
                onClick={() => setExpandedSection(expandedSection === category.id ? null : category.id)}
              >
                <CardBody py={4} px={6}>
                  <Box>
                    <Flex justify="space-between" align="center" mb={expandedSection === category.id ? 4 : 0}>
                      <HStack spacing={3}>
                        <Box as={category.icon} size={20} color="gray.600" />
                        <Text fontSize="md" fontWeight="medium">{category.title}</Text>
                      </HStack>
                          <HStack spacing={4}>
                            <Text fontSize="sm" color="gray.600">
                              ${category.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Text>
                      <Text fontSize="sm" color="green.500">{category.transactions} Transactions</Text>
                          </HStack>
                    </Flex>

                    {/* Expanded Content */}
                    {expandedSection === category.id && Object.entries(category.details).map(([title, detail]: [string, CategoryDetail]) => (
                      <Box key={title} mt={4} pl={8}>
                        <Text fontSize="md" fontWeight="medium" mb={2}>{title}</Text>
                        <VStack align="stretch" spacing={2}>
                          <Flex justify="space-between">
                            <Text fontSize="md" color="gray.600">Transaction Count:</Text>
                            <Text fontSize="md">{detail.transactionCount}</Text>
                          </Flex>
                          <Flex justify="space-between">
                            <Text fontSize="md" color="gray.600">Total Amount:</Text>
                            <Text fontSize="md">${detail.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                          </Flex>
                          <Flex justify="space-between">
                            <Text fontSize="md" color="gray.600">First Payment:</Text>
                            <Text fontSize="md">${detail.firstPayment.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                          </Flex>
                          <Flex justify="space-between">
                            <Text fontSize="md" color="gray.600">Last Payment:</Text>
                            <Text fontSize="md">${detail.lastPayment.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                          </Flex>
                        </VStack>
                      </Box>
                    ))}
                  </Box>
                </CardBody>
              </Card>
            ))}
          </VStack>
            </>
          )}
        </Box>
      </Box>
    </Box>
  )
}