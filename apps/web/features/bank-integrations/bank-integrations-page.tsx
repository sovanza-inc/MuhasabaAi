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

interface LeanSDKResponse {
  status: 'success' | 'error'
  connection_id?: string
  error_message?: string
  error_code?: string
  error_details?: object
}

interface Bank {
  identifier?: string;
  id?: string;
  name: string;
  arabic_name?: string | null;
  logo: string;
  logo_alt?: string;
  main_color?: string;
  background_color?: string;
  theme?: string;
  country_code: string;
  country_codes?: string[];
  active?: boolean;
  mock?: boolean;
  bank_type?: string;
  traits?: string[];
  supported_permissions?: string[];
  supported_account_types?: string[];
  transfer_limits?: {
    currency: string;
    min: number;
    max: number;
  }[];
  international_transfer_limits?: {
    currency: string;
    min: number;
    max: number;
  }[];
  international_destinations?: {
    country_iso_code: string;
    country_name: string;
    supported_currencies: string[];
  }[];
  account_type?: string;
  supported_account_sub_types?: string[];
  connection_type?: string;
  availability?: {
    active: {
      payments: boolean;
      data: boolean;
    };
    enabled: {
      payments: boolean;
      data: boolean;
    };
  };
}

interface BankConnection {
  id: string
  bank_id: string
  status: 'connected' | 'disconnected' | 'error'
  created_at: string
  last_synced_at?: string
  permissions?: string[]
  bank_name?: string
  bank_logo?: string
  account_count?: number
}

// Define Lean SDK types
interface LeanSDKEvent {
  type: string;
  data?: any;
}

interface LeanSDKError {
  message: string;
  code?: string;
}

interface LeanSDKConfig {
  app_token: string;
  sandbox: boolean;
  bank_identifier: string;
  customer_id: string;
  permissions: string[];
  container_id: string;
  onEvent: (event: LeanSDKEvent) => void;
  onError: (error: LeanSDKError) => void;
  ui?: {
    theme?: {
      primary_color?: string;
    };
    text?: {
      connect_title?: string;
      connect_subtitle?: string;
    };
  };
}

interface LeanLoader {
  init: (config: LeanSDKConfig) => void;
  open: () => void;
}

// Extend Window interface to include LeanLoader
declare global {
  interface Window {
    LeanLoader?: LeanLoader;
  }
}

export function BankIntegrationsPage() {
  const toast = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()

  // State
  const [isLoading, setIsLoading] = React.useState(false)
  const [authToken, setAuthToken] = React.useState<string | null>(null)
  const [customerId, setCustomerId] = React.useState<string | null>(null)
  const [banks, setBanks] = React.useState<Bank[]>([])
  const [connections, setConnections] = React.useState<BankConnection[]>([])
  const [selectedBank, setSelectedBank] = React.useState<Bank | null>(null)
  const [appName, setAppName] = React.useState('')
  const [selectedCountry, setSelectedCountry] = React.useState<'UAE' | 'SAU'>('UAE')
  const [step, setStep] = React.useState<'setup' | 'info' | 'banks' | 'connect'>('setup')
  const [sdkLoaded, setSdkLoaded] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Theme colors
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const hoverBg = useColorModeValue('gray.50', 'gray.700')
  const iconBg = useColorModeValue('blue.50', 'blue.900')
  const textColor = useColorModeValue('gray.600', 'gray.300')

  // Refs
  const scriptRef = React.useRef<HTMLScriptElement | null>(null)

  // Event Handlers
  const handleBankSelect = React.useCallback((bank: Bank) => {
    console.log('Bank selected:', bank)
    setSelectedBank(bank)
    setStep('connect')
  }, [])

  const handleInitialSetup = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/bank-integration/auth')

      if (!response.ok) {
        throw new Error('Failed to get authentication token')
      }

      const data = await response.json()
      setAuthToken(data.token)
      setCustomerId(data.customer_id)
      setStep('info')
    } catch (error) {
      console.error('Error in initial setup:', error)
      toast({
        title: 'Setup Failed',
        description: error instanceof Error ? error.message : 'Please try again',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const handleContinue = React.useCallback(async () => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/bank-integration/banks')
      
      if (!response.ok) {
        throw new Error('Failed to fetch banks')
      }
      
      const data = await response.json()
      console.log('Banks data:', data)
      
      // Handle the response format from the Lean SDK
      // The API might return an array directly or an object with a data property
      let banksArray = []
      
      if (Array.isArray(data)) {
        // Direct array response
        banksArray = data
        console.log('Received direct array of banks')
      } else if (data && typeof data === 'object') {
        if (data.data && Array.isArray(data.data)) {
          // Object with data property
          banksArray = data.data
          console.log('Received banks in data property')
        } else {
          // Some other object format
          console.log('Unexpected data format:', Object.keys(data))
          banksArray = data // Try to use whatever we got
        }
      }
      
      console.log('Processed banks array:', banksArray.length, 'banks')
      
      // Filter banks by country code
      const filteredBanks = banksArray.filter((bank: Bank) => {
        if (selectedCountry === 'UAE') {
          return bank.country_codes?.includes('AE') || bank.country_code === 'ARE'
        } else if (selectedCountry === 'SAU') {
          return bank.country_codes?.includes('SA') || bank.country_code === 'SAU'
        }
        return false
      })
      
      console.log('Filtered banks:', filteredBanks.length, 'banks for', selectedCountry)
      
      // Map the banks to ensure they have all required properties
      const mappedBanks = filteredBanks.map((bank: Bank) => {
        return {
          ...bank,
          // Ensure the bank has an identifier (use id as fallback if needed)
          identifier: bank.identifier || bank.id || `bank-${Math.random().toString(36).substring(2, 9)}`,
          // Ensure other required fields have defaults if missing
          name: bank.name || 'Unknown Bank',
          logo: bank.logo || 'https://via.placeholder.com/150',
          country_code: bank.country_code || (selectedCountry === 'UAE' ? 'ARE' : 'SAU'),
          active: bank.active !== undefined ? bank.active : true,
          mock: bank.mock !== undefined ? bank.mock : false
        }
      })
      
      console.log('Mapped banks:', mappedBanks.length, 'banks')
      
      setBanks(mappedBanks)
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
  }, [authToken, selectedCountry, toast])

  // Fetch auth token when needed
  React.useEffect(() => {
    const fetchAuthToken = async () => {
      if (step === 'banks' && selectedBank && !authToken) {
        try {
          setIsLoading(true)
          const response = await fetch('/api/bank-integration/auth')
          
          if (!response.ok) {
            throw new Error('Failed to get authentication token')
          }
          
          const data = await response.json()
          
          if (!data.token) {
            throw new Error('Invalid token response')
          }
          
          setAuthToken(data.token)
          setCustomerId(data.customer_id)
          console.log('Auth token received successfully')
        } catch (error) {
          console.error('Error fetching auth token:', error)
          toast({
            title: 'Authentication Error',
            description: error instanceof Error ? error.message : 'Failed to authenticate with bank API',
            status: 'error',
            duration: 5000,
            isClosable: true,
          })
        } finally {
          setIsLoading(false)
        }
      }
    }
    
    fetchAuthToken()
  }, [step, selectedBank, authToken, toast])

  // Function to load the Lean SDK
  const loadLeanSDK = React.useCallback(() => {
    if (typeof window === 'undefined') return
    
    console.log('Loading Lean SDK')
    
    // Remove any existing script to avoid duplicates
    if (scriptRef.current) {
      document.head.removeChild(scriptRef.current)
      scriptRef.current = null
      window.LeanLoader = undefined
    }
    
    // Create a new script element
    const script = document.createElement('script')
    script.src = 'https://cdn.leantech.me/link/loader/prod' // Always use production CDN URL as per memory
    script.async = true
    script.onload = () => {
      console.log('Lean SDK loaded successfully')
      setSdkLoaded(true)
    }
    script.onerror = (error) => {
      console.error('Error loading Lean SDK:', error)
      setError('Failed to load the bank connection SDK')
      setSdkLoaded(false)
    }
    
    // Add the script to the document
    document.head.appendChild(script)
    scriptRef.current = script
  }, [])

  // Function to fetch data for a bank connection
  const fetchConnectionData = React.useCallback(async (connectionId: string) => {
    if (!customerId) {
      console.error('Cannot fetch connection data: missing customer ID')
      return
    }
    
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/bank-integration/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionId,
          customerId,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch bank data')
      }
      
      const data = await response.json()
      console.log('Bank data received:', data)
      
      // Update the connection with additional data
      setConnections(prev => 
        prev.map(conn => 
          conn.id === connectionId
            ? {
                ...conn,
                last_synced_at: new Date().toISOString(),
                account_count: data.accounts?.length || 0,
              }
            : conn
        )
      )
      
      // Store the data for persistence
      try {
        localStorage.setItem(`bank_data_${connectionId}`, JSON.stringify(data))
      } catch (storageError) {
        console.error('Error storing bank data in localStorage:', storageError)
      }
      
      toast({
        title: 'Bank Connected',
        description: 'Your bank account has been successfully connected',
        status: 'success',
        duration: 5000,
        isClosable: true,
      })
    } catch (error) {
      console.error('Error fetching bank data:', error)
      
      toast({
        title: 'Connection Issue',
        description: 'Bank connected, but there was an issue fetching your data',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }, [customerId, toast, setIsLoading, setConnections])

  // Function to initialize the Lean SDK and open the connection flow
  const initializeAndOpenLeanSDK = React.useCallback(() => {
    if (!window.LeanLoader || !selectedBank || !authToken || !customerId) {
      console.error('Cannot initialize Lean SDK: missing dependencies')
      setError('Failed to initialize the bank connection')
      return
    }
    
    console.log('Initializing Lean SDK with bank:', selectedBank.identifier || selectedBank.id)
    
    try {
      // Create container for the SDK if it doesn't exist
      let container = document.getElementById('lean-connect-container')
      if (!container) {
        container = document.createElement('div')
        container.id = 'lean-connect-container'
        document.body.appendChild(container)
      }
      
      // Generate customer_id from app name as per memory
      const appNameForId = 'MuhasabaAI'
      
      // Initialize the Lean SDK with proper configuration
      window.LeanLoader.init({
        app_token: authToken,
        sandbox: process.env.NODE_ENV !== 'production', // Use sandbox flag for environment handling
        bank_identifier: selectedBank.identifier || selectedBank.id || '',
        customer_id: customerId,
        permissions: [
          'identity',
          'accounts',
          'balance',
          'transactions',
          'payments',
          'beneficiaries'
        ], // Required permissions as per memory
        container_id: 'lean-connect-container', // Container ID as per memory
        onEvent: (event: LeanSDKEvent) => {
          console.log('Lean SDK event:', event)
          
          if (event.type === 'exit') {
            console.log('User exited the flow')
            onClose()
          } else if (event.type === 'success') {
            console.log('Connection successful:', event.data)
            
            // Handle successful connection
            if (event.data && event.data.connection_id) {
              const newConnection: BankConnection = {
                id: event.data.connection_id,
                bank_id: (selectedBank.identifier || selectedBank.id || '').toString(),
                status: 'connected',
                created_at: new Date().toISOString(),
                bank_name: selectedBank.name,
                bank_logo: selectedBank.logo,
                permissions: [
                  'identity',
                  'accounts',
                  'balance',
                  'transactions',
                  'payments',
                  'beneficiaries'
                ]
              }
              
              setConnections(prev => [...prev, newConnection])
              
              // Fetch data for the new connection
              fetchConnectionData(event.data.connection_id)
              
              // Close the modal
              onClose()
            }
          }
        },
        onError: (error: LeanSDKError) => {
          console.error('Lean SDK error:', error)
          setError(`Bank connection error: ${error.message || 'Unknown error'}`)
          onClose()
        },
        ui: {
          theme: {
            primary_color: '#3182CE' // Chakra blue
          },
          text: {
            connect_title: 'Connect your bank account',
            connect_subtitle: 'Securely connect your bank account to MuhasabaAI'
          }
        }
      })
      
      // Open the SDK
      window.LeanLoader.open()
    } catch (error) {
      console.error('Error initializing Lean SDK:', error)
      setError('Failed to initialize the bank connection')
    }
  }, [selectedBank, authToken, customerId, onClose, fetchConnectionData])

  // Effects
  React.useEffect(() => {
    if (step === 'connect') {
      loadLeanSDK()
    }
  }, [step])

  React.useEffect(() => {
    if (sdkLoaded && step === 'connect') {
      initializeAndOpenLeanSDK()
    }
  }, [sdkLoaded, step])

  // Render banks grid
  const renderBanksGrid = React.useCallback(() => (
    <SimpleGrid columns={2} spacing={4}>
      {banks.map(bank => (
        <BankCard key={bank.identifier} bank={bank} />
      ))}
    </SimpleGrid>
  ), [banks])

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
                  Securely connect your bank account to MuhasabaAI
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
                          onClick={() => setSelectedCountry('SAU')}
                          colorScheme={selectedCountry === 'SAU' ? 'blue' : 'gray'}
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
                renderBanksGrid()
              )}
            </VStack>
          </Container>
        )

      case 'connect':
        return (
          <Box 
            id="lean-connect-container" 
            minH="500px" 
            w="100%" 
            bg={bgColor}
            borderRadius="md"
            overflow="hidden"
          />
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

  const BankCard = React.useCallback(({ bank }: { bank: Bank }) => {
    const bankLogo = useColorModeValue(bank.logo, bank.logo_alt || bank.logo)
    
    return (
      <Card
        key={bank.identifier || bank.id}
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
              src={bankLogo}
              alt={bank.name}
              height="40px"
              objectFit="contain"
            />
            <Text fontWeight="medium">{bank.name}</Text>
          </VStack>
        </CardBody>
      </Card>
    )
  }, [handleBankSelect])

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
              {connections.map((connection) => {
                // Try to get bank data from local storage
                let bankData: any = null;
                try {
                  const storedData = localStorage.getItem(`bank_connection_${connection.id}`);
                  if (storedData) {
                    bankData = JSON.parse(storedData);
                  }
                } catch (error) {
                  console.error('Error retrieving bank data:', error);
                }
                
                // Find the bank info from our banks list if available
                const bankInfo = banks.find(bank => bank.identifier === connection.bank_id);
                
                return (
                  <Card key={connection.id} variant="outline" shadow="md">
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        <HStack justifyContent="space-between" alignItems="center">
                          {bankInfo?.logo && (
                            <Image
                              src={useColorModeValue(bankInfo.logo, bankInfo.logo_alt)}
                              alt={bankInfo.name}
                              height="30px"
                              objectFit="contain"
                            />
                          )}
                          <Text 
                            fontWeight="bold" 
                            fontSize="lg"
                            ml={bankInfo?.logo ? 2 : 0}
                          >
                            {bankInfo?.name || connection.bank_name || connection.bank_id}
                          </Text>
                          <Box 
                            bg={connection.status === 'connected' ? 'green.100' : 'red.100'} 
                            color={connection.status === 'connected' ? 'green.700' : 'red.700'}
                            px={2}
                            py={1}
                            borderRadius="md"
                            fontSize="xs"
                            fontWeight="medium"
                            ml="auto"
                          >
                            {connection.status}
                          </Box>
                        </HStack>
                        
                        <Divider />
                        
                        {bankData && (
                          <>
                            <VStack align="start" spacing={1}>
                              <Text fontSize="sm" fontWeight="medium">Account Summary</Text>
                              <Text fontSize="sm" color={textColor}>
                                {bankData.accounts?.length || 0} account(s) connected
                              </Text>
                              {bankData.identity && (
                                <Text fontSize="sm" color={textColor}>
                                  Holder: {bankData.identity.name || 'N/A'}
                                </Text>
                              )}
                            </VStack>
                            
                            <HStack justifyContent="space-between">
                              <Text fontSize="xs" color={textColor}>
                                Connected: {new Date(connection.created_at).toLocaleDateString()}
                              </Text>
                              {connection.last_synced_at && (
                                <Text fontSize="xs" color={textColor}>
                                  Last synced: {new Date(connection.last_synced_at).toLocaleDateString()}
                                </Text>
                              )}
                            </HStack>
                            
                            <Button 
                              size="sm" 
                              colorScheme="blue" 
                              variant="outline"
                              onClick={() => {
                                // Here you would implement a function to view detailed bank data
                                console.log('View bank data:', bankData);
                                // For now, just show a toast
                                toast({
                                  title: 'Bank Data',
                                  description: 'Viewing bank data functionality coming soon',
                                  status: 'info',
                                  duration: 3000,
                                  isClosable: true,
                                });
                              }}
                            >
                              View Details
                            </Button>
                          </>
                        )}
                        
                        {!bankData && (
                          <VStack spacing={2}>
                            <Text fontSize="sm" color={textColor}>
                              Connection ID: {connection.id.substring(0, 8)}...
                            </Text>
                            <Text fontSize="sm" color={textColor}>
                              Status: {connection.status}
                            </Text>
                            <Text fontSize="xs" color={textColor}>
                              Connected: {new Date(connection.created_at).toLocaleDateString()}
                            </Text>
                          </VStack>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                );
              })}
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
        size="xl"
      >
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader borderBottomWidth="1px">
            {step === 'setup' ? 'Connect Your Bank' : 
             step === 'info' ? 'Link your account' : 
             step === 'banks' ? 'Select a bank' : 'Connect'}
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