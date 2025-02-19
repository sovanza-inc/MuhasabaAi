'use client'

import { Box, Heading, Text, SimpleGrid, HStack, VStack } from '@chakra-ui/react'
import { Card, CardBody } from '@chakra-ui/react'
import { LineChart, AreaChart, BarChart } from '@saas-ui/charts'
import { PageHeader } from 'features/common/components/page-header'

export default function TransactionPage() {
  const transactions = [
    {
      name: 'Alethid Credit Bureeau',
      date: 'Jan 31 - Feb 4',
      transactionId: '419790-87850-65',
      amount: 46889,
      type: 'debit'
    },
    {
      name: 'Alethid Credit Bureeau',
      date: 'Jan 31 - Feb 4',
      transactionId: '419790-87850-65',
      amount: 87890,
      type: 'credit'
    },
    {
      name: 'Alethid Credit Bureeau',
      date: 'Jan 31 - Feb 4',
      transactionId: '419790-87850-65',
      amount: 14000.8,
      type: 'debit'
    },
    {
      name: 'Alethid Credit Bureeau',
      date: 'Jan 31 - Feb 4',
      transactionId: '419790-87850-65',
      amount: 46889,
      type: 'debit'
    },
    {
      name: 'Alethid Credit Bureeau',
      date: 'Jan 31 - Feb 4',
      transactionId: '419790-87850-65',
      amount: 46889,
      type: 'credit'
    }
  ]

  const chartData = [
    { name: 'Category 1', value: 30 },
    { name: 'Category 2', value: 20 },
    { name: 'Category 3', value: 15 },
    { name: 'Category 4', value: 7 }
  ]

  return (
    <Box>
      <PageHeader title="Transactions" />
      <Box 
        height="calc(100vh - 128px)"
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
        <Box mb={6}>
          <Heading size="lg" mb={2}>Transactions</Heading>
          <Text color="gray.600" mb={4} fontSize="md">
            Effortlessly view and manage your accounts in one place with real-time balance updates.
          </Text>
          
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            <Card variant="unstyled" bg="white">
              <CardBody height="160px">
                <AreaChart
                  data={[
                    { month: 'Jan', value: 300 },
                    { month: 'Feb', value: 200 },
                    { month: 'Mar', value: 400 },
                    { month: 'Apr', value: 300 },
                    { month: 'May', value: 500 }
                  ]}
                  categories={['value']}
                  index="month"
                  height="150px"
                />
              </CardBody>
            </Card>

            <Card variant="unstyled" bg="white">
              <CardBody height="160px">
                <BarChart
                  data={[
                    { month: 'Jan', amount: 200 },
                    { month: 'Feb', amount: 150 },
                    { month: 'Mar', amount: 300 },
                    { month: 'Apr', amount: 250 },
                    { month: 'May', amount: 400 },
                    { month: 'Jun', amount: 350 }
                  ]}
                  categories={['amount']}
                  index="month"
                  height="150px"
                  colors={['#48BB78']}
                />
              </CardBody>
            </Card>

            <Card variant="unstyled" bg="white">
              <CardBody height="160px" display="flex" alignItems="center">
                <Box width="100%">
                  <Text fontSize="md" fontWeight="medium" mb={3}>Total Spent: <Text as="span" color="gray.600">$5,789</Text></Text>
                  <Text fontSize="md" fontWeight="medium" mb={3}>Total Income: <Text as="span" color="gray.600">$5,789</Text></Text>
                  <Text fontSize="md" fontWeight="medium">Disposable Income: <Text as="span" color="gray.600">$5,789</Text></Text>
                </Box>
              </CardBody>
            </Card>
          </SimpleGrid>
        </Box>

        {/* Transactions Section */}
        <Box>
          <Heading size="md" mb={2}>Recent Transactions</Heading>
          <Text color="gray.600" mb={4} fontSize="md">
            Effortlessly view and manage your accounts in one place with real-time balance updates.
          </Text>

          <VStack spacing={4} align="stretch">
            {transactions.map((transaction, index) => (
              <Card 
                key={index}
                position="relative"
                borderLeftWidth="4px"
                borderLeftColor="green.400"
                overflow="hidden"
              >
                <CardBody py={3}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Text fontSize="md" fontWeight="medium">{transaction.name}</Text>
                      <Text fontSize="sm" color="gray.600">{transaction.date}</Text>
                      <Text fontSize="sm" color="gray.400">Transaction ID: {transaction.transactionId}</Text>
                    </Box>
                    <Text 
                      fontSize="md"
                      fontWeight="bold" 
                      color={transaction.type === 'credit' ? 'green.500' : undefined}
                    >
                      {transaction.type === 'credit' ? '+' : ''}{transaction.amount.toLocaleString()} $
                    </Text>
                  </Box>
                </CardBody>
              </Card>
            ))}
          </VStack>
        </Box>
      </Box>
    </Box>
  )
} 