import { createStripeWebhookHandler } from '@acme/billing-stripe'

export const POST = createStripeWebhookHandler({
  // onEvent: async (event) => {
  //   console.log('[Stripe] Received event:', event.type)
  // },
})
