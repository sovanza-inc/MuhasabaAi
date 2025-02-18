import * as React from 'react'

import {
  Box,
  Button,
  HStack,
  Heading,
  Icon,
  Stack,
  StackProps,
  Table,
  Tag,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
} from '@chakra-ui/react'
import { BillingInterval, BillingPlan } from '@saas-ui-pro/billing'
import { LuCheck } from 'react-icons/lu'

import { SegmentedControl } from '@acme/ui/segmented-control'

const defaultIntervals: PricingPeriod[] = [
  {
    id: 'month',
    label: 'Pay monthly',
  },
  {
    id: 'year',
    label: 'Pay yearly',
  },
]

export interface PricingFeature {
  id: string
  label: string
  description?: string
}

export interface PricingPeriod {
  id: BillingInterval
  label: string
}

export interface PricingTableProps {
  planId?: string | null
  plans: BillingPlan[]
  features: PricingFeature[]
  onUpdatePlan?(plan: BillingPlan): Promise<void>
  defaultInterval?: BillingInterval
  intervals?: PricingPeriod[]
}

export const PricingTable: React.FC<PricingTableProps> = (props) => {
  const {
    planId,
    plans: allPlans,
    features,
    onUpdatePlan,
    defaultInterval = 'month',
    intervals = defaultIntervals,
    ...rest
  } = props
  const [interval, setInterval] = React.useState(defaultInterval)

  const plans = React.useMemo(() => {
    return allPlans.filter((plan) => plan.interval === interval)
  }, [allPlans, interval])

  const currentPlan = allPlans.find((plan) => plan.id === planId)

  const [loading, setLoading] = React.useState(false)
  const updatePlan = async (plan: BillingPlan) => {
    setLoading(true)
    try {
      await onUpdatePlan?.(plan)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box {...rest}>
      <Table variant="unstyled" sx={{ tableLayout: 'fixed' }}>
        <Thead>
          <Tr>
            <Td rowSpan={2} verticalAlign="bottom">
              {intervals?.length > 1 && (
                <PricingTablePeriod
                  periods={intervals}
                  period={interval}
                  onChange={(id) => setInterval(id as BillingInterval)}
                  pb="10"
                />
              )}
            </Td>
            {plans.map((plan) => {
              return (
                <Th key={plan.id} textTransform="none" letterSpacing="normal">
                  <Stack spacing="1">
                    <Heading as="h3" size="md" fontWeight="semibold">
                      {plan.name}{' '}
                      {plan.metadata.discount && (
                        <Tag size="sm">-{plan.metadata.discount}</Tag>
                      )}
                    </Heading>

                    {plan.description && (
                      <Text color="muted" fontWeight="normal">
                        {plan.description}
                      </Text>
                    )}
                  </Stack>
                </Th>
              )
            })}
          </Tr>
          <Tr borderBottomWidth="1px">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlan?.id
              const isDowngrade =
                currentPlan &&
                allPlans.indexOf(plan) < allPlans.indexOf(currentPlan)

              return (
                <Th
                  key={plan.id}
                  textTransform="none"
                  fontWeight="normal"
                  letterSpacing="normal"
                >
                  <Stack pb="10" spacing="4">
                    <HStack>
                      <Heading size="lg">{plan.metadata.price}</Heading>
                      <Text color="muted">{plan.metadata.priceLabel}</Text>
                    </HStack>

                    {isCurrent ? (
                      <Button variant="secondary" isDisabled>
                        Current plan
                      </Button>
                    ) : (
                      <Button
                        variant={isDowngrade ? 'secondary' : 'primary'}
                        isDisabled={loading}
                        onClick={() => updatePlan?.(plan)}
                      >
                        {isDowngrade ? 'Downgrade' : 'Upgrade'}
                      </Button>
                    )}
                  </Stack>
                </Th>
              )
            })}
          </Tr>
        </Thead>
        <Tbody>
          {features.map((feature) => {
            return (
              <Tr key={feature.id}>
                <Td borderBottomWidth="1px">
                  {feature.description ? (
                    <Tooltip label={feature.description} placement="auto-end">
                      <Box
                        as="span"
                        textDecoration="underline dotted rgb(100, 100, 100)"
                        cursor="default"
                      >
                        {feature.label}
                      </Box>
                    </Tooltip>
                  ) : (
                    feature.label
                  )}
                </Td>

                {plans.map((plan) => {
                  const item = plan.features.find((f) => f.id === feature.id)
                  return (
                    <Td key={plan.id} borderBottomWidth="1px">
                      <PricingTableFeature
                        value={item?.label ?? item?.limit ?? !!item}
                      />
                    </Td>
                  )
                })}
              </Tr>
            )
          })}
        </Tbody>
      </Table>
    </Box>
  )
}

interface PricingTableFeature {
  value: string | number | boolean
}

const PricingTableFeature: React.FC<PricingTableFeature> = ({ value }) => {
  return (
    <HStack>
      {value && <Icon as={LuCheck} color="primary.500" />}
      {typeof value !== 'boolean' && <Text color="muted">{value}</Text>}
    </HStack>
  )
}

interface PricingTablePeriodProps extends Omit<StackProps, 'onChange'> {
  periods: PricingPeriod[]
  period: string
  onChange(id: string): void
}

const PricingTablePeriod: React.FC<PricingTablePeriodProps> = (props) => {
  const { periods, period, onChange, ...rest } = props
  return (
    <Stack {...rest} alignItems="flex-start">
      <Text>Billing period</Text>
      <SegmentedControl
        size="xs"
        segments={periods}
        onChange={onChange}
        value={period}
      />
    </Stack>
  )
}
