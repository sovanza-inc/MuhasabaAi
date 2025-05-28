'use client'

import * as React from 'react'
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
import { CheckoutPage } from '#features/billing/components/CheckoutPage'

export function PlansPage() {
  const snackbar = useSnackbar()
  const { currentPlan, plans } = useBilling()
  const [workspace] = useCurrentWorkspace()
  const utils = api.useUtils()
  const [selectedPlan] = React.useState<BillingPlan | null>(null)

  // Check for success parameter in URL and show success message
  React.useEffect(() => {
    const url = new URL(window.location.href)
    const success = url.searchParams.get('success')
    
    if (success === 'true') {
      url.searchParams.delete('success')
      window.history.replaceState({}, '', url.toString())
      utils.workspaces.invalidate()
      snackbar.success({
        title: 'Payment successful',
        description: 'Your subscription has been updated. It may take a moment to reflect in your account.',
      })
    }
  }, [snackbar, utils.workspaces])

  if (selectedPlan) {
    return (
      <CheckoutPage
        planId={selectedPlan.id}
        price={selectedPlan.features.find(f => f.price)?.price || 0}
        currency={selectedPlan.currency}
      />
    );
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
        intervals={[]}
      />
    </SettingsPage>
  )
}
