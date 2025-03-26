'use client'

import { Box, Heading, Text, SimpleGrid, VStack, Spinner, useToast, Button, Select } from '@chakra-ui/react'
import { Card, CardBody } from '@chakra-ui/react'
import { BarChart, AreaChart } from '@saas-ui/charts'
import { PageHeader } from '#features/common/components/page-header'
import { SaasProvider } from '@saas-ui/react'
import { EmptyState } from '@saas-ui/react'
import { LuWallet } from 'react-icons/lu'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import { useRouter } from 'next/navigation'
import React from 'react'

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
}

interface Bank {
  id: string;
  bank_identifier: string;
  name: string;
}

interface TransactionWithBank extends BankTransaction {
  bank_name?: string;
  bank_id?: string;
}

export default function TransactionPage() {
  const toast = useToast()
  const router = useRouter()
  const [workspace] = useCurrentWorkspace()
  const [isLoading, setIsLoading] = React.useState(true)
  const [transactions, setTransactions] = React.useState<TransactionWithBank[]>([])
  const [authToken, setAuthToken] = React.useState<string | null>(null)
  const [customerId, setCustomerId] = React.useState<string | null>(null)
  const [connectedBanks, setConnectedBanks] = React.useState<Bank[]>([])
  const [selectedBankId, setSelectedBankId] = React.useState<string>('all')

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

      setConnectedBanks(data)
      return data
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
  }, [customerId, authToken, toast])

  // Fetch accounts for each bank
  const fetchAccountsForBank = React.useCallback(async (entityId: string) => {
    try {
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
    } catch (error) {
      console.error('Error fetching bank accounts:', error)
      return []
    }
  }, [authToken])

  // Fetch transactions for an account
  const fetchTransactionsForAccount = React.useCallback(async (accountId: string, entityId: string) => {
    try {
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
    } catch (error) {
      console.error('Error fetching transactions:', error)
      return []
    }
  }, [authToken])

  // Fetch all transactions
  React.useEffect(() => {
    const fetchAllTransactions = async () => {
      if (!customerId || !authToken) return

      setIsLoading(true)
      try {
        const connectedBanks = await fetchConnectedBanks()
        let allTransactions: TransactionWithBank[] = []
        
        for (const bank of connectedBanks) {
          const accounts = await fetchAccountsForBank(bank.id)
          
          for (const account of accounts) {
            const accountTransactions = await fetchTransactionsForAccount(account.account_id, bank.id)
            const transactionsWithBank = accountTransactions.map((transaction: BankTransaction) => ({
              ...transaction,
              bank_name: bank.bank_identifier || bank.name,
              bank_id: bank.id
            }))
            
            allTransactions = [...allTransactions, ...transactionsWithBank]
          }
        }

        // Sort transactions by date (most recent first)
        allTransactions.sort((a, b) => 
          new Date(b.booking_date_time).getTime() - new Date(a.booking_date_time).getTime()
        )

        setTransactions(allTransactions)
      } catch (error) {
        console.error('Error fetching all transactions:', error)
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

    if (customerId && authToken) {
      fetchAllTransactions()
    }
  }, [customerId, authToken, fetchConnectedBanks, fetchAccountsForBank, fetchTransactionsForAccount, toast])

  const handleAddBankClick = () => {
    router.push(`/${workspace.slug}/bank-integrations`)
  }

  // Filter transactions based on selected bank
  const filteredTransactions = React.useMemo(() => {
    if (selectedBankId === 'all') {
      return transactions
    }
    return transactions.filter(transaction => transaction.bank_id === selectedBankId)
  }, [transactions, selectedBankId])

  // Calculate totals for filtered transactions
  const filteredTotals = React.useMemo(() => {
    return filteredTransactions.reduce((acc, transaction) => {
      const amount = transaction.amount.amount
      if (transaction.credit_debit_indicator === 'CREDIT') {
        acc.income += amount
      } else {
        acc.spent += amount
      }
      return acc
    }, { income: 0, spent: 0 })
  }, [filteredTransactions])

  // Prepare chart data from filtered transactions
  const getChartData = () => {
    const monthlyData = filteredTransactions.reduce((acc: any, transaction) => {
      const date = new Date(transaction.booking_date_time)
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`
      
      if (!acc[monthYear]) {
        acc[monthYear] = { income: 0, spending: 0 }
      }
      
      if (transaction.credit_debit_indicator === 'CREDIT') {
        acc[monthYear].income += transaction.amount.amount
      } else {
        acc[monthYear].spending += transaction.amount.amount
      }
      
      return acc
    }, {})

    // Ensure we have at least 6 months of data points
    const now = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthYear = date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear()
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = { income: 0, spending: 0 }
      }
      months.push(monthYear)
    }
    
    return months.map(month => ({
      month,
      income: monthlyData[month].income || 0,
      spending: monthlyData[month].spending || 0
    }))
  }

  const chartData = getChartData()

  // Format value for chart tooltips
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  }

  return (
    <SaasProvider>
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
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
              <Box>
                <Heading size="lg" mb={2}>Transactions</Heading>
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
            </Box>
            
            {isLoading ? (
              <Box textAlign="center" py={10}>
                <Spinner size="xl" color="green.500" />
                <Text mt={4} color="gray.600">Loading transactions...</Text>
              </Box>
            ) : transactions.length > 0 ? (
              <>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                  <Card variant="unstyled" bg="white">
                    <CardBody height="200px" p={4}>
                      <Text fontSize="sm" fontWeight="medium" mb={3}>Monthly Trends</Text>
                      <Box height="155px" pl={4}>
                        <AreaChart
                          data={chartData}
                          categories={['income', 'spending']}
                          index="month"
                          height="155px"
                          valueFormatter={formatCurrency}
                          showLegend={true}
                          showGrid={true}
                          showYAxis={true}
                          colors={['#4299E1', '#F56565']}
                          minValue={0}
                          yAxisWidth={75}
                          margin={{ top: 20, right: 10, bottom: 20, left: 10 }}
                        />
                      </Box>
                    </CardBody>
                  </Card>

                  <Card variant="unstyled" bg="white">
                    <CardBody height="200px" p={4}>
                      <Text fontSize="sm" fontWeight="medium" mb={3}>Monthly Comparison</Text>
                      <Box height="155px" pl={4}>
                        <BarChart
                          data={chartData}
                          categories={['income', 'spending']}
                          index="month"
                          height="155px"
                          valueFormatter={formatCurrency}
                          showLegend={true}
                          showGrid={true}
                          showYAxis={true}
                          colors={['#48BB78', '#F56565']}
                          minValue={0}
                          yAxisWidth={75}
                          margin={{ top: 20, right: 10, bottom: 20, left: 10 }}
                        />
                      </Box>
                    </CardBody>
                  </Card>

                  <Card variant="unstyled" bg="white">
                    <CardBody height="200px" p={4} display="flex" alignItems="center">
                      <Box width="100%">
                        <Text fontSize="md" fontWeight="medium" mb={3}>
                          Total Spent: <Text as="span" color="gray.600">
                            ${filteredTotals.spent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </Text>
                        </Text>
                        <Text fontSize="md" fontWeight="medium" mb={3}>
                          Total Income: <Text as="span" color="gray.600">
                            ${filteredTotals.income.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </Text>
                        </Text>
                        <Text fontSize="md" fontWeight="medium">
                          Disposable Income: <Text as="span" color="gray.600">
                            ${(filteredTotals.income - filteredTotals.spent).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </Text>
                        </Text>
                      </Box>
                    </CardBody>
                  </Card>
                </SimpleGrid>

                {/* Transactions Section */}
                <Box mt={8}>
                  <Heading size="md" mb={2}>Recent Transactions</Heading>
                  <Text color="gray.600" mb={4} fontSize="md">
                    View your recent transaction history {selectedBankId !== 'all' ? 'for the selected bank' : 'across all connected bank accounts'}.
                  </Text>

                  <VStack spacing={4} align="stretch">
                    {filteredTransactions.map((transaction) => (
                      <Card 
                        key={transaction.transaction_id}
                        position="relative"
                        borderLeftWidth="4px"
                        borderLeftColor={transaction.credit_debit_indicator === 'CREDIT' ? 'green.400' : 'gray.400'}
                        overflow="hidden"
                      >
                        <CardBody py={3}>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Text fontSize="md" fontWeight="medium">{transaction.bank_name}</Text>
                              <Text fontSize="sm" color="gray.600">
                                {new Date(transaction.booking_date_time).toLocaleString()}
                              </Text>
                              <Text fontSize="sm" color="gray.400">
                                {transaction.transaction_information}
                              </Text>
                              <Text fontSize="sm" color="gray.400">
                                Transaction ID: {transaction.transaction_id}
                              </Text>
                            </Box>
                            <Text 
                              fontSize="md"
                              fontWeight="bold" 
                              color={transaction.credit_debit_indicator === 'CREDIT' ? 'green.500' : undefined}
                            >
                              {transaction.credit_debit_indicator === 'CREDIT' ? '+' : '-'}
                              {transaction.amount.amount.toLocaleString()} {transaction.amount.currency}
                            </Text>
                          </Box>
                        </CardBody>
                      </Card>
                    ))}
                  </VStack>
                </Box>
              </>
            ) : (
              <EmptyState
                title="No transactions available"
                description="Connect your bank account to start tracking your transactions."
                icon={LuWallet}
                actions={
                  <Button
                    colorScheme="primary"
                    size="lg"
                    leftIcon={<LuWallet />}
                    onClick={handleAddBankClick}
                  >
                    Add Bank Account
                  </Button>
                }
              />
            )}
          </Box>
        </Box>
      </Box>
    </SaasProvider>
  )
} 