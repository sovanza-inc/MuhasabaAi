'use client'

import { Box, Heading, Text, SimpleGrid, Spinner, useToast, Button, VStack } from '@chakra-ui/react'
import { Card, CardBody } from '@chakra-ui/react'
import { PageHeader } from '#features/common/components/page-header'
import React from 'react'
import { EmptyState } from '@saas-ui/react'
import { LuWallet } from 'react-icons/lu'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import { useRouter } from 'next/navigation'

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
  accounts: AccountWithBalance[];
}

export default function AccountsPage() {
  const toast = useToast()
  const router = useRouter()
  const [workspace] = useCurrentWorkspace()
  const [isLoading, setIsLoading] = React.useState(true)
  const [bankAccounts, setBankAccounts] = React.useState<BankWithAccounts[]>([])
  const [authToken, setAuthToken] = React.useState<string | null>(null)
  const [customerId, setCustomerId] = React.useState<string | null>(null)

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
    if (!customerId || !authToken) return

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

  // Fetch balance for an account
  const fetchBalanceForAccount = React.useCallback(async (accountId: string, entityId: string) => {
    try {
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
    } catch (error) {
      console.error('Error fetching balance:', error)
      return null
    }
  }, [authToken])

  // Fetch all accounts and their balances
  React.useEffect(() => {
    const fetchAllAccounts = async () => {
      if (!customerId || !authToken) return

      setIsLoading(true)
      try {
        const connectedBanks = await fetchConnectedBanks()
        
        const banksWithAccounts: BankWithAccounts[] = []
        
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
          }

          if (accountsWithBalances.length > 0) {
            banksWithAccounts.push({
              id: bank.id,
              name: bank.bank_identifier || bank.name,
              accounts: accountsWithBalances
            })
          }
        }

        setBankAccounts(banksWithAccounts)
      } catch (error) {
        console.error('Error fetching all accounts:', error)
        toast({
          title: 'Error',
          description: 'Failed to fetch accounts',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (customerId && authToken) {
      fetchAllAccounts()
    }
  }, [customerId, authToken, fetchConnectedBanks, fetchAccountsForBank, fetchBalanceForAccount, toast])

  const handleAddBankClick = () => {
    router.push(`/${workspace.slug}/bank-integrations`)
  }

  const totalAccounts = bankAccounts.reduce((total, bank) => total + bank.accounts.length, 0)

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
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Heading size="lg" color="gray.900">
              Accounts Overview
            </Heading>
            <Text fontSize="md" color="gray.600">Total Accounts: {totalAccounts}</Text>
          </Box>
          <Text fontSize="md" color="gray.600" mb={4}>
            Manage your financial accounts and track your business transactions
          </Text>
        </Box>

        {isLoading ? (
          <Box textAlign="center" py={10}>
            <Spinner size="xl" color="green.500" />
            <Text mt={4} color="gray.600">Loading accounts...</Text>
          </Box>
        ) : bankAccounts.length > 0 ? (
          <VStack spacing={8} align="stretch">
            {bankAccounts.map((bank) => (
              <Box key={bank.id}>
                <Heading size="md" mb={4} color="gray.700">{bank.name}</Heading>
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
                  {bank.accounts.map((account) => (
            <Card 
                      key={account.account_id}
              borderRadius="lg"
              border="1px solid"
              borderColor="gray.100"
              boxShadow="sm"
              position="relative"
              overflow="hidden"
              _after={{
                content: '""',
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '2px',
                bgColor: 'green.400'
              }}
            >
              <CardBody py={4} px={6}>
                        <Text fontSize="md" fontWeight="medium" mb={3} color="gray.900">
                          {account.nickname || account.account_type || 'Bank Account'}
                        </Text>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                            <Text fontSize="md" color="gray.600">Type: {account.account_type || 'N/A'}</Text>
                            <Text fontSize="md" color="gray.600">Account ID: {account.account_id}</Text>
                  </Box>
                  <Box textAlign="right">
                    <Text fontSize="xl" fontWeight="bold" color="gray.900">
                              {account.balance?.balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                    </Text>
                    <Text fontSize="md" color="gray.600">{account.currency}</Text>
                  </Box>
                </Box>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
              </Box>
            ))}
          </VStack>
        ) : (
          <EmptyState
            title="No bank accounts connected"
            description="Connect your bank account to get started with financial management."
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
  )
}
