'use client'

import * as React from 'react'
import {
  Page,
  PageBody,
  PageHeader,
  Toolbar,
} from '@saas-ui-pro/react'
import { EmptyState } from '@saas-ui/react'
import { LuWallet, LuShieldCheck, LuLock } from 'react-icons/lu'
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
  Image,
  ButtonGroup,
  useColorModeValue,
  Container,
  Icon,
  Divider,
  SimpleGrid,
  Card,
  CardBody,
} from '@chakra-ui/react'

interface Bank {
  identifier: string
  name: string
  logo: string
  logo_alt: string
  country_code: string
  active: boolean
  mock: boolean
  bank_type: string
}

interface BankConnection {
  id: string 
  bank_id: string
  status: 'connected' | 'disconnected' | 'error'
  created_at: string
}

interface LeanSDKResponse {
  status: 'success' | 'error'
  connection_id?: string
  error_message?: string
}

declare global {
  interface Window {
    LeanLoader?: {
      init: (config: {
        app_token: string
        bank_identifier: string
        permissions: string[]
        sandbox: boolean
        customization?: {
          bank_credentials?: {
            title: string
            message: string
          }
          permissions?: {
            title: string
            message: string
            action_text: string
          }
          success?: {
            title: string
            message: string
            action_text: string
          }
        }
        callback: (response: LeanSDKResponse) => void
      }) => void
      connect: (options: { container_id: string }) => void
    }
  }
}

export function BankIntegrationsPage() {
  const toast = useToast()
  const [isLoading, setIsLoading] = React.useState(false)
  const [authToken, setAuthToken] = React.useState<string | null>(null)
  const [banks, setBanks] = React.useState<Bank[]>([])
  const [connections, setConnections] = React.useState<BankConnection[]>([])
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [appName, setAppName] = React.useState('')
  const [selectedCountry, setSelectedCountry] = React.useState<'UAE' | 'KSA'>('UAE')
  const [step, setStep] = React.useState<'setup' | 'info' | 'banks'>('setup')

  // Theme colors
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const hoverBg = useColorModeValue('gray.50', 'gray.700')
  const iconBg = useColorModeValue('blue.50', 'blue.900')
  const textColor = useColorModeValue('gray.600', 'gray.300')

  // Load Lean Tech SDK
  React.useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdn.leantech.me/link/loader/prod'
    script.async = true
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const handleInitialSetup = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/bank-integration/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throw new Error('Failed to authenticate with bank integration service')
      }

      const data = await response.json()
      setAuthToken(data.access_token)
      setStep('info')
      onOpen()
    } catch (error) {
      console.error('Bank integration error:', error)
      toast({
        title: 'Authentication failed',
        description: error instanceof Error ? error.message : 'Failed to connect to banking service',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinue = async () => {
    try {
      setIsLoading(true)
      console.log('Fetching banks for', selectedCountry)
      const response = await fetch('/api/bank-integration/banks', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json'
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch available banks')
      }

      const data = await response.json()
      console.log('Banks data:', data)
      
      // Filter banks by country code
      const filteredBanks = data.filter((bank: Bank) => 
        selectedCountry === 'UAE' ? bank.country_code === 'ARE' : bank.country_code === 'SAU'
      )
      console.log('Filtered banks:', filteredBanks)
      
      setBanks(filteredBanks)
      setStep('banks')
    } catch (error) {
      console.error('Error fetching banks:', error)
      toast({
        title: 'Failed to fetch banks',
        description: error instanceof Error ? error.message : 'Please try again',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBankSelect = (bank: Bank) => {
    if (!window.LeanLoader || !authToken) return

    window.LeanLoader.init({
      app_token: authToken,
      bank_identifier: bank.identifier,
      permissions: [
        'identity',
        'accounts',
        'balance', 
        'transactions',
        'payments'
      ],
      sandbox: true,
      customization: {
        bank_credentials: {
          title: bank.name,
          message: `Enter your ${bank.name} credentials.`
        },
        permissions: {
          title: 'Permissions',
          message: `${appName} is requesting the following information from your bank account.`,
          action_text: 'Allow'
        },
        success: {
          title: 'Link successful',
          message: `Your ${bank.name} accounts are connected with ${appName}.`,
          action_text: 'Done'
        }
      },
      callback: (response: LeanSDKResponse) => {
        console.log('Lean SDK Response:', response)
        if (response.status === 'success') {
          toast({
            title: 'Bank connected successfully',
            status: 'success',
            duration: 5000,
            isClosable: true,
          })
          // Add the new connection
          setConnections(prev => [...prev, {
            id: response.connection_id as string,
            bank_id: bank.identifier,
            status: 'connected',
            created_at: new Date().toISOString()
          }])
          onClose()
        } else {
          toast({
            title: 'Failed to connect bank',
            description: response.error_message || 'Please try again',
            status: 'error',
            duration: 5000,
            isClosable: true,
          })
        }
      },
    })

    window.LeanLoader.connect({
      container_id: 'lean-connect-container',
    })
  }

  const renderStep = () => {
    switch (step) {
      case 'setup':
        return (
          <Container maxW="md" py={8}>
            <VStack spacing={8} align="stretch">
              <VStack spacing={3}>
                <Icon as={LuWallet} boxSize={12} color="blue.500" />
                <Text fontSize="2xl" fontWeight="bold" textAlign="center">
                  Connect Your Bank Account
                </Text>
                <Text color={textColor} textAlign="center">
                  Securely connect your bank account to start managing your finances
                </Text>
              </VStack>
              
              <Card variant="outline">
                <CardBody>
                  <VStack spacing={6}>
                    <FormControl>
                      <FormLabel>Application Name</FormLabel>
                      <Input 
                        value={appName}
                        onChange={(e) => setAppName(e.target.value)}
                        placeholder="Finalley"
                        size="lg"
                        bg={bgColor}
                      />
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>Application Icon</FormLabel>
                      <Input 
                        type="file" 
                        accept="image/*"
                        size="lg"
                        p={2}
                        bg={bgColor}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Choose Country</FormLabel>
                      <ButtonGroup isAttached width="100%">
                        <Button
                          flex={1}
                          onClick={() => setSelectedCountry('UAE')}
                          colorScheme={selectedCountry === 'UAE' ? 'blue' : 'gray'}
                          size="lg"
                        >
                          UAE
                        </Button>
                        <Button
                          flex={1}
                          onClick={() => setSelectedCountry('KSA')}
                          colorScheme={selectedCountry === 'KSA' ? 'blue' : 'gray'}
                          size="lg"
                        >
                          KSA
                        </Button>
                      </ButtonGroup>
                    </FormControl>
                  </VStack>
                </CardBody>
              </Card>

              <Button
                size="lg"
                colorScheme="blue"
                onClick={handleInitialSetup}
                isLoading={isLoading}
              >
                Connect Account
              </Button>
            </VStack>
          </Container>
        )

      case 'info':
        return (
          <Container maxW="md" py={8}>
            <VStack spacing={8} align="stretch">
              <VStack spacing={4}>
                <Box
                  p={4}
                  bg={iconBg}
                  borderRadius="full"
                >
                  <Icon as={LuShieldCheck} boxSize={8} color="blue.500" />
                </Box>
                <Text fontSize="2xl" fontWeight="bold" textAlign="center">
                  Link your account
                </Text>
                <Text color={textColor} textAlign="center">
                  {appName} uses Lean to securely connect to your bank account
                </Text>
              </VStack>

              <Card variant="outline">
                <CardBody>
                  <VStack spacing={6} align="stretch">
                    <HStack spacing={4}>
                      <Box p={3} bg="green.100" borderRadius="md">
                        <Icon as={LuLock} color="green.500" />
                      </Box>
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="medium">100% Private</Text>
                        <Text fontSize="sm" color={textColor}>
                          Your credentials are never accessible to this or any other service
                        </Text>
                      </VStack>
                    </HStack>

                    <Divider />

                    <HStack spacing={4}>
                      <Box p={3} bg="blue.100" borderRadius="md">
                        <Icon as={LuShieldCheck} color="blue.500" />
                      </Box>
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="medium">Protected data</Text>
                        <Text fontSize="sm" color={textColor}>
                          Your data is secured using bank-grade TLS 1.2 technology
                        </Text>
                      </VStack>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>

              <Button
                size="lg"
                colorScheme="blue"
                onClick={handleContinue}
                isLoading={isLoading}
              >
                Continue
              </Button>
            </VStack>
          </Container>
        )

      case 'banks':
        return (
          <Container maxW="xl" py={8}>
            <VStack spacing={6} align="stretch">
              <VStack spacing={2}>
                <Text fontSize="2xl" fontWeight="bold">
                  Select a bank
                </Text>
                <Text color={textColor}>
                  Choose which bank to connect with {appName}
                </Text>
              </VStack>

              {isLoading ? (
                <Center py={8}>
                  <Spinner size="xl" color="blue.500" />
                </Center>
              ) : banks.length === 0 ? (
                <Card variant="outline">
                  <CardBody>
                    <Center py={8}>
                      <VStack spacing={3}>
                        <Icon as={LuWallet} boxSize={8} color="gray.400" />
                        <Text color={textColor}>No banks available for the selected country</Text>
                      </VStack>
                    </Center>
                  </CardBody>
                </Card>
              ) : (
                <SimpleGrid columns={2} spacing={4}>
                  {banks.map((bank) => (
                    <Card
                      key={bank.identifier}
                      variant="outline"
                      cursor="pointer"
                      onClick={() => handleBankSelect(bank)}
                      _hover={{
                        transform: 'translateY(-2px)',
                        shadow: 'md',
                        borderColor: 'blue.500',
                      }}
                      transition="all 0.2s"
                    >
                      <CardBody>
                        <VStack spacing={4}>
                          <Image
                            src={useColorModeValue(bank.logo, bank.logo_alt)}
                            alt={bank.name}
                            height="40px"
                            objectFit="contain"
                          />
                          <Text fontWeight="medium">{bank.name}</Text>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              )}

              <Box id="lean-connect-container" minH="500px" w="100%" />
            </VStack>
          </Container>
        )
    }
  }

  const toolbar = (
    <Toolbar>
      <Button 
        colorScheme="primary"
        size="lg"
        leftIcon={<LuWallet />}
        onClick={() => {
          setStep('setup')
          onOpen()
        }}
      >
        Add Bank Integration
      </Button>
    </Toolbar>
  )

  return (
    <>
      <Page>
        <PageHeader 
          title="Bank Integrations" 
          toolbar={toolbar}
          description="Connect and manage your bank accounts securely"
        />
        <PageBody>
          {connections.length > 0 ? (
            <SimpleGrid columns={3} spacing={6} p={4}>
              {connections.map((connection) => (
                <Card key={connection.id} variant="outline">
                  <CardBody>
                    <VStack spacing={3}>
                      <Text fontWeight="medium">
                        Connected Bank
                      </Text>
                      <Text fontSize="sm" color={textColor}>
                        ID: {connection.bank_id}
                      </Text>
                      <Text fontSize="sm" color={textColor}>
                        Status: {connection.status}
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          ) : (
            <EmptyState
              title="No bank integrations yet"
              description="Connect your bank account to get started with financial management."
              colorScheme="primary"
              icon={LuWallet}
              actions={
                <Button 
                  colorScheme="primary"
                  size="lg"
                  leftIcon={<LuWallet />}
                  onClick={() => {
                    setStep('setup')
                    onOpen()
                  }}
                >
                  Add Bank Integration
                </Button>
              }
            />
          )}
        </PageBody>
      </Page>

      <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        size={step === 'banks' ? 'xl' : 'md'}
        scrollBehavior="inside"
      >
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader borderBottomWidth="1px">
            {step === 'setup' ? 'Connect Your Bank' : 
             step === 'info' ? 'Link your account' : 
             'Select a bank'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody p={0}>
            {renderStep()}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}