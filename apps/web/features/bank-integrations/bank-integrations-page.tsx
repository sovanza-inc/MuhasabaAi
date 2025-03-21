'use client'

import * as React from 'react'
import {
  Page,
  PageBody,
  PageHeader,
  Toolbar,
} from '@saas-ui-pro/react'
import { EmptyState } from '@saas-ui/react'
import { LuWallet } from 'react-icons/lu'
import {
  Button,
  useToast,
  VStack,
  HStack,
  Box,
  Text,
  Icon,
  SimpleGrid,
  Badge,
  Spinner,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
} from '@chakra-ui/react'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'

// Lean Tech client ID for bank integration
const LEAN_TECH_CLIENT_ID = '45be55bc-1025-41c5-a548-323ae5750d6c';

// Define Lean SDK types
declare global {
  interface Window {
    Lean?: {
      connect: (config: {
        app_token: string;
        permissions: string[];
        customer_id: string;
        sandbox: boolean;
        access_token: string;
        container: string;
        callback?: (event: any) => void;
      }) => void;
    };
  }
}

interface BankPermissions {
  identity: boolean;
  accounts: boolean;
  balance: boolean;
  transactions: boolean;
  identities: boolean;
  scheduled_payments: boolean;
  standing_orders: boolean;
  direct_debits: boolean;
  beneficiaries: boolean;
}

interface ConnectedEntity {
  id: string;
  customer_id: string;
  bank_identifier: string;
  permissions: BankPermissions;
  bank_type: string;
  created_at: string;
}

interface BankBalance {
  account_id: string;
  balance: number;
  currency: string;
  type: string;
  credit_debit_indicator?: string;
  updated_at: string;
}

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
  servicer?: any;
  description?: string;
  maturity_date?: string | null;
  regional_data?: any;
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
}

export function BankIntegrationsPage() {
  const toast = useToast()
  const [workspace] = useCurrentWorkspace()
  const [connectedEntities, setConnectedEntities] = React.useState<ConnectedEntity[]>([])
  const [selectedBank, setSelectedBank] = React.useState<ConnectedEntity | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = React.useState(false);
  const [bankBalance, setBankBalance] = React.useState<BankBalance | null>(null);
  const [selectedAccount, setSelectedAccount] = React.useState<BankAccount | null>(null);
  const [transactions, setTransactions] = React.useState<BankTransaction[]>([]);
  const [isTransactionsLoading, setIsTransactionsLoading] = React.useState(false);

  const [isLoading, setIsLoading] = React.useState(false)
  const [authToken, setAuthToken] = React.useState<string | null>(null)
  const [customerId, setCustomerId] = React.useState<string | null>(null)
  const [customerToken, setCustomerToken] = React.useState<string | null>(null)

  // Initialize Lean SDK
  React.useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.leantech.me/link/loader/prod/ae/latest/lean-link-loader.min.js';
    script.async = true;
    script.onload = () => {
      console.log('Lean SDK loaded successfully');
    };
    script.onerror = (error) => {
      console.error('Error loading Lean SDK:', error);
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [])

  const initializeLeanConnect = React.useCallback(() => {
    if (customerId && customerToken && window.Lean?.connect) {
      try {
        window.Lean.connect({
          app_token: LEAN_TECH_CLIENT_ID,
          permissions: [
            "accounts",
            "balance", 
            "transactions"
          ],
          customer_id: customerId,
          sandbox: true,
          access_token: customerToken,
          container: 'lean-connect-container',
          callback: (event) => {
            console.log('Lean event:', event);
            // Check for success based on status and exit_point
            if (event.status === 'SUCCESS' && event.exit_point === 'SUCCESS') {
              toast({
                title: 'Bank Connected',
                description: event.message || 'Successfully connected your bank account',
                status: 'success',
                duration: 3000,
                isClosable: true,
              });
            } else if (event.exit_point === 'ERROR' || event.status === 'ERROR') {
              console.error('Lean SDK error:', event);
              toast({
                title: 'Connection Error',
                description: event.message || 'Failed to connect bank account',
                status: 'error',
                duration: 5000,
                isClosable: true,
              });
            } else if (event.exit_point) {
              // Handle any other exit points
              toast({
                title: 'Connection Cancelled',
                description: event.message || 'Bank connection process was cancelled',
                status: 'info',
                duration: 3000,
                isClosable: true,
              });
            }
          }
        });
      } catch (error) {
        console.error('Error initializing Lean connect:', error);
        toast({
          title: 'Connection Error',
          description: 'Failed to initialize bank connection',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } else {
      console.error('Missing required configuration for Lean connect:', {
        hasCustomerId: !!customerId,
        hasCustomerToken: !!customerToken,
        hasLeanSDK: !!window.Lean?.connect
      });
    }
  }, [customerId, customerToken, toast]);

  const handleConnectBank = React.useCallback(() => {
    initializeLeanConnect()
  }, [initializeLeanConnect])

  // Authentication Handler
  const handleAddBankIntegration = React.useCallback(async () => {
    setIsLoading(true)
    
    try {
      // Step 1: Authentication
      const authResponse = await fetch('/api/bank-integration/auth', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        throw new Error(errorData.error || 'Authentication failed');
      }
      
      const authData = await authResponse.json();
      setAuthToken(authData.access_token);

      // Step 2: Check if customer exists
      const customerCheckResponse = await fetch(`/api/bank-integration/get-customer?app_user_id=${workspace.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authData.access_token}`
        }
      });

      let customerData;
      
      if (customerCheckResponse.ok) {
        // Customer exists, use existing customer data
        customerData = await customerCheckResponse.json();
        setCustomerId(customerData.customer_id);
      } else {
        // Customer doesn't exist, create new customer
        const customerResponse = await fetch('/api/bank-integration/customer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authData.access_token}`
          },
          body: JSON.stringify({
            workspaceId: workspace.id
          })
        });

        if (!customerResponse.ok) {
          const errorData = await customerResponse.json();
          throw new Error(errorData.details || 'Failed to create customer');
        }

        customerData = await customerResponse.json();
        setCustomerId(customerData.customer_id);
      }

      // Step 3: Get customer token (needed in both cases)
      const tokenResponse = await fetch('/api/bank-integration/customer-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: customerData.customer_id
        })
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.details || 'Failed to get customer token');
      }

      const tokenData = await tokenResponse.json();
      setCustomerToken(tokenData.access_token);

      toast({
        title: 'Setup Complete',
        description: 'Initializing bank connection...',
        status: 'success',
        duration: 3000,
        isClosable: true
      });

    } catch (error) {
      console.error('Bank Integration Setup Error:', error);
      
      toast({
        title: 'Setup Failed',
        description: error instanceof Error ? error.message : 'Unable to setup bank integration',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
    }
  }, [workspace.id, toast]);

  // Fetch connected banks
  const fetchConnectedBanks = React.useCallback(async () => {
    if (!customerId || !authToken) return;

    try {
      const response = await fetch(`/api/bank-integration/accounts?customer_id=${customerId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const data = await response.json();
      setConnectedEntities(data || []);
    } catch (error) {
      console.error('Error fetching connected banks:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch connected banks',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  }, [customerId, authToken, toast]);

  // Fetch connected banks when customerId changes
  React.useEffect(() => {
    if (customerId && authToken) {
      fetchConnectedBanks();
    }
  }, [customerId, authToken, fetchConnectedBanks]);

  const fetchBalanceForAccount = React.useCallback(async (accountId: string, entityId: string) => {
    if (!accountId || !entityId) {
      console.error('Missing required parameters for balance fetch', { accountId, entityId });
      setIsBalanceLoading(false);
      return;
    }
    
    try {
      console.log(`Fetching balance for account: ${accountId} with entity: ${entityId}`);
      const response = await fetch(`/api/bank-integration/balance?account_id=${accountId}&entity_id=${entityId}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const data = await response.json();
      console.log('Balance API response:', data);
      
      if (response.ok) {
        setBankBalance(data);
      } else {
        toast({
          title: 'Error',
          description: data.details || 'Failed to fetch bank balance',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error fetching bank balance:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch bank balance',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsBalanceLoading(false);
    }
  }, [authToken, toast]);

  const fetchTransactionsForAccount = React.useCallback(async (accountId: string, entityId: string) => {
    if (!accountId || !entityId) {
      console.error('Missing required parameters for transactions fetch', { accountId, entityId });
      return;
    }
    
    setIsTransactionsLoading(true);
    
    try {
      console.log(`Fetching transactions for account: ${accountId} with entity: ${entityId}`);
      const response = await fetch(`/api/bank-integration/transactions?account_id=${accountId}&entity_id=${entityId}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const data = await response.json();
      
      if (response.ok && data.transactions) {
        setTransactions(data.transactions);
      } else {
        toast({
          title: 'Error',
          description: data.details || 'Failed to fetch transactions',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error fetching bank transactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch transactions',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsTransactionsLoading(false);
    }
  }, [authToken, toast]);

  const handleBankSelect = React.useCallback(async (bank: ConnectedEntity) => {
    setSelectedBank(bank);
    setIsBalanceLoading(true);
    setBankBalance(null);
    setSelectedAccount(null);
    setTransactions([]);

    try {
      console.log(`Fetching accounts for entity: ${bank.id}`);
      const accountsResponse = await fetch(`/api/bank-integration/fetch-accounts?entity_id=${bank.id}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const accountsData = await accountsResponse.json();
      console.log('Accounts API response:', accountsData);
      
      if (accountsResponse.ok) {
        const accounts = Array.isArray(accountsData) ? accountsData : 
                        (accountsData.data && Array.isArray(accountsData.data) ? accountsData.data : 
                        (accountsData.accounts && Array.isArray(accountsData.accounts) ? accountsData.accounts : []));
        
        console.log('Processed accounts:', accounts);
        
        if (accounts.length > 0) {
          const firstAccount = accounts[0];
          setSelectedAccount(firstAccount);
          
          const accountId = firstAccount.account_id || firstAccount.id;
          
          // Fetch both balance and transactions
          await Promise.all([
            fetchBalanceForAccount(accountId, bank.id),
            fetchTransactionsForAccount(accountId, bank.id)
          ]);
        } else {
          toast({
            title: 'No Accounts Found',
            description: 'No bank accounts were found for this entity',
            status: 'info',
            duration: 5000,
            isClosable: true,
          });
          setIsBalanceLoading(false);
          setIsTransactionsLoading(false);
        }
      } else {
        console.error('Error fetching accounts:', accountsData);
        toast({
          title: 'Error',
          description: accountsData.details?.message || accountsData.details || 'Failed to fetch bank accounts',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        setIsBalanceLoading(false);
        setIsTransactionsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch bank accounts',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setIsBalanceLoading(false);
      setIsTransactionsLoading(false);
    }
  }, [authToken, toast, fetchBalanceForAccount, fetchTransactionsForAccount]);

  return (
    <Page>
      <PageHeader 
        title="Bank Integrations" 
        toolbar={
          <Toolbar>
            <Button 
              colorScheme="primary"
              size="lg"
              leftIcon={<LuWallet />}
              onClick={handleAddBankIntegration}
              isLoading={isLoading}
            >
              Add Bank Integration
            </Button>
          </Toolbar>
        }
        description="Connect and manage your bank accounts securely"
      />
      <PageBody>
        {/* Container for Lean SDK */}
        <Box 
          id="lean-connect-container" 
          position="fixed"
          top="0"
          left="0"
          width="100%"
          height="100%"
          zIndex="modal"
          display="none"
        />

        <VStack spacing={4} align="stretch">
          {authToken && (
            <Button 
              colorScheme="primary"
              size="lg"
              leftIcon={<LuWallet />}
              onClick={handleConnectBank}
              isLoading={isLoading}
            >
              Connect Bank
            </Button>
          )}

          {/* Display Connected Entities */}
          {connectedEntities.length > 0 && (
            <Box>
              <Text fontSize="xl" fontWeight="bold" mb={4}>Connected Bank Entities</Text>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                {connectedEntities.map((entity) => (
                  <Box
                    key={entity.id}
                    bg="white"
                    p={4}
                    borderRadius="lg"
                    boxShadow="sm"
                    border="1px"
                    borderColor="gray.200"
                    cursor="pointer"
                    onClick={() => handleBankSelect(entity)}
                    _hover={{ borderColor: 'blue.500' }}
                  >
                    <VStack align="start" spacing={2}>
                      <HStack justify="space-between" width="100%">
                        <Badge colorScheme="blue">{entity.bank_type}</Badge>
                        <Text fontSize="sm" color="gray.500">
                          {new Date(entity.created_at).toLocaleDateString()}
                        </Text>
                      </HStack>
                      <Text fontWeight="medium">{entity.bank_identifier}</Text>
                      <Box>
                        <Text fontSize="sm" fontWeight="medium" mb={1}>Permissions:</Text>
                        <SimpleGrid columns={2} spacing={2}>
                          {Object.entries(entity.permissions).map(([key, value]) => (
                            <HStack key={key} spacing={1}>
                              <Icon
                                as={value ? LuWallet : LuWallet}
                                color={value ? "green.500" : "red.500"}
                              />
                              <Text fontSize="xs" color="gray.600">
                                {key.replace(/_/g, ' ')}
                              </Text>
                            </HStack>
                          ))}
                        </SimpleGrid>
                      </Box>
                    </VStack>
                  </Box>
                ))}
              </SimpleGrid>
            </Box>
          )}

          {!authToken && !connectedEntities.length && (
            <EmptyState
              title="No bank integrations yet"
              description="Connect your bank account to get started with financial management."
              icon={LuWallet}
              actions={
                <Button
                  colorScheme="primary"
                  size="lg"
                  leftIcon={<LuWallet />}
                  onClick={handleAddBankIntegration}
                  isLoading={isLoading}
                >
                  Add Bank Integration
                </Button>
              }
            />
          )}
        </VStack>

        {/* Bank Balance Drawer */}
        <Drawer
          isOpen={!!selectedBank}
          onClose={() => setSelectedBank(null)}
          placement="right"
          size="md"
        >
          <DrawerOverlay />
          <DrawerContent>
            <DrawerCloseButton />
            <DrawerHeader>
              Bank Details - {selectedBank?.bank_identifier}
            </DrawerHeader>
            <DrawerBody>
              <VStack spacing={4} align="stretch">
                {/* Balance Information Section */}
                <Box>
                  <Text fontSize="lg" fontWeight="medium" mb={3}>Balance Information</Text>
                  {isBalanceLoading ? (
                    <Box textAlign="center" py={4}>
                      <Spinner size="md" />
                      <Text mt={2}>Loading balance...</Text>
                    </Box>
                  ) : bankBalance ? (
                    <Box
                      p={5}
                      bg="white"
                      borderRadius="lg"
                      boxShadow="sm"
                      border="1px"
                      borderColor="gray.200"
                    >
                      <VStack spacing={4} align="start">
                        <Text fontSize="sm" color="gray.600">Account Balance</Text>
                        <HStack spacing={2} align="center">
                          <Icon as={LuWallet} boxSize={6} color="blue.500" />
                          <Text fontSize="2xl" fontWeight="bold">
                            {typeof bankBalance.balance === 'number' 
                              ? bankBalance.balance.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                }) 
                              : bankBalance.balance} {bankBalance.currency}
                          </Text>
                        </HStack>
                        <Box width="100%">
                          <Text fontSize="xs" color="gray.500">
                            Last updated: {new Date(bankBalance.updated_at).toLocaleString()}
                          </Text>
                        </Box>
                      </VStack>
                    </Box>
                  ) : (
                    <EmptyState
                      title="No balance information"
                      description="Unable to fetch balance information for this account."
                      icon={LuWallet}
                    />
                  )}
                </Box>

                {/* Account Details Section */}
                {selectedAccount && (
                  <Box mt={4}>
                    <Text fontSize="lg" fontWeight="medium" mb={3}>Account Details</Text>
                    <Box
                      p={4}
                      bg="white"
                      borderRadius="lg"
                      boxShadow="sm"
                      border="1px"
                      borderColor="gray.200"
                    >
                      <SimpleGrid columns={2} spacing={4}>
                        <Box>
                          <Text fontSize="xs" color="gray.500">Account ID</Text>
                          <Text fontSize="sm" fontFamily="mono">
                            {selectedAccount.account_id}
                          </Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.500">Currency</Text>
                          <Text fontSize="sm">
                            {selectedAccount.currency}
                          </Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.500">Status</Text>
                          <Badge colorScheme={selectedAccount.status === "ENABLED" ? "green" : "yellow"}>
                            {selectedAccount.status}
                          </Badge>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.500">Account Type</Text>
                          <Text fontSize="sm">
                            {selectedAccount.account_type || "N/A"}
                          </Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.500">Account Sub Type</Text>
                          <Text fontSize="sm">
                            {selectedAccount.account_sub_type || "N/A"}
                          </Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.500">Nickname</Text>
                          <Text fontSize="sm">
                            {selectedAccount.nickname || "N/A"}
                          </Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.500">Description</Text>
                          <Text fontSize="sm">
                            {selectedAccount.description || "N/A"}
                          </Text>
                        </Box>
                      </SimpleGrid>
                      
                      {/* Account Numbers */}
                      {selectedAccount.account && selectedAccount.account.length > 0 && (
                        <Box mt={4}>
                          <Text fontSize="sm" fontWeight="medium" mb={2}>Account Numbers</Text>
                          <VStack align="start" spacing={2}>
                            {selectedAccount.account.map((acc, index) => {
                              if (acc.scheme_name === "IBAN") {
                                return (
                                  <Box key={index} width="100%">
                                    <Text fontSize="xs" color="gray.500">IBAN</Text>
                                    <Text fontSize="sm" fontFamily="mono">{acc.identification}</Text>
                                  </Box>
                                );
                              }
                              if (acc.scheme_name === "BBAN") {
                                return (
                                  <Box key={index} width="100%">
                                    <Text fontSize="xs" color="gray.500">BBAN</Text>
                                    <Text fontSize="sm" fontFamily="mono">{acc.identification}</Text>
                                  </Box>
                                );
                              }
                              return (
                                <Box key={index} width="100%">
                                  <Text fontSize="xs" color="gray.500">{acc.scheme_name}</Text>
                                  <Text fontSize="sm" fontFamily="mono">{acc.identification}</Text>
                                </Box>
                              );
                            })}
                          </VStack>
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}

                {/* Transactions Section */}
                <Box mt={4}>
                  <Text fontSize="lg" fontWeight="medium" mb={3}>Recent Transactions</Text>
                  {isTransactionsLoading ? (
                    <Box textAlign="center" py={4}>
                      <Spinner size="md" />
                      <Text mt={2}>Loading transactions...</Text>
                    </Box>
                  ) : transactions.length > 0 ? (
                    <Box
                      maxH="400px"
                      overflowY="auto"
                      bg="white"
                      borderRadius="lg"
                      boxShadow="sm"
                      border="1px"
                      borderColor="gray.200"
                    >
                      <VStack spacing={0} align="stretch">
                        {transactions.map((transaction, index) => (
                          <Box
                            key={transaction.transaction_id}
                            p={4}
                            borderBottomWidth={index < transactions.length - 1 ? 1 : 0}
                            borderColor="gray.100"
                          >
                            <HStack justify="space-between" align="start">
                              <VStack align="start" spacing={1}>
                                <Text fontSize="sm" fontWeight="medium">
                                  {transaction.transaction_information}
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                  {new Date(transaction.booking_date_time).toLocaleString()}
                                </Text>
                                {transaction.transaction_reference && (
                                  <Text fontSize="xs" color="gray.500">
                                    Ref: {transaction.transaction_reference}
                                  </Text>
                                )}
                              </VStack>
                              <Box textAlign="right">
                                <Text
                                  fontSize="sm"
                                  fontWeight="medium"
                                  color={transaction.credit_debit_indicator === 'CREDIT' ? 'green.500' : 'red.500'}
                                >
                                  {transaction.credit_debit_indicator === 'CREDIT' ? '+' : '-'}
                                  {transaction.amount.amount.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })} {transaction.amount.currency}
                                </Text>
                                <Badge
                                  size="sm"
                                  colorScheme={transaction.status === 'BOOKED' ? 'green' : 'yellow'}
                                >
                                  {transaction.status}
                                </Badge>
                              </Box>
                            </HStack>
                          </Box>
                        ))}
                      </VStack>
                    </Box>
                  ) : (
                    <EmptyState
                      title="No transactions"
                      description="No recent transactions found for this account."
                      icon={LuWallet}
                    />
                  )}
                </Box>
              </VStack>
            </DrawerBody>
          </DrawerContent>
        </Drawer>
      </PageBody>
    </Page>
  )
}