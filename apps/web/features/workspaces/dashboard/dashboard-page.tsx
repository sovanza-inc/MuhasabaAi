'use client'

import { useState } from 'react'

import {
  Card,
  Grid,
  GridItem,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
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
import { FaDiscord, FaGithub, FaTwitter } from 'react-icons/fa'

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

import { IntroTour } from './intro-tour'
import { Activity } from './metrics/activity'
import { Metric } from './metrics/metric'
import { RevenueChart } from './metrics/revenue-chart'
import { SalesByCountry } from './metrics/sales-by-country'

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

  const toolbar = (
    <Toolbar className="overview-toolbar" variant="ghost">
      <ToolbarButton
        as="a"
        href="https://twitter.com/intent/tweet?text=Check%20out%20%40saas_js,%20an%20advanced%20component%20library%20for%20SaaS%20products%20build%20with%20%40chakra_ui.%20https%3A//saas-ui.dev%20"
        icon={<FaTwitter />}
        label="Share on Twitter"
      />
      <ToolbarButton
        as="a"
        href="https://github.com/saas-js/saas-ui"
        icon={<FaGithub />}
        label="Star on Github"
      />
      <ToolbarButton
        as="a"
        href="https://discord.gg/4PmJGFcAjX"
        icon={<FaDiscord />}
        label="Join Discord"
      />
      <ToolbarButton
        as="a"
        href="https://saas-ui.lemonsqueezy.com/checkout/buy/5c76854f-738a-46b8-b32d-932a97d477f5"
        label="Buy Pro"
        colorScheme="primary"
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
    <>
      <IntroTour />
      <Grid
        templateColumns={['repeat(1, 1fr)', null, null, 'repeat(2, 1fr)']}
        gridAutoColumns="fr1"
        width="100%"
        gap={{ base: 4, xl: 8 }}
        pb="8"
      >
        <GridItem colSpan={{ base: 1, lg: 2 }} maxW="100vw">
          <Card>
            <Tabs variant="unstyled" tabIndex={0} isLazy>
              <TabList
                overflow="hidden"
                borderTopRadius="md"
                display="flex"
                flexWrap="wrap"
              >
                {data?.charts.map((metric) => (
                  <Tab
                    key={metric.id}
                    id={metric.id}
                    alignItems="stretch"
                    justifyContent="stretch"
                    flex={{ base: '0 0 50%', lg: '1' }}
                    height="auto"
                    textAlign="left"
                    borderBottomWidth="1px"
                    borderRightWidth="1px"
                    _hover={{
                      bg: 'whiteAlpha.100',
                      _dark: {
                        bg: 'whiteAlpha.100',
                      },
                    }}
                    _selected={{
                      borderBottomWidth: '2px',
                      borderBottomColor: 'primary.500',
                      display: 'flex',
                    }}
                    _last={{
                      borderRightWidth: '0',
                    }}
                  >
                    <Metric {...metric} />
                  </Tab>
                ))}
              </TabList>
              <TabPanels>
                {data?.charts.map((metric) => (
                  <TabPanel key={metric.id} pt="8">
                    <RevenueChart data={metric.data} />
                  </TabPanel>
                ))}
              </TabPanels>
            </Tabs>
          </Card>
        </GridItem>
        <GridItem as={SalesByCountry} data={data?.sales} />
        <GridItem as={Activity} data={data?.activity} />
      </Grid>
    </>
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
