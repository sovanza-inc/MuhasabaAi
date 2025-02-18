'use client'

import { Box, Stack } from '@chakra-ui/react'
import { BillingPlan, useBilling } from '@saas-ui-pro/billing'
import { useSnackbar } from '@saas-ui/react'

import { features } from '@acme/config'
import { SettingsPage } from '@acme/ui/settings-page'

import { PricingTable } from '#features/billing/components/pricing-table'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import { api } from '#lib/trpc/react'

import { BillingStatus } from './billing-status'
import { ManageBillingButton } from './manage-billing-button'

export function PlansPage() {
  const snackbar = useSnackbar()

  const { currentPlan, plans } = useBilling()

  const [workspace] = useCurrentWorkspace()

  const utils = api.useUtils()

  const createCheckoutSession = api.billing.createCheckoutSession.useMutation()

  const upgradePlan = api.billing.setSubscriptionPlan.useMutation({
    onSuccess() {
      utils.workspaces.invalidate()
    },
  })

  const onUpdatePlan = async (plan: BillingPlan) => {
    try {
      if (!workspace.subscription.accountId) {
        const result = await createCheckoutSession.mutateAsync({
          workspaceId: workspace.id,
          planId: plan.id,
          successUrl: `${window.location.href}?success=true`,
          cancelUrl: `${window.location.href}`,
        })

        if (result.url) {
          window.location.href = result.url
        }
      } else {
        await upgradePlan.mutateAsync({
          workspaceId: workspace.id,
          planId: plan.id,
        })

        snackbar.success({
          title: 'Plan upgraded',
          description: `You are now on the ${plan.name} plan.`,
        })
      }
    } catch (error: any) {
      console.error(error)
      snackbar.error({
        title: 'Failed to upgrade plan',
        description: error.message,
      })
    }
  }

  return (
    <SettingsPage
      title="Billing Plans"
      description={
        <Stack alignItems="flex-start">
          <Box>
            <BillingStatus />
          </Box>

          <ManageBillingButton workspaceId={workspace.id} />
        </Stack>
      }
    >
      <PricingTable
        planId={currentPlan?.id}
        plans={plans}
        features={features}
        onUpdatePlan={onUpdatePlan}
      />
    </SettingsPage>
  )
}
