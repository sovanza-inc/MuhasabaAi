'use client'

import { 
  Box, 
  Text, 
  Select, 
  Heading, 
  SimpleGrid, 
  HStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Progress,
  TableContainer,
  Icon,
  Card,
  CardBody,
  Spinner
} from '@chakra-ui/react'
import React from 'react'
import { PageHeader } from '#features/common/components/page-header'
import { useProfitLoss } from '#features/bank-integrations/hooks/use-profit-loss'
import { LuChevronsUpDown } from 'react-icons/lu'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'

interface Bank {
  id: string;
  bank_identifier: string;
  name: string;
}

export default function ProfitLossPage() {
  const { data, isLoading, error, selectBank } = useProfitLoss();
  const [banks, setBanks] = React.useState<Bank[]>([]);
  const [selectedBankId, setSelectedBankId] = React.useState<string>('all');
  const [authToken, setAuthToken] = React.useState<string | null>(null);
  const [customerId, setCustomerId] = React.useState<string | null>(null);
  const [workspace] = useCurrentWorkspace();
  
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
        console.error('Error initializing auth:', error);
      }
    }

    if (workspace?.id) {
      initializeAuth();
    }
  }, [workspace?.id]);

  // Fetch connected banks
  React.useEffect(() => {
    const fetchBanks = async () => {
      if (!customerId || !authToken) return;

      try {
        const response = await fetch(`/api/bank-integration/accounts?customer_id=${customerId}`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.details || 'Failed to fetch connected banks');
        }

        setBanks(data);
      } catch (error) {
        console.error('Error fetching connected banks:', error);
      }
    };

    fetchBanks();
  }, [customerId, authToken]);

  if (error) {
    return (
      <Box p={8}>
        <Text color="red.500">Error loading profit & loss data: {error}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader />
      <Box p={4}>
        <Box 
          height="calc(100vh - 65px)"
          position="relative"
          display="flex"
          flexDirection="column"
          overflowY="auto"
          sx={{
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none'
          }}
        >
          {/* Reports Section */}
          <Box mb={6}>
            <Box mb={4}>
              <Heading size="lg" mb={2}>Reports</Heading>
              <Text color="gray.600" mb={4} fontSize="md">
                Effortlessly view and analyze your financial reports in one place with real-time insights and data updates.
              </Text>
            </Box>

            <Box display="flex" justifyContent="flex-end" mb={4}>
              <Select 
                maxW="200px"
                value={selectedBankId}
                onChange={(e) => {
                  setSelectedBankId(e.target.value);
                  selectBank(e.target.value);
                }}
                bg="green.50"
                color="green.500"
                borderColor="green.200"
                _hover={{
                  borderColor: "green.300"
                }}
              >
                <option value="all">All Banks</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.bank_identifier || bank.name}
                  </option>
                ))}
              </Select>
            </Box>
          </Box>

          {isLoading ? (
            <Box display="flex" justifyContent="center" p={8}>
              <Spinner size="xl" />
            </Box>
          ) : data ? (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={6}>
              {/* Revenues Card */}
              <Card borderTop="4px solid" borderTopColor="green.400">
                <CardBody>
                  <Heading size="md" mb={4}>Revenues</Heading>
                  <SimpleGrid columns={3} gap={4}>
                    <Box>
                      <Text color="gray.600" fontSize="sm">Project cost:</Text>
                      <Text fontSize="md">${data.revenues.projectCost}</Text>
                    </Box>
                    <Box>
                      <Text color="gray.600" fontSize="sm">Total spending:</Text>
                      <Text fontSize="md">${data.revenues.totalSpending}</Text>
                    </Box>
                    <Box>
                      <Text color="gray.600" fontSize="sm">This Month</Text>
                      <Text fontSize="md" mb={2}>${data.revenues.thisMonth}</Text>
                      <Progress 
                        value={parseFloat(data.revenues.totalSpending) > 0 ? (parseFloat(data.revenues.thisMonth) / parseFloat(data.revenues.totalSpending)) * 100 : 0} 
                        size="sm" 
                        colorScheme="green"
                        borderRadius="full"
                        bg="gray.100"
                      />
                    </Box>
                  </SimpleGrid>
                </CardBody>
              </Card>

              {/* Expenses Card */}
              <Card borderTop="4px solid" borderTopColor="green.400">
                <CardBody>
                  <Heading size="md" mb={4}>Expenses</Heading>
                  <SimpleGrid columns={3} gap={4}>
                    <Box>
                      <Text color="gray.600" fontSize="sm">Project cost:</Text>
                      <Text fontSize="md">${data.expenses.projectCost}</Text>
                    </Box>
                    <Box>
                      <Text color="gray.600" fontSize="sm">Total spending:</Text>
                      <Text fontSize="md">${data.expenses.totalSpending}</Text>
                    </Box>
                    <Box>
                      <Text color="gray.600" fontSize="sm">This Month</Text>
                      <Text fontSize="md" mb={2}>${data.expenses.thisMonth}</Text>
                      <Progress 
                        value={parseFloat(data.expenses.totalSpending) > 0 ? (parseFloat(data.expenses.thisMonth) / parseFloat(data.expenses.totalSpending)) * 100 : 0} 
                        size="sm" 
                        colorScheme="green"
                        borderRadius="full"
                        bg="gray.100"
                      />
                    </Box>
                  </SimpleGrid>
                </CardBody>
              </Card>
            </SimpleGrid>
          ) : null}

          {/* Transactions Records */}
          <Box mb={8}>
            <Heading size="md" mb={4}>Revenues Transactions Record</Heading>
            <TableContainer whiteSpace="normal" overflowX="hidden">
              <Table variant="simple" layout="fixed" width="100%">
                <Thead>
                  <Tr borderBottom="1px" borderColor="gray.200">
                    <Th width="15%">
                      <HStack spacing={1}>
                        <Text>Date</Text>
                        <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                      </HStack>
                    </Th>
                    <Th width="20%">
                      <HStack spacing={1}>
                        <Text>Account name</Text>
                        <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                      </HStack>
                    </Th>
                    <Th width="50%">
                      <HStack spacing={1}>
                        <Text>Description</Text>
                        <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                      </HStack>
                    </Th>
                    <Th width="15%" isNumeric>
                      <HStack spacing={1} justify="flex-end">
                        <Text>Ammount</Text>
                        <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                      </HStack>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data?.revenues?.transactions?.slice(0, 10).map((transaction, index) => (
                    <Tr key={index}>
                      <Td>{transaction.date}</Td>
                      <Td>{transaction.accountName}</Td>
                      <Td noOfLines={1}>{transaction.description}</Td>
                      <Td isNumeric>{transaction.amount}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
            {data?.revenues?.transactions && data.revenues.transactions.length > 10 && (
              <Text mt={2} color="gray.600" fontSize="sm" textAlign="center">
                Showing 10 of {data.revenues.transactions.length} transactions
              </Text>
            )}
          </Box>

          <Box mb={6}>
            <Heading size="md" mb={4}>Expenses Transaction Records</Heading>
            <TableContainer whiteSpace="normal" overflowX="hidden">
              <Table variant="simple" layout="fixed" width="100%">
                <Thead>
                  <Tr borderBottom="1px" borderColor="gray.200">
                    <Th width="15%">
                      <HStack spacing={1}>
                        <Text>Date</Text>
                        <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                      </HStack>
                    </Th>
                    <Th width="20%">
                      <HStack spacing={1}>
                        <Text>Account name</Text>
                        <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                      </HStack>
                    </Th>
                    <Th width="50%">
                      <HStack spacing={1}>
                        <Text>Description</Text>
                        <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                      </HStack>
                    </Th>
                    <Th width="15%" isNumeric>
                      <HStack spacing={1} justify="flex-end">
                        <Text>Ammount</Text>
                        <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                      </HStack>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data?.expenses?.transactions?.slice(0, 10).map((transaction, index) => (
                    <Tr key={index}>
                      <Td>{transaction.date}</Td>
                      <Td>{transaction.accountName}</Td>
                      <Td noOfLines={1}>{transaction.description}</Td>
                      <Td isNumeric>{transaction.amount}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
            {data?.expenses?.transactions && data.expenses.transactions.length > 10 && (
              <Text mt={2} color="gray.600" fontSize="sm" textAlign="center">
                Showing 10 of {data.expenses.transactions.length} transactions
              </Text>
            )}
          </Box>
        </Box>
      </Box>
      {/* Summary Footer */}
      <Box 
        bg="teal.700" 
        color="white" 
        p={4}
      >
        <HStack justify="space-between">
          <Text>Summary: Revenue-Expenses</Text>
          <Text>Net Profit: {data?.netProfit || '0$'}</Text>
        </HStack>
      </Box>
    </Box>
  )
}
