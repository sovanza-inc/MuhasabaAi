'use client'

import { Box, Heading, Text, SimpleGrid } from '@chakra-ui/react'
import { Card, CardBody } from '@chakra-ui/react'

export default function AccountingPage() {
  const accounts = Array(5).fill({
    name: 'Beyond Current Account',
    enbd: '12 Current',
    accountNumber: 'AE878787988888983082039991',
    balance: 15035.85,
    currency: 'AED'
  })

  return (
    <Box p={6}>
      <Box mb={6}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Heading as="h2" fontSize="xl" fontWeight="semibold" color="gray.900">
            Accounts Overview
          </Heading>
          <Text fontSize="sm" color="gray.600">Total Accounts: {accounts.length}</Text>
        </Box>
        <Text fontSize="sm" color="gray.500">
          Manage your financial accounts and track your business transactions
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
        {accounts.map((account, index) => (
          <Card 
            key={index} 
            borderRadius="lg"
            border="1px solid"
            borderColor="gray.100"
            boxShadow="sm"
            position="relative"
            overflow="hidden"
            _after={{
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '2px',
              bgColor: 'green.400'
            }}
          >
            <CardBody py={4} px={5}>
              <Heading size="sm" mb={3} color="gray.900">{account.name}</Heading>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Text fontSize="sm" color="gray.500">ENBD: {account.enbd}</Text>
                  <Text fontSize="sm" color="gray.500">{account.accountNumber}</Text>
                </Box>
                <Box textAlign="right">
                  <Text fontWeight="semibold" color="gray.900">{account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                  <Text fontSize="sm" color="gray.500">{account.currency}</Text>
                </Box>
              </Box>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>
    </Box>
  )
}
