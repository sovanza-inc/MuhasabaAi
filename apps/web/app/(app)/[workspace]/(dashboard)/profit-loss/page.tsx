'use client'

import { Box, Heading, Text, SimpleGrid, HStack, Table, Thead, Tbody, Tr, Th, Td, Tabs, TabList, Tab, Select, Progress, TableContainer, Icon } from '@chakra-ui/react'
import { Card, CardBody } from '@chakra-ui/react'
import { PageHeader } from '#features/common/components/page-header'
import React from 'react'
import { LuChevronsUpDown } from 'react-icons/lu'

export default function ProfitLossPage() {
  const [selectedAccount, setSelectedAccount] = React.useState('ABD Account Selected')

  const revenueData = {
    projectCost: '13000$',
    totalSpending: '6000$',
    thisMonth: '75%'
  }

  const expenseData = {
    projectCost: '13000$',
    totalSpending: '6000$',
    thisMonth: '100%'
  }

  const revenueTransactions = [
    {
      date: 'Oct 26, 2024',
      accountName: 'ABC Account',
      description: 'Designs intuitive user experiences through research, wireframing, prototyping, and collaboration teams',
      amount: '1200$'
    },
    {
      date: 'Oct 26, 2024',
      accountName: 'ABC Account',
      description: 'Designs intuitive user experiences through research, wireframing, prototyping,',
      amount: '1200$'
    },
    {
      date: 'Oct 26, 2024',
      accountName: 'ABC Account',
      description: 'Designs intuitive user experiences through research',
      amount: '1200$'
    }
  ]

  const expenseTransactions = [
    {
      date: 'Oct 26, 2024',
      accountName: 'ABC Account',
      description: 'Designs intuitive user experiences through research, wireframing, prototyping,',
      amount: '1200$'
    },
    {
      date: 'Oct 26, 2024',
      accountName: 'ABC Account',
      description: 'Designs intuitive user experiences through research',
      amount: '1200$'
    },
    {
      date: 'Oct 26, 2024',
      accountName: 'ABC Account',
      description: 'Designs intuitive user experiences through research',
      amount: '1200$'
    }
  ]

  return (
    <Box>
      <PageHeader />
      <Box 
        height="calc(100vh - 65px)"
        position="relative"
        display="flex"
        flexDirection="column"
      >
        <Box
          flex="1"
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
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                bg="green.50"
                color="green.500"
                borderColor="green.200"
              >
                <option value="ABD Account Selected">ABD Account Selected</option>
              </Select>
            </Box>
          </Box>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={6}>
            {/* Revenues Card */}
            <Card borderTop="4px solid" borderTopColor="green.400">
              <CardBody>
                <Heading size="md" mb={4}>Revenues</Heading>
                <SimpleGrid columns={3} gap={4}>
                  <Box>
                    <Text color="gray.600" fontSize="sm">Project cost:</Text>
                    <Text fontSize="md">{revenueData.projectCost}</Text>
                  </Box>
                  <Box>
                    <Text color="gray.600" fontSize="sm">Total spending:</Text>
                    <Text fontSize="md">{revenueData.totalSpending}</Text>
                  </Box>
                  <Box>
                    <Text color="gray.600" fontSize="sm">This Month</Text>
                    <Text fontSize="md" mb={2}>{revenueData.thisMonth}</Text>
                    <Progress 
                      value={75} 
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
                    <Text fontSize="md">{expenseData.projectCost}</Text>
                  </Box>
                  <Box>
                    <Text color="gray.600" fontSize="sm">Total spending:</Text>
                    <Text fontSize="md">{expenseData.totalSpending}</Text>
                  </Box>
                  <Box>
                    <Text color="gray.600" fontSize="sm">This Month</Text>
                    <Text fontSize="md" mb={2}>{expenseData.thisMonth}</Text>
                    <Progress 
                      value={100} 
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

          {/* Transactions Records */}
          <Box mb={8}>
            <Heading size="md" mb={4}>Revenues Transactions Record</Heading>
            <TableContainer>
              <Table variant="simple">
                <Thead>
                  <Tr borderBottom="1px" borderColor="gray.200">
                    <Th>
                      <HStack spacing={1}>
                        <Text>Date</Text>
                        <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                      </HStack>
                    </Th>
                    <Th>
                      <HStack spacing={1}>
                        <Text>Account name</Text>
                        <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                      </HStack>
                    </Th>
                    <Th>
                      <HStack spacing={1}>
                        <Text>Description</Text>
                        <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                      </HStack>
                    </Th>
                    <Th isNumeric>
                      <HStack spacing={1} justify="flex-end">
                        <Text>Ammount</Text>
                        <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                      </HStack>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {revenueTransactions.map((transaction, index) => (
                    <Tr key={index}>
                      <Td>{transaction.date}</Td>
                      <Td>{transaction.accountName}</Td>
                      <Td>{transaction.description}</Td>
                      <Td isNumeric>{transaction.amount}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>

          <Box mb={6}>
            <Heading size="md" mb={4}>Expenses Transaction Records</Heading>
            <TableContainer>
              <Table variant="simple">
                <Thead>
                  <Tr borderBottom="1px" borderColor="gray.200">
                    <Th>
                      <HStack spacing={1}>
                        <Text>Date</Text>
                        <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                      </HStack>
                    </Th>
                    <Th>
                      <HStack spacing={1}>
                        <Text>Account name</Text>
                        <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                      </HStack>
                    </Th>
                    <Th>
                      <HStack spacing={1}>
                        <Text>Description</Text>
                        <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                      </HStack>
                    </Th>
                    <Th isNumeric>
                      <HStack spacing={1} justify="flex-end">
                        <Text>Ammount</Text>
                        <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                      </HStack>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {expenseTransactions.map((transaction, index) => (
                    <Tr key={index}>
                      <Td>{transaction.date}</Td>
                      <Td>{transaction.accountName}</Td>
                      <Td>{transaction.description}</Td>
                      <Td isNumeric>{transaction.amount}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
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
            <Text>Net Profit: 6000$</Text>
          </HStack>
        </Box>
      </Box>
    </Box>
  )
}
