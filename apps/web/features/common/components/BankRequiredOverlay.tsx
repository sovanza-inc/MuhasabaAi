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
  // 1. Still loading
  // 2. Has bank connection
  // 3. On any banking-related pages
  // 4. UI shouldn't be restricted
  if (
    isLoading || 
    hasBankConnection || 
    pathname.includes('bank') || 
    !shouldRestrictUI
  ) {
    return null
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
      <VStack spacing={4} maxW="md" textAlign="center" p={6}>
        <LuWallet size={48} color="#1AB294" />
        <Text fontSize="xl" fontWeight="bold">
          Bank Connection Required
        </Text>
        <Text color="gray.600">
          Please connect at least one bank account to access all features of the application.
        </Text>
        <Button
          colorScheme="green"
          onClick={() => router.push(`/${workspace?.slug}/banking-integration`)}
          backgroundColor="#1AB294"
          _hover={{ backgroundColor: 'green.800' }}
        >
          Connect Bank Account
        </Button>
      </VStack>
    </Box>
  )
} 