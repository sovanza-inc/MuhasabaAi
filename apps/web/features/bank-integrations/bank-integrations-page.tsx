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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  FormControl,
  FormLabel,
  Input,
  HStack,
  Box,
  Text,
  Icon,
} from '@chakra-ui/react'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'

const NEXT_PUBLIC_LEAN_TECH_CLIENT_ID = '45be55bc-1025-41c5-a548-323ae5750d6c';

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

interface BankDetails {
  bankIdentifier: string;
  isSupported: boolean;
  connectedDate: string;
  status: string;
  message: string;
}

export function BankIntegrationsPage() {
  const toast = useToast()
  const [workspace] = useCurrentWorkspace()

  const [isLoading, setIsLoading] = React.useState(false)
  const [authToken, setAuthToken] = React.useState<string | null>(null)
  const [customerId, setCustomerId] = React.useState<string | null>(null)
  const [customerToken, setCustomerToken] = React.useState<string | null>(null)
  const [connectedBank, setConnectedBank] = React.useState<BankDetails | null>(null)

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
    if (customerId && customerToken && NEXT_PUBLIC_LEAN_TECH_CLIENT_ID && window.Lean?.connect) {
      try {
        window.Lean.connect({
          app_token: NEXT_PUBLIC_LEAN_TECH_CLIENT_ID,
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
              // Store bank details when connection is successful
              if (event.bank) {
                setConnectedBank({
                  bankIdentifier: event.bank.bank_identifier,
                  isSupported: event.bank.is_supported,
                  connectedDate: new Date().toLocaleDateString(),
                  status: 'Connected',
                  message: event.message
                });
              }
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
        hasAppToken: !!NEXT_PUBLIC_LEAN_TECH_CLIENT_ID,
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

          {connectedBank && (
            <Box
              bg="gray.100"
              p={4}
              borderRadius="lg"
              maxWidth="50%"
            >
              <HStack spacing={4}>
                <Box
                  bg="gray.200"
                  p={3}
                  borderRadius="md"
                >
                  <Icon as={LuWallet} boxSize={6} />
                </Box>
                <VStack align="start" spacing={1} flex={1}>
                  <Text fontWeight="medium" color="gray.800">
                    {connectedBank.bankIdentifier}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {connectedBank.status} • {connectedBank.connectedDate}
                  </Text>
                </VStack>
              </HStack>
            </Box>
          )}

          {!authToken && !connectedBank && (
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
      </PageBody>
    </Page>
  )
}