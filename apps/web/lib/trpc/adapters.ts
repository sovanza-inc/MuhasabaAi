import 'server-only'

import type { ApiAdapters } from '@acme/api'
import { StripeAdapter } from '@acme/billing-stripe'

export const createAdapters = (): ApiAdapters => {
  return {
    billing: new StripeAdapter(),
  }
}
