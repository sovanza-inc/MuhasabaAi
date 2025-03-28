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

interface CategoryData {
  id: string;
  title: string;
  icon: any;
  transactions: number;
  totalAmount: number;
  details: Record<string, {
    amount: number;
    transactionCount: number;
    firstPayment: number;
    lastPayment: number;
    regularity: number;
    averageDays: number;
  }>;
}

interface Bank {
  id: string;
  bank_identifier: string;
  name: string;
}

interface TransactionWithBank extends BankTransaction {
  bank_id?: string;
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
  const [totals, setTotals] = React.useState({ income: 0, spent: 0 })
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

  // Filter transactions based on selected bank
  const filteredTransactions = React.useMemo(() => {
    if (selectedBankId === 'all') return transactions;
    return transactions.filter(t => t.bank_id === selectedBankId);
  }, [transactions, selectedBankId]);

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

          return data
        }
      )

      setConnectedBanks(cachedData)
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
  }, [customerId, authToken, toast, prefetchData])

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
  }, [authToken, prefetchData, customerId])

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

  // Process transactions into categories
  const processCategorizedData = (transactions: BankTransaction[]): Record<string, CategoryData> => {
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

    let totalIncome = 0;
    let totalSpent = 0;

    transactions.forEach(transaction => {
      const category = categorizeTransaction(transaction.transaction_information);
      const amount = transaction.amount.amount;
      const isCredit = transaction.credit_debit_indicator === 'CREDIT';

      if (isCredit) {
        totalIncome += amount;
      } else {
        totalSpent += amount;
      }

      if (!categories[category]) return;

      categories[category].transactions += 1;
      categories[category].totalAmount += amount;

      const key = transaction.transaction_information;
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
    });

    setTotals({ income: totalIncome, spent: totalSpent });
    return categories;
  };

  // Fetch all transactions
  React.useEffect(() => {
    const fetchAllTransactions = async () => {
      if (!customerId || !authToken) return;

      setIsLoading(true);
      try {
        // Create a unique cache key for all transactions
        const allTransactionsCacheKey = `${CACHE_KEYS.TRANSACTIONS}_all_${customerId}`
        const cachedTransactions = queryClient.getQueryData([allTransactionsCacheKey])
        if (cachedTransactions && Array.isArray(cachedTransactions)) {
          setTransactions(cachedTransactions)
          setIsLoading(false)
          return
        }

        const banks = await fetchConnectedBanks();
        let allTransactions: TransactionWithBank[] = [];
        
        for (const bank of banks) {
          const accounts = await fetchAccountsForBank(bank.id);
          
          for (const account of accounts) {
            const accountTransactions = await fetchTransactionsForAccount(account.account_id, bank.id);
            const transactionsWithBank = accountTransactions.map((transaction: BankTransaction) => ({
              ...transaction,
              bank_name: bank.bank_identifier || bank.name,
              bank_id: bank.id
            }));
            
            allTransactions = [...allTransactions, ...transactionsWithBank];
          }
        }

        // Cache the combined transactions
        queryClient.setQueryData([allTransactionsCacheKey], allTransactions)
        setTransactions(allTransactions);
      } catch (error) {
        console.error('Error fetching all transactions:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch transactions',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (customerId && authToken) {
      fetchAllTransactions();
    }
  }, [customerId, authToken, fetchConnectedBanks, fetchAccountsForBank, fetchTransactionsForAccount, toast]);

  const categorizedData = React.useMemo(() => {
    return processCategorizedData(filteredTransactions);
  }, [filteredTransactions]);

  const chartData = React.useMemo(() => {
    const monthlyData: Record<string, { income: number; outcome: number }> = {};
    
    // Get last 6 months including current month
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthYear = date.toLocaleString('default', { month: 'short' });
      months.push(monthYear);
      monthlyData[monthYear] = { income: 0, outcome: 0 };
    }
    
    filteredTransactions.forEach(transaction => {
      const date = new Date(transaction.booking_date_time);
      const monthYear = date.toLocaleString('default', { month: 'short' });
      
      if (monthlyData[monthYear]) {
        const amount = transaction.amount.amount;
        if (transaction.credit_debit_indicator === 'CREDIT') {
          monthlyData[monthYear].income += amount;
        } else {
          monthlyData[monthYear].outcome += amount;
        }
      }
    });

    return months.map(month => ({
      month,
      income: monthlyData[month].income,
      outcome: monthlyData[month].outcome
    }));
  }, [filteredTransactions]);

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
            {connectedBanks.length > 0 && (
              <Select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                width="250px"
                bg="white"
              >
                <option value="all">All Banks</option>
                {connectedBanks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.bank_identifier || bank.name}
                  </option>
                ))}
              </Select>
            )}
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
                  categories={['income', 'outcome']}
                  index="month"
                  height="100%"
                      valueFormatter={formatCurrency}
                      showLegend={true}
                      showGrid={true}
                      showYAxis={true}
                  colors={['#10B981', '#064E3B']}
                      yAxisWidth={65}
                      minValue={0}
                      maxValue={chartData.reduce((max, item) => {
                        const itemMax = Math.max(item.income, item.outcome);
                        return itemMax > max ? itemMax : max;
                      }, 0) * 1.2}
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
                    {expandedSection === category.id && Object.entries(category.details).map(([title, detail]) => (
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