'use client'

import React from 'react'
import { Box, Button, Text, VStack } from '@chakra-ui/react'
import { useBankConnection } from '#features/bank-integrations/context/bank-connection-context'
import { AppLayout, AppLayoutProps } from './app-layout'

export const RestrictedLayout: React.FC<AppLayoutProps> = ({
  children,
  sidebar,
  ...rest
}) => {
  const { shouldRestrictUI, isLoading, redirectToBankIntegration } = useBankConnection()

  return (
    <AppLayout
      sidebar={
        <Box
          as="nav"
          pointerEvents={shouldRestrictUI ? 'none' : 'auto'}
          filter={shouldRestrictUI ? 'blur(4px)' : 'none'}
          transition="all 0.3s ease"
        >
          {sidebar}
        </Box>
      }
      {...rest}
    >
      {shouldRestrictUI && !isLoading ? (
        <Box
          position="relative"
          height="100%"
        >
          <Box
            filter="blur(4px)"
            pointerEvents="none"
            height="100%"
          >
            {children}
          </Box>
          <VStack
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            spacing={4}
            textAlign="center"
            zIndex={1}
          >
            <Text fontSize="lg" fontWeight="medium">
              Please connect at least one bank to access this feature
            </Text>
            <Button
              colorScheme="green"
              onClick={redirectToBankIntegration}
            >
              Connect Bank
            </Button>
          </VStack>
        </Box>
      ) : (
        children
      )}
    </AppLayout>
  )
} 