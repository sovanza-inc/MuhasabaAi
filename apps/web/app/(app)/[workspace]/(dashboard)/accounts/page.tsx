'use client'

import { Box, Heading, Text, SimpleGrid } from '@chakra-ui/react'
import { Card, CardBody } from '@chakra-ui/react'
import { PageHeader } from 'features/common/components/page-header'

export default function AccountsPage() {
  const accounts = Array(5).fill({
    name: 'Beyond Current Account',
    enbd: '12 Current',
    accountNumber: 'AE878787988888983082039991',
    balance: 15035.85,
    currency: 'AED'
  })

  return (
    <Box>
      <PageHeader title="Accounts" />
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
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Heading size="lg" color="gray.900">
              Accounts Overview
            </Heading>
            <Text fontSize="md" color="gray.600">Total Accounts: {accounts.length}</Text>
          </Box>
          <Text fontSize="md" color="gray.600" mb={4}>
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
              <CardBody py={4} px={6}>
                <Text fontSize="md" fontWeight="medium" mb={3} color="gray.900">{account.name}</Text>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Text fontSize="md" color="gray.600">ENBD: {account.enbd}</Text>
                    <Text fontSize="md" color="gray.600">{account.accountNumber}</Text>
                  </Box>
                  <Box textAlign="right">
                    <Text fontSize="xl" fontWeight="bold" color="gray.900">
                      {account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                    <Text fontSize="md" color="gray.600">{account.currency}</Text>
                  </Box>
                </Box>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      </Box>
    </Box>
  )
}
