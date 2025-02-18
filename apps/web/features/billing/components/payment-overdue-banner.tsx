'use client'

import { useBilling } from '@saas-ui-pro/billing'
import {
  Banner,
  BannerActions,
  BannerContent,
  BannerDescription,
  BannerTitle,
} from '@saas-ui/react'

import { Link } from '@acme/next'

import { usePath } from '#features/common/hooks/use-path'

export function PaymentOverdueBanner() {
  const billingPath = usePath('/settings/billing')

  const billing = useBilling()

  if (billing?.status !== 'past_due') {
    return null
  }

  return (
    <Banner status="warning" variant="solid">
      <BannerContent alignItems="center" justifyContent="center">
        <BannerTitle>Your payment is overdue.</BannerTitle>
        <BannerDescription>
          Please update your payment information to avoid service interruption.
        </BannerDescription>
        <BannerActions>
          <Link
            href={billingPath}
            fontWeight="semibold"
            textDecoration="underline"
          >
            Manage billing
          </Link>
        </BannerActions>
      </BannerContent>
    </Banner>
  )
}
