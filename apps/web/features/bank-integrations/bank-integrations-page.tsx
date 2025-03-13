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
  useDisclosure,
  Spinner,
  Center,
  VStack,
  FormControl,
  FormLabel,
  Input,
  HStack,
  Box,
  Text,
  ButtonGroup,
  useColorModeValue,
  Container,
  Icon,
  Divider,
} from '@chakra-ui/react'

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

export function BankIntegrationsPage() {
  const toast = useToast()

  const [isLoading, setIsLoading] = React.useState(false)
  const [authToken, setAuthToken] = React.useState<string | null>(null)
  const [customerId, setCustomerId] = React.useState<string | null>(null)
  const [appUserId, setAppUserId] = React.useState<string | null>(null)
  const [customerToken, setCustomerToken] = React.useState<string | null>(null)
  const [showAppUserIdPopup, setShowAppUserIdPopup] = React.useState(false)
  const [appUserInput, setAppUserInput] = React.useState('')

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
            switch(event.type) {
              case 'success':
                toast({
                  title: 'Bank Connected',
                  description: 'Successfully connected your bank account',
                  status: 'success',
                  duration: 3000,
                  isClosable: true,
                });
                break;
              case 'exit':
                toast({
                  title: 'Connection Cancelled',
                  description: 'Bank connection process was cancelled',
                  status: 'info',
                  duration: 3000,
                  isClosable: true,
                });
                break;
              case 'error':
                console.error('Lean SDK error:', event);
                toast({
                  title: 'Connection Error',
                  description: 'Failed to connect bank account',
                  status: 'error',
                  duration: 5000,
                  isClosable: true,
                });
                break;
              default:
                console.log('Lean SDK event:', event);
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
      // Call the Lean Tech authentication API
      const authResponse = await fetch('/api/bank-integration/auth', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Check if authentication was successful
      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        throw new Error(errorData.error || 'Authentication failed');
      }
      
      const authData = await authResponse.json();
      
      // Set the authentication token
      setAuthToken(authData.access_token);
      
      // Show app user ID popup
      setShowAppUserIdPopup(true);
      
      toast({
        title: 'Authentication Successful',
        description: 'Please enter your App User ID',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      console.error('Bank Integration Setup Error:', error);
      
      toast({
        title: 'Authentication Failed',
        description: error instanceof Error ? error.message : 'Unable to authenticate',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Customer Creation Handler
  const handleCreateCustomer = React.useCallback(async () => {
    // Validate input
    if (!appUserInput.trim()) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid App User ID',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    // Ensure we have an auth token
    if (!authToken) {
      toast({
        title: 'Authentication Error',
        description: 'Please authenticate first',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    try {
      setIsLoading(true);

      // Call customer creation API through backend route
      const customerResponse = await fetch('/api/bank-integration/customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          app_user_id: appUserInput.trim()
        })
      });

      // Check if customer creation was successful
      if (!customerResponse.ok) {
        const errorData = await customerResponse.json();
        throw new Error(errorData.details || 'Failed to create customer');
      }

      const customerData = await customerResponse.json();
      
      // Set customer ID and app user ID from the response
      setCustomerId(customerData.customer_id);
      setAppUserId(customerData.app_user_id);

      // Immediately get customer access token
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

      // Close the popup
      setShowAppUserIdPopup(false);

      // Show success toast
      toast({
        title: 'Setup Complete',
        description: 'Initializing bank connection...',
        status: 'success',
        duration: 3000,
        isClosable: true
      });

    } catch (error) {
      console.error('Setup Error:', error);
      
      toast({
        title: 'Setup Failed',
        description: error instanceof Error ? error.message : 'Unable to complete setup',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
    }
  }, [authToken, appUserInput, toast]);

  // App User ID Modal
  const AppUserIdModal = React.useMemo(() => (
    <Modal 
      isOpen={showAppUserIdPopup} 
      onClose={() => setShowAppUserIdPopup(false)}
      size="sm"
    >
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent>
        <ModalHeader>Enter App User ID</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>App User ID</FormLabel>
              <Input 
                value={appUserInput}
                onChange={(e) => setAppUserInput(e.target.value)}
                placeholder="Enter your unique app user ID"
                size="lg"
              />
            </FormControl>
            <Button 
              colorScheme="blue" 
              size="lg" 
              width="full"
              onClick={handleCreateCustomer}
              isLoading={isLoading}
            >
              Confirm
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  ), [showAppUserIdPopup, appUserInput, isLoading, handleCreateCustomer]);

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
        {/* Container for Lean SDK - positioned absolutely to handle modal overlay */}
        <Box 
          id="lean-connect-container" 
          position="fixed"
          top="0"
          left="0"
          width="100%"
          height="100%"
          zIndex="modal"
          display="none" // Initially hidden, SDK will control visibility
        />

        {authToken ? (
          <Button 
            colorScheme="primary"
            size="lg"
            leftIcon={<LuWallet />}
            onClick={handleConnectBank}
            isLoading={isLoading}
          >
            Connect Bank
          </Button>
        ) : (
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
        {AppUserIdModal}
      </PageBody>
    </Page>
  )
}