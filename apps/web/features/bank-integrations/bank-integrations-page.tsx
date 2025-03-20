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
  Image,
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

interface ConnectedAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  status: string;
  bank: {
    name: string;
    logo: string;
  };
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
  id: string;
  account_id: string;
  balance: number;
  currency: string;
  updated_at: string;
  type: string;
}

export function BankIntegrationsPage() {
  const toast = useToast()
  const [workspace] = useCurrentWorkspace()
  const [connectedAccounts, setConnectedAccounts] = React.useState<ConnectedAccount[]>([])
  const [connectedEntities, setConnectedEntities] = React.useState<ConnectedEntity[]>([])
  const [selectedBank, setSelectedBank] = React.useState<ConnectedEntity | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = React.useState(false);
  const [bankBalance, setBankBalance] = React.useState<BankBalance | null>(null);

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
      const response = await fetch(`/api/bank-integration/accounts?entity_id=${customerId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const data = await response.json();
      setConnectedEntities(data || []);
      setConnectedAccounts(data.data || []);
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

  const handleBankSelect = React.useCallback(async (bank: ConnectedEntity) => {
    setSelectedBank(bank);
    setIsBalanceLoading(true);
    setBankBalance(null);

    try {
      const response = await fetch(`/api/bank-integration/balance?account_id=${bank.id}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const data = await response.json();
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

          {/* Keep existing Connected Banks display */}
          {connectedAccounts.length > 0 && (
            <Box>
              <Text fontSize="xl" fontWeight="bold" mb={4}>Connected Banks</Text>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                {connectedAccounts.map((account) => (
                  <Box
                    key={account.id}
                    bg="white"
                    p={4}
                    borderRadius="lg"
                    boxShadow="sm"
                    border="1px"
                    borderColor="gray.200"
                  >
                    <HStack spacing={4}>
                      {account.bank.logo && (
                        <Image
                          src={account.bank.logo}
                          alt={account.bank.name}
                          width={40}
                          height={40}
                          borderRadius="md"
                        />
                      )}
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="medium">{account.bank.name}</Text>
                        <Text fontSize="sm" color="gray.600">{account.name}</Text>
                        <Text fontSize="sm" color="gray.500">
                          Balance: {account.balance} {account.currency}
                        </Text>
                        <Badge
                          colorScheme={account.status === 'active' ? 'green' : 'yellow'}
                        >
                          {account.status}
                        </Badge>
                      </VStack>
                    </HStack>
                  </Box>
                ))}
              </SimpleGrid>
            </Box>
          )}

          {!authToken && !connectedAccounts.length && !connectedEntities.length && (
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
              Bank Balance - {selectedBank?.bank_identifier}
            </DrawerHeader>
            <DrawerBody>
              <VStack spacing={4} align="stretch">
                {isBalanceLoading ? (
                  <Box textAlign="center" py={8}>
                    <Spinner size="xl" />
                    <Text mt={4}>Loading balance...</Text>
                  </Box>
                ) : bankBalance ? (
                  <>
                    <Box
                      p={6}
                      bg="white"
                      borderRadius="lg"
                      boxShadow="sm"
                      border="1px"
                      borderColor="gray.200"
                    >
                      <VStack spacing={3} align="start">
                        <Text color="gray.600">Account Balance</Text>
                        <Text fontSize="3xl" fontWeight="bold">
                          {bankBalance.balance.toLocaleString()} {bankBalance.currency}
                        </Text>
                        <HStack spacing={2}>
                          <Badge colorScheme="blue">{bankBalance.type}</Badge>
                          <Text fontSize="sm" color="gray.500">
                            Last updated: {new Date(bankBalance.updated_at).toLocaleString()}
                          </Text>
                        </HStack>
                      </VStack>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.600">Account Details</Text>
                      <SimpleGrid columns={2} spacing={4} mt={2}>
                        <Box>
                          <Text fontSize="xs" color="gray.500">Account ID</Text>
                          <Text fontSize="sm">{bankBalance.account_id}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.500">Balance ID</Text>
                          <Text fontSize="sm">{bankBalance.id}</Text>
                        </Box>
                      </SimpleGrid>
                    </Box>
                  </>
                ) : (
                  <EmptyState
                    title="No balance information"
                    description="Unable to fetch balance information for this account."
                    icon={LuWallet}
                  />
                )}
              </VStack>
            </DrawerBody>
          </DrawerContent>
        </Drawer>
      </PageBody>
    </Page>
  )
}