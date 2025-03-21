'use client'

import { useState } from 'react'

import {
  Card,
  CardBody,
  Box,
  Heading,
  Text,
  SimpleGrid,
  HStack,
  Progress,
  Button,
  Icon,
} from '@chakra-ui/react'
import {
  ErrorPage,
  Page,
  PageBody,
  PageHeader,
  Toolbar,
  ToolbarButton,
} from '@saas-ui-pro/react'
import { LoadingOverlay, LoadingSpinner } from '@saas-ui/react'
import { FaXTwitter } from 'react-icons/fa6'
import { FaLinkedin } from 'react-icons/fa'
import { LuChevronRight } from 'react-icons/lu'

import {
  DateRange,
  DateRangePicker,
  DateRangePresets,
  getRangeDiff,
  getRangeValue,
} from '@acme/ui/date-picker'
import { SegmentedControl } from '@acme/ui/segmented-control'

import { WorkspacePageProps } from '#lib/create-page'
import { api } from '#lib/trpc/react'

import { AreaChart, BarChart } from '@saas-ui/charts'

export function DashboardPage(props: WorkspacePageProps) {
  const [range, setRange] = useState('30d')
  const [dateRange, setDateRange] = useState(getRangeValue('30d'))
  const onPresetChange = (preset: string) => {
    if (preset !== 'custom') {
      setDateRange(getRangeValue(preset as DateRangePresets))
    }
    setRange(preset)
  }

  const onRangeChange = (range: DateRange) => {
    const diff = getRangeDiff(range)
    if ([1, 3, 7, 30].includes(diff)) {
      setRange(`${diff}`)
    } else {
      setRange('custom')
    }

    setDateRange(range)
  }

  const { data, isLoading } = api.dashboard.get.useQuery(
    {
      workspaceId: props.params.workspace,
      startDate: dateRange.start.toString(),
      endDate: dateRange.end.toString(),
    },
    {
      refetchOnWindowFocus: false,
      refetchInterval: false,
    },
  )

  if (!isLoading && !data) {
    return (
      <ErrorPage
        title="No workspace found"
        description={`We couldn't find a workspace named ${props.params.workspace}`}
      />
    )
  }

  // Transaction cards data
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
    }
  ]

  const toolbar = (
    <Toolbar className="overview-toolbar" variant="ghost">
      {/* <ToolbarButton
        as="a"
        href="https://twitter.com/intent/tweet?text=Check%20out%20%40saas_js"
        icon={<FaXTwitter />}
        label="Share on X"
      />
      <ToolbarButton
        as="a"
        href="https://linkedin.com/share"
        icon={<FaLinkedin />}
        label="Share on LinkedIn"
      /> */}
      <ToolbarButton
        as="a"
        href="https://saas-ui.lemonsqueezy.com/checkout/buy/5c76854f-738a-46b8-b32d-932a97d477f5"
        label="Get Help"
        color="white"
        backgroundColor="green.600"
        variant="solid"
        className="pre-order"
      />
    </Toolbar>
  )

  const footer = (
    <Toolbar justifyContent="flex-start" variant="secondary" size="xs">
      <SegmentedControl
        size="xs"
        segments={[
          {
            id: '1d',
            label: '1d',
          },
          {
            id: '3d',
            label: '3d',
          },
          {
            id: '7d',
            label: '7d',
          },
          { id: '30d', label: '30d' },
          { id: 'custom', label: 'Custom' },
        ]}
        value={range}
        onChange={onPresetChange}
      />
      <DateRangePicker value={dateRange} onChange={onRangeChange} />
    </Toolbar>
  )

  const body = isLoading ? (
    <LoadingOverlay>
      <LoadingSpinner />
    </LoadingOverlay>
  ) : (
    <Box 
      height="calc(100vh - 128px)"
      overflow="auto"
      sx={{
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        msOverflowStyle: 'none',
        scrollbarWidth: 'none'
      }}
    >
      {/* Receivables Section */}
      <Box mb={8}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Heading size="lg" mb={2}>Receivables</Heading>
            <Text color="gray.600">
              Effortlessly view and manage your accounts in one place with real-time balance updates.
            </Text>
          </Box>
          <Button
            as="a"
            href="#"
            colorScheme="green"
            variant="link"
            rightIcon={<Icon as={LuChevronRight} />}
          >
            View Reports
          </Button>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
          <Card borderTop="4px solid" borderTopColor="green.400">
            <CardBody>
              <Text fontSize="md" fontWeight="medium" mb={3}>Logistic System Account</Text>
              <HStack mb={2} justify="space-between">
                <Text color="gray.600" fontSize="sm">Project cost: 13000$</Text>
                <Text color="gray.600" fontSize="sm">Total spending: 6000$</Text>
              </HStack>
              <HStack justify="space-between" mb={2}>
                <Text color="gray.600" fontSize="sm">Budget</Text>
                <Text color="gray.600" fontSize="sm">20%</Text>
              </HStack>
              <Progress value={20} size="sm" colorScheme="green" />
            </CardBody>
          </Card>

          <Card borderTop="4px solid" borderTopColor="green.400">
            <CardBody>
              <Text fontSize="md" fontWeight="medium" mb={3}>Payble Accounts</Text>
              <HStack mb={2} justify="space-between">
                <Text color="gray.600" fontSize="sm">Project cost: 13000$</Text>
                <Text color="gray.600" fontSize="sm">Total spending: 6000$</Text>
              </HStack>
              <HStack justify="space-between" mb={2}>
                <Text color="gray.600" fontSize="sm">Budget</Text>
                <Text color="gray.600" fontSize="sm">20%</Text>
              </HStack>
              <Progress value={20} size="sm" colorScheme="green" />
            </CardBody>
          </Card>

          <Card borderTop="4px solid" borderTopColor="green.400">
            <CardBody>
              <Text fontSize="md" fontWeight="medium" mb={3}>System Account</Text>
              <HStack mb={2} justify="space-between">
                <Text color="gray.600" fontSize="sm">Project cost: 13000$</Text>
                <Text color="gray.600" fontSize="sm">Total spending: 6000$</Text>
              </HStack>
              <HStack justify="space-between" mb={2}>
                <Text color="gray.600" fontSize="sm">Completed</Text>
                <Text color="gray.600" fontSize="sm">100%</Text>
              </HStack>
              <Progress value={100} size="sm" colorScheme="green" />
            </CardBody>
          </Card>
        </SimpleGrid>
      </Box>

      {/* Charts Section */}
      <Box mb={8}>
        <Heading size="lg" mb={2}>Cashflow Analysis</Heading>
        <Text color="gray.600" mb={4}>
          Effortlessly view and manage your accounts in one place with real-time balance updates.
        </Text>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <Card>
            <CardBody height="300px">
              <BarChart
                data={[
                  { month: 'Jan', income: 300, outcome: 200 },
                  { month: 'Feb', income: 200, outcome: 150 },
                  { month: 'Mar', income: 400, outcome: 300 },
                  { month: 'Apr', income: 300, outcome: 250 },
                  { month: 'May', income: 500, outcome: 400 }
                ]}
                categories={['income', 'outcome']}
                index="month"
                height="250px"
                colors={['#38B2AC', '#2C7A7B']}
              />
            </CardBody>
          </Card>

          <Card>
            <CardBody height="300px">
              <Heading size="md" mb={4}>Monthly Analysis</Heading>
              <Box position="relative" height="250px">
                <AreaChart
                  data={[
                    { day: 1, lastMonth: 3004, thisMonth: 4504 },
                    { day: 2, lastMonth: 3200, thisMonth: 4200 },
                    { day: 3, lastMonth: 2800, thisMonth: 4400 },
                    { day: 4, lastMonth: 2600, thisMonth: 4100 },
                    { day: 5, lastMonth: 2700, thisMonth: 4300 },
                    { day: 6, lastMonth: 2800, thisMonth: 4000 },
                    { day: 7, lastMonth: 2900, thisMonth: 4200 },
                    { day: 8, lastMonth: 3000, thisMonth: 4504 }
                  ]}
                  categories={['lastMonth', 'thisMonth']}
                  index="day"
                  height="200px"
                  colors={['#3182CE', '#38B2AC']} // Blue for last month, Teal for this month
                  yAxisWidth={65}
                  valueFormatter={(value) => `$${value}`}
                />
              </Box>
              <HStack justify="center" spacing={8} mt={4}>
                <HStack>
                  <Box w="3" h="3" borderRadius="full" bg="blue.500" />
                  <Text color="gray.600">Last Month</Text>
                  <Text fontWeight="medium">$3,004</Text>
                </HStack>
                <HStack>
                  <Box w="3" h="3" borderRadius="full" bg="teal.500" />
                  <Text color="gray.600">This Month</Text>
                  <Text fontWeight="medium">$4,504</Text>
                </HStack>
              </HStack>
            </CardBody>
          </Card>
        </SimpleGrid>
      </Box>

      {/* Transactions Section */}
      <Box mb={6}>
        <Heading size="lg" mb={2}>Transactions</Heading>
        <Text color="gray.600" mb={4}>
          Effortlessly view and manage your accounts in one place with real-time balance updates.
        </Text>

        <SimpleGrid columns={1} spacing={4}>
          {transactions.map((transaction, index) => (
            <Card 
              key={index}
              borderLeftWidth="4px"
              borderLeftColor="green.400"
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
                    color={transaction.isPositive ? "green.500" : undefined}
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
  )

  return (
    <Page isLoading={isLoading}>
      <PageHeader title="Dashboard" toolbar={toolbar} footer={footer} />
      <PageBody
        contentWidth="container.2xl"
        bg="page-body-bg-subtle"
        py={{ base: 4, xl: 8 }}
        px={{ base: 4, xl: 8 }}
      >
        {body}
      </PageBody>
    </Page>
  )
}
