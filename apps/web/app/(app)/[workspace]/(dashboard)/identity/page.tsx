'use client'

import { Box, Heading, Text, VStack, Spinner, useToast, Button } from '@chakra-ui/react'
import { Card, CardBody } from '@chakra-ui/react'
import { PageHeader } from '#features/common/components/page-header'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import { useApiCache } from '#features/common/hooks/use-api-cache'
import React from 'react'
import { EmptyState } from '@saas-ui/react'
import { LuWallet, LuRefreshCw } from 'react-icons/lu'

interface IdentityData {
  customerName: string;
  email: string;
  mobileNumber: string;
  gender: string;
  dateOfBirth: string;
  nationalId: string;
  address: string;
}

export default function IdentityPage() {
  const toast = useToast()
  const [workspace] = useCurrentWorkspace()
  const { CACHE_KEYS, prefetchData } = useApiCache()
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRetrying, setIsRetrying] = React.useState(false)
  const [identityData, setIdentityData] = React.useState<IdentityData | null>(null)
  const [authToken, setAuthToken] = React.useState<string | null>(null)
  const [customerId, setCustomerId] = React.useState<string | null>(null)
  const [connectedBanks, setConnectedBanks] = React.useState<any[]>([])
  const [error, setError] = React.useState<string | null>(null)

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
        setError('Failed to initialize authentication')
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

  // Fetch connected banks
  const fetchConnectedBanks = React.useCallback(async () => {
    if (!customerId || !authToken) return []

    try {
      // Create a unique cache key that includes the customer ID
      const cacheKey = `${CACHE_KEYS.IDENTITY}_banks_${customerId}`
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
      setError('Failed to fetch connected banks')
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

  // Fetch identity data for a bank
  const fetchIdentityData = React.useCallback(async (entityId: string) => {
    try {
      setError(null);
      console.log('Fetching identity data for entity:', entityId);
      
      // Create a unique cache key that includes both customer ID and entity ID
      const cacheKey = `${CACHE_KEYS.IDENTITY}_data_${customerId}_${entityId}`
      const cachedData = await prefetchData(
        cacheKey,
        async () => {
          const response = await fetch(`/api/bank-integration/identity?entity_id=${entityId}`, {
            headers: {
              'Accept': '*/*',
              'Authorization': `Bearer ${authToken}`
            }
          });

          const data = await response.json();
          console.log('Identity API response:', data);
          
          if (!response.ok || data.error) {
            throw new Error(data.details || data.error || 'Failed to fetch identity data');
          }

          return data;
        }
      )

      // Extract and format the identity data
      const identity = cachedData.data?.identities?.[0];
      if (!identity) {
        console.log('No identity data in response:', cachedData);
        throw new Error('No identity data available');
      }

      const regionalData = identity.regional_data?.data;
      const formattedData: IdentityData = {
        customerName: regionalData?.full_name || identity.full_legal_name || '',
        email: regionalData?.email_address || identity.email_address || '',
        mobileNumber: regionalData?.mobile_number || identity.mobile_number || '',
        gender: regionalData?.gender || '',
        dateOfBirth: regionalData?.birth_date || '',
        nationalId: regionalData?.national_identity_number || '',
        address: regionalData?.address || identity.address?.address_line || ''
      };

      setIdentityData(formattedData);
    } catch (error) {
      console.error('Error fetching identity data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch identity data');
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch identity data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setIdentityData(null);
    }
  }, [authToken, toast, customerId, prefetchData]);

  // Fetch data when auth is initialized
  const fetchData = React.useCallback(async () => {
    if (!customerId || !authToken) return;

    setIsLoading(true);
    setIsRetrying(false);
    try {
      const banks = await fetchConnectedBanks();
      if (banks && banks.length > 0) {
        await fetchIdentityData(banks[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [customerId, authToken, fetchConnectedBanks, fetchIdentityData]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRetry = async () => {
    setIsRetrying(true);
    await fetchData();
    setIsRetrying(false);
  };

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
          <Heading size="lg" mb={2}>Identity</Heading>
          <Text color="gray.600" mb={4} fontSize="md">
            Effortlessly view and manage your accounts in one place with real-time balance updates.
          </Text>

          {isLoading || isRetrying ? (
            <Box textAlign="center" py={10}>
              <Spinner size="xl" color="green.500" />
              <Text mt={4} color="gray.600">
                {isRetrying ? 'Retrying...' : 'Loading identity information...'}
              </Text>
            </Box>
          ) : !connectedBanks.length ? (
            <EmptyState
              title="No banks connected"
              description="Connect your bank account to view your identity information."
              icon={LuWallet}
            />
          ) : error ? (
            <EmptyState
              title="Failed to fetch identity data"
              description={error}
              icon={LuWallet}
              actions={
                <Button
                  leftIcon={<LuRefreshCw />}
                  onClick={handleRetry}
                  colorScheme="blue"
                >
                  Retry
                </Button>
              }
            />
          ) : identityData ? (
          <VStack spacing={4} align="stretch">
            {Object.entries(identityData).map(([key, value], index) => (
              <Card 
                key={index}
                position="relative"
                borderLeftWidth="4px"
                borderLeftColor="green.400"
                overflow="hidden"
              >
                <CardBody py={4} px={6}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Text fontSize="md" color="gray.600">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</Text>
                      <Text fontSize="md" fontWeight="medium">{value || 'N/A'}</Text>
                  </Box>
                </CardBody>
              </Card>
            ))}
          </VStack>
          ) : (
            <EmptyState
              title="No identity information available"
              description="We couldn't fetch your identity information. Please try again later."
              icon={LuWallet}
              actions={
                <Button
                  leftIcon={<LuRefreshCw />}
                  onClick={handleRetry}
                  colorScheme="blue"
                >
                  Retry
                </Button>
              }
            />
          )}
        </Box>
      </Box>
    </Box>
  )
}
