'use client'

import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import { Card, CardBody } from '@chakra-ui/react'
import { PageHeader } from 'features/common/components/page-header'

export default function IdentityPage() {
  const identityData = {
    customerName: 'Cloud Stride',
    age: '24',
    dateOfBirth: '1999-08-9',
    sex: 'Male',
    email: 'cloudstride@gmail.com',
    addressLine1: '033984950038',
    addressLine2: 'Islamabad, Pakistan',
    addressLine3: 'Islamabad, Pakistan'
  }

  return (
    <Box>
      <PageHeader title="Identity" />
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
          <Heading size="lg" mb={2}>Identity</Heading>
          <Text color="gray.600" mb={4} fontSize="md">
            Effortlessly view and manage your accounts in one place with real-time balance updates.
          </Text>

          <VStack spacing={4} align="stretch">
            {Object.entries(identityData).map(([key, value], index) => (
              <Card 
                key={index}
                position="relative"
                borderLeftWidth="4px"
                borderLeftColor="green.400"
                overflow="hidden"
              >
                <CardBody py={4} px={6}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Text fontSize="md" color="gray.600">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</Text>
                    <Text fontSize="md" fontWeight="medium">{value}</Text>
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
