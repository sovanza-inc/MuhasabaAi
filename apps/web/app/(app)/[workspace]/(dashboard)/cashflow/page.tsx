'use client'

import { Box, Heading, Text, VStack, HStack, Flex } from '@chakra-ui/react'
import { Card, CardBody } from '@chakra-ui/react'
import { AreaChart, BarChart } from '@saas-ui/charts'
import { LuShoppingCart, LuBus, LuHeart, LuTv } from 'react-icons/lu'
import { PageHeader } from 'features/common/components/page-header'
import { useState } from 'react'

export default function CashflowPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const cashflowData = [
    {
      id: 'shopping',
      title: 'Shopping',
      icon: LuShoppingCart,
      transactions: 1,
      details: {
        'Salary Credit Salary PM': {
          amount: 438.98,
          transactionCount: 7,
          firstPayment: 874.92,
          lastPayment: 888.89,
          regularity: 67,
          averageDays: 6709
        }
      }
    },
    {
      id: 'transport',
      title: 'Transport',
      icon: LuBus,
      transactions: 2,
      details: {}
    },
    {
      id: 'health',
      title: 'Health & Wellbeing',
      icon: LuHeart,
      transactions: 2,
      details: {}
    },
    {
      id: 'entertainment',
      title: 'Entertainment',
      icon: LuTv,
      transactions: 2,
      details: {}
    }
  ]

  const chartData = [
    { month: 'Jan', income: 30000, outcome: 35000 },
    { month: 'Feb', income: 35000, outcome: 30000 },
    { month: 'Mar', income: 25000, outcome: 35000 },
    { month: 'Apr', income: 30000, outcome: 35000 },
    { month: 'May', income: 35000, outcome: 40000 },
    { month: 'Jun', income: 35000, outcome: 25000 },
    { month: 'Jul', income: 35000, outcome: 25000 },
    { month: 'Aug', income: 35000, outcome: 25000 }
  ]

  return (
    <Box>
      <PageHeader title="Cashflow" />
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
          <Heading size="lg" mb={2}>Cashflow Analysis</Heading>
          <Text color="gray.600" mb={4} fontSize="md">
            Effortlessly view and manage your accounts in one place with real-time balance updates.
          </Text>

          {/* Analytics Chart Section */}
          <Card variant="unstyled" bg="white" mb={6}>
            <CardBody p={6}>
              <Heading size="md" mb={4}>Analytics</Heading>
              <Box height="300px">
                <BarChart
                  data={chartData}
                  categories={['income', 'outcome']}
                  index="month"
                  height="100%"
                  colors={['#10B981', '#064E3B']}
                />
              </Box>
            </CardBody>
          </Card>

          {/* Summary Stats */}
          <HStack spacing={4} mb={6}>
            <Card flex={1}>
              <CardBody>
                <Text fontSize="md" color="gray.600">Total Spent</Text>
                <Text fontSize="xl" fontWeight="bold">55,789</Text>
              </CardBody>
            </Card>
            <Card flex={1}>
              <CardBody>
                <Text fontSize="md" color="gray.600">Total Income</Text>
                <Text fontSize="xl" fontWeight="bold">55,789</Text>
              </CardBody>
            </Card>
            <Card flex={1}>
              <CardBody>
                <Text fontSize="md" color="gray.600">Disposable Income</Text>
                <Text fontSize="xl" fontWeight="bold">55,789</Text>
              </CardBody>
            </Card>
          </HStack>

          {/* Categories */}
          <VStack spacing={4} align="stretch">
            {cashflowData.map((category) => (
              <Card 
                key={category.id}
                position="relative"
                borderLeftWidth="4px"
                borderLeftColor="green.400"
                overflow="hidden"
                cursor="pointer"
                onClick={() => setExpandedSection(expandedSection === category.id ? null : category.id)}
              >
                <CardBody py={4} px={6}>
                  <Box>
                    <Flex justify="space-between" align="center" mb={expandedSection === category.id ? 4 : 0}>
                      <HStack spacing={3}>
                        <Box as={category.icon} size={20} color="gray.600" />
                        <Text fontSize="md" fontWeight="medium">{category.title}</Text>
                      </HStack>
                      <Text fontSize="sm" color="green.500">{category.transactions} Transactions</Text>
                    </Flex>

                    {/* Expanded Content */}
                    {expandedSection === category.id && Object.entries(category.details).map(([title, detail]) => (
                      <Box key={title} mt={4} pl={8}>
                        <Text fontSize="md" fontWeight="medium" mb={2}>{title}</Text>
                        <VStack align="stretch" spacing={2}>
                          <Flex justify="space-between">
                            <Text fontSize="md" color="gray.600">Transaction Count:</Text>
                            <Text fontSize="md">{detail.transactionCount}</Text>
                          </Flex>
                          <Flex justify="space-between">
                            <Text fontSize="md" color="gray.600">First Payment:</Text>
                            <Text fontSize="md">{detail.firstPayment}</Text>
                          </Flex>
                          <Flex justify="space-between">
                            <Text fontSize="md" color="gray.600">Last Payment:</Text>
                            <Text fontSize="md">{detail.lastPayment}</Text>
                          </Flex>
                          <Flex justify="space-between">
                            <Text fontSize="md" color="gray.600">Regularity:</Text>
                            <Text fontSize="md">{detail.regularity}</Text>
                          </Flex>
                          <Flex justify="space-between">
                            <Text fontSize="md" color="gray.600">Average Days between Payments:</Text>
                            <Text fontSize="md">{detail.averageDays}</Text>
                          </Flex>
                        </VStack>
                      </Box>
                    ))}
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
