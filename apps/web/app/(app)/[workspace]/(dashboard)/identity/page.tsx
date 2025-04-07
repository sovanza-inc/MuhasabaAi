'use client'

import { Box, Heading, Text, VStack, Spinner, useToast, Button } from '@chakra-ui/react'
import { Card, CardBody } from '@chakra-ui/react'
import { PageHeader } from '#features/common/components/page-header'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import React from 'react'
import { EmptyState } from '@saas-ui/react'
import { LuWallet, LuRefreshCw } from 'react-icons/lu'
import { useApiCache } from '#features/common/hooks/use-api-cache'
import { useQueryClient } from '@tanstack/react-query'

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
  const { CACHE_KEYS, prefetchData } = useApiCache()
  const queryClient = useQueryClient()
  const [workspace] = useCurrentWorkspace()
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
      const cacheKey = `${CACHE_KEYS.IDENTITY}_banks_${customerId}`
      return await prefetchData(
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
      const cacheKey = `${CACHE_KEYS.IDENTITY}_${customerId}_${entityId}`
      return await prefetchData(
        cacheKey,
        async () => {
          const response = await fetch(`/api/bank-integration/identity?entity_id=${entityId}`, {
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${authToken}`
            }
          })

          const data = await response.json()
          
          if (!response.ok) {
            throw new Error(data.details || 'Failed to fetch identity data')
          }

          setIdentityData(data)
          return data
        }
      )
    } catch (error) {
      console.error('Error fetching identity data:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch identity data')
      return null
    }
  }, [authToken, customerId, prefetchData])

  // Fetch data when auth is initialized
  const fetchData = React.useCallback(async () => {
    if (!customerId || !authToken) return;

    setIsLoading(true);
    setIsRetrying(false);
    try {
      // Check if we have cached data
      const cacheKey = `${CACHE_KEYS.IDENTITY}_all_${customerId}`
      const cachedData = queryClient.getQueryData([cacheKey])
      if (cachedData) {
        setIdentityData(cachedData as IdentityData)
        setIsLoading(false)
        return
      }

      const banks = await fetchConnectedBanks();
      if (banks && banks.length > 0) {
        const data = await fetchIdentityData(banks[0].id);
        if (data) {
          // Cache the complete identity data
          queryClient.setQueryData([cacheKey], data)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [customerId, authToken, fetchConnectedBanks, fetchIdentityData, queryClient]);

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
