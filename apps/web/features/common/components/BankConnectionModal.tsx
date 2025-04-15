'use client'

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  Text,
  VStack,
  Box,
  Spinner,
} from '@chakra-ui/react'
import { LuWallet } from 'react-icons/lu'
import { useBankConnection } from '#features/bank-integrations/context/bank-connection-context'
import { usePathname } from 'next/navigation'

export function BankConnectionModal() {
  const {
    showConnectionModal,
    redirectToBankIntegration,
    isRedirecting,
    initialCheckDone
  } = useBankConnection()
  
  const pathname = usePathname()
  
  // Don't show modal on banking-integration page
  if (pathname?.includes('banking-integration')) {
    return null
  }

  // Don't render anything until initial check is done
  if (!initialCheckDone) {
    return null
  }

  return (
    <>
      {/* Semi-transparent overlay for dashboard blur effect */}
      {(showConnectionModal || isRedirecting) && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          backdropFilter="blur(8px)"
          bg="rgba(255, 255, 255, 0.7)"
          zIndex={1400}
          transition="all 0.3s ease"
        />
      )}
      <Modal
        isOpen={showConnectionModal}
        onClose={() => {}}
        isCentered
        closeOnOverlayClick={false}
        closeOnEsc={false}
      >
        <ModalOverlay 
          backdropFilter="blur(8px)"
          backgroundColor="rgba(255, 255, 255, 0.3)"
        />
        <ModalContent
          position="relative"
          zIndex={1500}
          boxShadow="xl"
          borderRadius="xl"
          overflow="hidden"
          bg="white"
        >
          <ModalHeader textAlign="center">Welcome!</ModalHeader>
          <ModalBody pb={6}>
            <VStack spacing={6} align="center">
              <Box color="green.500">
                <LuWallet size={48} />
              </Box>
              
              {isRedirecting ? (
                <VStack spacing={4}>
                  <Spinner size="lg" color="green.500" />
                  <Text>Redirecting to bank connection page...</Text>
                </VStack>
              ) : (
                <>
                  <Text textAlign="center" fontSize="lg">
                    To get started, please connect your bank account to access all features.
                  </Text>
                  <Button
                    colorScheme="green"
                    size="lg"
                    leftIcon={<LuWallet />}
                    onClick={redirectToBankIntegration}
                    width="full"
                  >
                    Connect Bank Account
                  </Button>
                </>
              )}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
} 