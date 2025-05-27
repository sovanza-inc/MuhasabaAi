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
import { useRouter } from 'next/navigation'

import { SegmentedControl } from '@acme/ui/segmented-control'
import { api } from '#lib/trpc/react'
import { TRPCClientError } from '@trpc/client'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'

const defaultIntervals: PricingPeriod[] = [
  {
    id: 'month',
    label: 'Monthly',
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
  const router = useRouter()
  const [workspace] = useCurrentWorkspace()
  const createCheckoutSession = api.billing.createCheckoutSession.useMutation({
    onMutate: (variables) => {
      console.log('Starting checkout session creation with:', {
        planId: variables.planId,
        workspaceId: variables.workspaceId,
        successUrl: variables.successUrl,
        cancelUrl: variables.cancelUrl
      })
    },
    onSuccess: (data) => {
      if (data.url) {
        console.log('Checkout session created successfully:', {
          url: data.url,
          workspace: workspace.id,
          slug: workspace.slug
        })
        router.push(data.url)
      } else {
        console.error('No URL returned from checkout session creation')
      }
    },
    onError: (error) => {
      console.error('Error creating checkout session:', {
        error,
        workspace: workspace.id,
        errorMessage: error.message,
        data: error.data
      })
      setLoading(false)
    }
  })

  const initializeSubscription = api.billing.initializeSubscription.useMutation()

  const updatePlan = async (plan: BillingPlan) => {
    setLoading(true)
    console.log('Starting plan update:', {
      planId: plan.id,
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug,
      origin: window.location.origin
    })
    try {
      // First initialize the subscription
      await initializeSubscription.mutateAsync({
        planId: plan.id,
        workspaceId: workspace.id,
      })

      const successUrl = `${window.location.origin}/${workspace.slug}?success=true`
      const cancelUrl = `${window.location.origin}/${workspace.slug}?canceled=true`
      
      console.log('Calling createCheckoutSession with:', {
        planId: plan.id,
        workspaceId: workspace.id,
        successUrl,
        cancelUrl
      })

      await createCheckoutSession.mutateAsync({
        planId: plan.id,
        workspaceId: workspace.id,
        successUrl,
        cancelUrl,
      })
    } catch (error) {
      console.error('Error in updatePlan:', {
        error,
        planId: plan.id,
        workspaceId: workspace.id,
        errorMessage: error instanceof TRPCClientError ? error.message : String(error),
        errorData: error instanceof TRPCClientError ? error.data : undefined
      })
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
                    ) : plan.id.includes('free') ? (
                      <Button variant="secondary" isDisabled>
                        Free plan
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
