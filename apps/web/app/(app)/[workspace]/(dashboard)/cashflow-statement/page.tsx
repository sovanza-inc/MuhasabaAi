'use client'

import { 
  Box, 
  Heading, 
  Text, 
  HStack, 
  Select, 
  Table, 
  Thead, 
  Tbody, 
  Tr, 
  Th, 
  Td, 
  TableContainer,
  Icon,
  Badge,
  ButtonGroup,
  Button,
} from '@chakra-ui/react'
import { Card, CardBody } from '@chakra-ui/react'
import { PageHeader } from '#features/common/components/page-header'
import { AreaChart } from '@saas-ui/charts'
import React from 'react'
import { LuChevronsUpDown } from 'react-icons/lu'

export default function CashflowStatementPage() {
  const [selectedAccount, setSelectedAccount] = React.useState('ABD Account Selected')
  const [selectedMonth, setSelectedMonth] = React.useState('October')
  const [selectedStatus, setSelectedStatus] = React.useState('All')

  // Chart data
  const chartData = Array.from({ length: 30 }, (_, i) => ({
    day: `Day ${i + 1}`,
    value: Math.floor(Math.random() * (25000 - 10000) + 10000)
  }))

  // Peak value for annotation
  const peakValue = {
    day: 'Day 6',
    value: 64364.77
  }

  // Transaction data
  const transactions = [
    {
      refId: '456789356',
      date: 'Sep 9, 2024, 04:30pm',
      from: { initial: 'F', email: 'fadel@email.com' },
      type: 'Income',
      amount: '+$5,670.00',
      status: 'Pending'
    },
    {
      refId: '456789356',
      date: 'Sep 8, 2024, 03:13pm',
      from: { initial: 'W', name: 'Wise - 5466xxxx' },
      type: 'Savings',
      amount: '+$15,000.00',
      status: 'Completed'
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

          {/* Cashflow Chart */}
          <Card mb={8}>
            <CardBody>
              <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Heading size="md">Cash Flow Summary</Heading>
                  <Text color="gray.600">200+ Transactions this month</Text>
                </Box>
                
                <Select 
                  size="sm"
                  maxW="120px"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  borderColor="gray.200"
                >
                  <option value="October">October</option>
                  <option value="September">September</option>
                  <option value="August">August</option>
                </Select>
              </Box>

              <Box position="relative" height="300px">
                <AreaChart
                  data={chartData}
                  categories={['value']}
                  index="day"
                  colors={['#38B2AC']}
                  yAxisWidth={50}
                  valueFormatter={(value) => `${(value/1000).toFixed(1)}K`}
                  height="300px"
                />
                
                {/* Peak Value Annotation */}
                <Box 
                  position="absolute" 
                  top="20%" 
                  left="30%" 
                  bg="green.500" 
                  color="white" 
                  px={3} 
                  py={1} 
                  borderRadius="md"
                >
                  64,364.77
                </Box>
              </Box>
            </CardBody>
          </Card>

          {/* Transactions Table */}
          <Box>
            {/* Filters */}
            <HStack mb={4} spacing={4}>
              <ButtonGroup size="sm" isAttached variant="outline">
                <Button isActive>All</Button>
                <Button>Savings</Button>
                <Button>Income</Button>
                <Button>Expenses</Button>
              </ButtonGroup>

              <Box flex="1" />

              <Select 
                size="sm" 
                maxW="150px"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="All">Status: All</option>
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
              </Select>
            </HStack>

            {/* Table */}
            <TableContainer>
              <Table variant="simple">
                <Thead>
                  <Tr borderBottom="1px" borderColor="gray.200">
                    <Th>
                      <HStack spacing={1}>
                        <Text>Ref ID</Text>
                        <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                      </HStack>
                    </Th>
                    <Th>
                      <HStack spacing={1}>
                        <Text>Transaction Date</Text>
                        <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                      </HStack>
                    </Th>
                    <Th>From</Th>
                    <Th>Type</Th>
                    <Th isNumeric>Amount</Th>
                    <Th>Status</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {transactions.map((transaction, index) => (
                    <Tr key={index}>
                      <Td>{transaction.refId}</Td>
                      <Td>{transaction.date}</Td>
                      <Td>
                        <HStack>
                          <Box 
                            bg={transaction.from.initial === 'F' ? 'blue.500' : 'green.500'} 
                            color="white" 
                            w="24px" 
                            h="24px" 
                            borderRadius="full"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                          >
                            {transaction.from.initial}
                          </Box>
                          <Text>{transaction.from.email || transaction.from.name}</Text>
                        </HStack>
                      </Td>
                      <Td>{transaction.type}</Td>
                      <Td isNumeric color="green.500">{transaction.amount}</Td>
                      <Td>
                        <Badge 
                          colorScheme={transaction.status === 'Completed' ? 'green' : 'yellow'}
                        >
                          {transaction.status}
                        </Badge>
                      </Td>
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
            <Text>Summary: Retained Cash</Text>
            <Text>Net Amount: 6000$</Text>
          </HStack>
        </Box>
      </Box>
    </Box>
  )
}

