'use client'

import { Box, Button, Text, VStack } from '@chakra-ui/react'
import { useRouter, usePathname } from 'next/navigation'
import { LuWallet } from 'react-icons/lu'
import { useBankConnection } from '#features/bank-integrations/context/bank-connection-context'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'

export function BankRequiredOverlay() {
  const router = useRouter()
  const pathname = usePathname()
  const { hasBankConnection, isLoading, shouldRestrictUI } = useBankConnection()
  const [workspace] = useCurrentWorkspace()

  // Don't show overlay if:
  // 1. Still loading initial state
  // 2. Has bank connection
  // 3. On bank-integrations page
  // 4. UI shouldn't be restricted
  if (
    !pathname || // Wait for pathname to be available
    isLoading || 
    hasBankConnection || 
    pathname?.includes('bank-integrations') || 
    !shouldRestrictUI
  ) {
    return null
  }

  const handleConnectBank = () => {
    if (!workspace?.slug) return
    router.push(`/${workspace.slug}/bank-integrations`)
  }

  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      right="0"
      bottom="0"
      backdropFilter="blur(8px)"
      backgroundColor="rgba(255, 255, 255, 0.8)"
      zIndex="overlay"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <VStack spacing={4} maxW="md" textAlign="center" p={6} bg="white" borderRadius="lg" boxShadow="lg">
        <LuWallet size={48} color="#1AB294" />
        <Text fontSize="xl" fontWeight="bold">
          Please Connect Your Bank Account
        </Text>
        <Text color="gray.600">
          Connect at least one bank account to access this feature
        </Text>
        <Button
          colorScheme="green"
          onClick={handleConnectBank}
          backgroundColor="#1AB294"
          _hover={{ backgroundColor: 'green.600' }}
          isDisabled={!workspace?.slug}
        >
          Connect Bank
        </Button>
      </VStack>
    </Box>
  )
} 