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
  Stack,
  Heading,
} from '@chakra-ui/react'

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

declare global {
  interface Window {
    Lean?: {
      close: any
      link: (config: any) => void;
      connect: (config: any) => void;
      reconnect: (config: any) => void;
      createPaymentSource: (config: any) => void;
      updatePaymentSource: (config: any) => void;
      pay: (config: any) => void;
    };
  }
}

const LeanSDKWrapper: React.FC<{
  authToken: string;
  customerId: string;
  selectedBank: Bank;
  onSuccess: (connectionId: string) => void;
  onExit: () => void;
}> = ({ authToken, customerId, selectedBank, onSuccess, onExit }) => {
  const isMountedRef = React.useRef(true);
  
  React.useEffect(() => {
    isMountedRef.current = true;
    
    const initializeLeanSDK = () => {
      if (!window.Lean) {
        console.error('Lean SDK not available');
        return;
      }
      
      try {
        console.log('Initializing Lean SDK with:', {
          bankIdentifier: selectedBank.identifier || selectedBank.id,
          customerId,
          sandbox: process.env.NODE_ENV !== 'production'
        });
        
        const config = {
          app_token: authToken,
          customer_id: customerId,
          permissions: ["identity", "accounts", "balance", "transactions", "payments", "beneficiaries"],
          sandbox: process.env.NODE_ENV !== 'production',
          bank_identifier: selectedBank.identifier || selectedBank.id,
          callback: (event: any) => {
            console.log('Lean SDK event:', event);
            
            if (!isMountedRef.current) return;
            
            if (event.type === 'exit') {
              console.log('User exited the flow');
              onExit();
            } else if (event.type === 'success') {
              console.log('Connection successful:', event.data);
              
              if (event.data && event.data.connection_id) {
                onSuccess(event.data.connection_id);
              }
            }
          }
        };
        
        if (typeof window.Lean.connect === 'function') {
          window.Lean.connect(config);
        } else if (typeof window.Lean.link === 'function') {
          window.Lean.link(config);
        } else {
          console.error('Neither Lean.connect nor Lean.link methods are available');
        }
      } catch (error) {
        console.error('Error initializing Lean SDK:', error);
      }
    };
    
    const timeoutId = setTimeout(initializeLeanSDK, 100);
    
    return () => {
      isMountedRef.current = false;
      clearTimeout(timeoutId);
      
      try {
        if (window.Lean && typeof window.Lean.close === 'function') {
          window.Lean.close();
        }
      } catch (e) {
        console.error('Error cleaning up Lean SDK:', e);
      }
    };
  }, [authToken, customerId, selectedBank, onSuccess, onExit]);
  
  return null;
};

export function BankIntegrationsPage() {
  const toast = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()

  const [isLoading, setIsLoading] = React.useState(false)
  const [authToken, setAuthToken] = React.useState<string | null>(null)
  const [customerId, setCustomerId] = React.useState<string | null>(null)
  const [banks, setBanks] = React.useState<Bank[]>([])
  const [connections, setConnections] = React.useState<BankConnection[]>([])
  const [selectedBank, setSelectedBank] = React.useState<Bank | null>(null)
  const [appName, setAppName] = React.useState('')
  const [selectedCountry, setSelectedCountry] = React.useState<'UAE' | 'SAU'>('UAE')
  const [step, setStep] = React.useState<'setup' | 'info' | 'banks' | 'connect'>('setup')
  const [error, setError] = React.useState<string | null>(null)
  const [showLeanSDK, setShowLeanSDK] = React.useState(false)

  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const iconBg = useColorModeValue('blue.50', 'blue.900')
  const textColor = useColorModeValue('gray.600', 'gray.300')

  const scriptRef = React.useRef<HTMLScriptElement | null>(null)

  const handleBankSelect = React.useCallback((bank: Bank) => {
    console.log('Bank selected:', bank)
    setSelectedBank(bank)
    setStep('connect')
  }, [])

  const handleInitialSetup = React.useCallback(async () => {
    try {
      setIsLoading(true)
      console.log("Client ID:", process.env.LEAN_TECH_CLIENT_ID ? "Exists" : "Not found");
      console.log("Client Secret:", process.env.LEAN_TECH_CLIENT_SECRET ? "Exists" : "Not found");
      const response = await fetch('/api/bank-integration/auth')

      if (!response.ok) {
        throw new Error('Failed to get authentication token')
      }

      const data = await response.json()
      console.log('Auth response:', data)
      setAuthToken(data.token)
      setCustomerId(data.customerId)
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
      
      let banksArray = []
      
      if (Array.isArray(data)) {
        banksArray = data
        console.log('Received direct array of banks')
      } else if (data && typeof data === 'object') {
        if (data.data && Array.isArray(data.data)) {
          banksArray = data.data
          console.log('Received banks in data property')
        } else {
          console.log('Unexpected data format:', Object.keys(data))
          banksArray = data // Try to use whatever we got
        }
      }
      
      console.log('Processed banks array:', banksArray.length, 'banks')
      
      const filteredBanks = banksArray.filter((bank: Bank) => {
        if (selectedCountry === 'UAE') {
          return bank.country_codes?.includes('AE') || bank.country_code === 'ARE'
        } else if (selectedCountry === 'SAU') {
          return bank.country_codes?.includes('SA') || bank.country_code === 'SAU'
        }
        return false
      })
      
      console.log('Filtered banks:', filteredBanks.length, 'banks for', selectedCountry)
      
      const mappedBanks = filteredBanks.map((bank: Bank) => {
        return {
          ...bank,
          identifier: bank.identifier || bank.id || `bank-${Math.random().toString(36).substring(2, 9)}`,
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
  }, [selectedCountry, toast])

  const loadLeanSDK = React.useCallback(() => {
    if (typeof window === 'undefined') return
    
    console.log('Loading Lean SDK')
    
    if (scriptRef.current) {
      document.head.removeChild(scriptRef.current)
      scriptRef.current = null
      window.Lean = undefined
    }
    
    const script = document.createElement('script')
    script.src = 'https://cdn.leantech.me/link/sdk/web/latest/Lean.min.js'
    script.async = true
    script.defer = true 
    script.type = 'text/javascript' 
    
    script.onload = () => {
      console.log('Lean SDK loaded successfully')
      
      console.log('Available global objects:', Object.keys(window).filter(key => 
        key.toLowerCase().includes('lean')))
      
      if (window.Lean) {
        console.log('Lean is available in window')
      } else {
        console.error('No Lean SDK object found in window after script load')
        console.log('All window properties:', Object.keys(window))
        setError('Failed to initialize the bank connection SDK')
      }
    }
    
    script.onerror = (error) => {
      console.error('Error loading Lean SDK:', error)
      setError('Failed to load the bank connection SDK')
    }
    
    scriptRef.current = script
    
    document.head.appendChild(script)
    
    return () => {
      if (scriptRef.current) {
        document.head.removeChild(scriptRef.current)
        scriptRef.current = null
        window.Lean = undefined
      }
    }
  }, [])

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

  const handleLeanSuccess = React.useCallback((connectionId: string) => {
    if (!selectedBank) return;
    
    const newConnection: BankConnection = {
      id: connectionId,
      bank_id: (selectedBank.identifier || selectedBank.id || '').toString(),
      status: 'connected',
      created_at: new Date().toISOString(),
      bank_name: selectedBank.name,
      bank_logo: selectedBank.logo,
      permissions: [
        'identity',
        'accounts',
        'balance',
        'transactions'
      ]
    }
    
    setConnections(prev => [...prev, newConnection])
    
    fetchConnectionData(connectionId)
    
    setShowLeanSDK(false);
    onClose();
  }, [selectedBank, fetchConnectionData, onClose, setConnections])

  const handleLeanExit = React.useCallback(() => {
    setShowLeanSDK(false);
    onClose();
  }, [onClose])

  React.useEffect(() => {
    if (step === 'connect') {
      console.log('Step changed to connect, loading Lean SDK')
      
      const cleanup = loadLeanSDK()
      return cleanup
    }
    
    return () => {
      if (scriptRef.current) {
        console.log('Cleaning up Lean SDK')
        document.head.removeChild(scriptRef.current)
        scriptRef.current = null
        window.Lean = undefined
      }
    }
  }, [step, loadLeanSDK])

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
                        <Text fontSize="sm" fontWeight="medium">100% Private</Text>
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
                        <Text fontSize="sm" fontWeight="medium">Protected data</Text>
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
          <Container maxW="xl" py={8}>
            <VStack spacing={4} align="stretch">
              <Text fontSize="xl" fontWeight="bold" textAlign="center">
                Connect to {selectedBank?.name || 'Bank'}
              </Text>
              
              {error && (
                <Box bg="red.50" color="red.600" p={4} borderRadius="md" mb={4}>
                  <Text>{error}</Text>
                </Box>
              )}
              
              {isLoading ? (
                <Center py={8}>
                  <Spinner size="xl" color="blue.500" />
                </Center>
              ) : (
                <Box 
                  minH="500px" 
                  h="500px"
                  w="100%" 
                  bg={bgColor}
                  borderRadius="md"
                  border="1px solid"
                  borderColor={borderColor}
                  position="relative"
                  overflow="hidden"
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                />
              )}
              
              <Text fontSize="xs" color="gray.500" textAlign="center" mt={4}>
                Powered by Lean Tech
              </Text>
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

  const BankCard = React.useCallback(({ bank }: { bank: Bank }) => {
    const bankLogo = bank.logo
    
    return (
      <Card
        direction="row"
        overflow="hidden"
        variant="outline"
        cursor="pointer"
        onClick={() => handleBankSelect(bank)}
        _hover={{ borderColor: 'blue.500', shadow: 'md' }}
        mb={2}
      >
        <Image
          objectFit="contain"
          maxW={{ base: '80px', sm: '100px' }}
          maxH="60px"
          m={4}
          src={bankLogo}
          alt={bank.name}
        />
        <Stack flex={1}>
          <CardBody py={4}>
            <Heading size="sm">{bank.name}</Heading>
            <Text py="2" fontSize="sm" color={textColor}>
              {bank.mock ? 'Demo Bank (Test Mode)' : 'Connect your account securely'}
            </Text>
          </CardBody>
        </Stack>
      </Card>
    )
  }, [handleBankSelect, textColor])

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
                let bankData: any = null;
                try {
                  const storedData = localStorage.getItem(`bank_connection_${connection.id}`);
                  if (storedData) {
                    bankData = JSON.parse(storedData);
                  }
                } catch (error) {
                  console.error('Error retrieving bank data:', error);
                }
                
                const bankInfo = banks.find(bank => bank.identifier === connection.bank_id);
                
                return (
                  <Card key={connection.id} variant="outline" shadow="md">
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        <HStack justifyContent="space-between" alignItems="center">
                          {bankInfo?.logo && (
                            <Image
                              src={bankInfo.logo}
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
                                console.log('View bank data:', bankData);
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
                            <Button
                              size="sm"
                              colorScheme="blue"
                              variant="outline"
                              onClick={() => {
                                // Extract bank info for reconnection
                                const bankForReconnect = banks.find(b => 
                                  b.identifier === connection.bank_id || b.id === connection.bank_id
                                )
                                
                                if (bankForReconnect) {
                                  handleBankSelect(bankForReconnect)
                                } else {
                                  // Create a minimal bank object if the original bank is not found
                                  const minimalBank: Bank = {
                                    identifier: connection.bank_id,
                                    name: connection.bank_name || 'Your Bank',
                                    logo: connection.bank_logo || 'https://via.placeholder.com/150',
                                    country_code: selectedCountry === 'UAE' ? 'ARE' : 'SAU'
                                  }
                                  handleBankSelect(minimalBank)
                                }
                              }}
                            >
                              Reconnect
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

      {showLeanSDK && authToken && customerId && selectedBank && (
        <LeanSDKWrapper
          authToken={authToken}
          customerId={customerId}
          selectedBank={selectedBank}
          onSuccess={handleLeanSuccess}
          onExit={handleLeanExit}
        />
      )}
    </>
  )
}