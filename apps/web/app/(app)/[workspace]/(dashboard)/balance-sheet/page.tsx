'use client'

import { Box, Heading, Text, SimpleGrid, HStack, Card, CardBody, Select } from '@chakra-ui/react'
import { PageHeader } from '#features/common/components/page-header'
import React from 'react'

export default function BalanceSheetPage() {
  const [selectedAccount, setSelectedAccount] = React.useState('ABD Account Selected')

  const balanceData = [
    {
      amount: 'Rp 180000.000',
      title: 'Total Cash Account Balance'
    },
    {
      amount: 'Rp 180000.000',
      title: 'E-Payment Balance'
    },
    {
      amount: 'Rp 180000.000',
      title: 'Total Bank Account Balance'
    }
  ]

  const transactions = [
    {
      name: 'Alethid Credit Bureeau',
      date: 'Jan 31 - Feb 4',
      transactionId: 'Transaction ID: 419790-87850-65',
      amount: '46.889 $'
    },
    {
      name: 'Alethid Credit Bureeau',
      date: 'Jan 31 - Feb 4',
      transactionId: 'Transaction ID: 419790-87850-65',
      amount: '+87,89.0 $',
      isPositive: true
    },
    {
      name: 'Alethid Credit Bureeau',
      date: 'Jan 31 - Feb 4',
      transactionId: 'Transaction ID: 419790-87850-65',
      amount: '46.889 $'
    },
    {
      name: 'Alethid Credit Bureeau',
      date: 'Jan 31 - Feb 4',
      transactionId: 'Transaction ID: 419790-87850-65',
      amount: '-46.889 $',
      isNegative: true
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

          {/* Balance Cards */}
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
            {balanceData.map((item, index) => (
              <Card 
                key={index} 
                p={6} 
                borderRadius="lg" 
                boxShadow="sm"
                borderTop="4px solid"
                borderTopColor="green.400"
              >
                <CardBody p={0}>
                  <Text fontSize="2xl" fontWeight="semibold" mb={2}>
                    {item.amount}
                  </Text>
                  <Text color="gray.600">{item.title}</Text>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>

          {/* Transactions Section */}
          <Box mb={6}>
            <Heading size="md" mb={4}>Transactions</Heading>
            <Text color="gray.600" mb={6} fontSize="md">
              Effortlessly view and manage your accounts in one place with real-time balance updates.
            </Text>

            <SimpleGrid columns={1} spacing={4}>
              {transactions.map((transaction, index) => (
                <Card 
                  key={index}
                  borderLeftWidth="4px"
                  borderLeftColor="green.400"
                  boxShadow="sm"
                >
                  <CardBody py={4} px={6}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Text fontSize="md" fontWeight="medium">
                          {transaction.name}
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                          {transaction.date}
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                          {transaction.transactionId}
                        </Text>
                      </Box>
                      <Text 
                        fontSize="lg" 
                        fontWeight="medium"
                        color={transaction.isPositive ? "green.500" : transaction.isNegative ? "red.500" : "gray.900"}
                      >
                        {transaction.amount}
                      </Text>
                    </Box>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
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
