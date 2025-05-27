import { createStripeWebhookHandler } from '@acme/billing-stripe'
import type Stripe from 'stripe'

export const POST = createStripeWebhookHandler({
  debug: true,
  onEvent: async (event) => {
    console.log('[Stripe] Received event:', {
      type: event.type,
      id: event.id,
    })

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY!)

      // Get customer details
      const customer = await stripe.customers.retrieve(session.customer as string) as Stripe.Customer
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

      // Get userId from metadata
      const userId = customer.metadata?.userId || session.metadata?.userId
      if (!userId) {
        console.error('[Stripe] No userId found in metadata')
        return
      }

      // Update user_subscriptions table
      const { db, userSubscriptions } = await import('@acme/db')
      const { eq } = await import('drizzle-orm')

      try {
        const status = subscription.status === 'active' ? 'active' as const : 'free' as const
        const values = {
          userId,
          planId: subscription.metadata?.planId || session.metadata?.planId || '',
          status,
          stripeCustomerId: customer.id,
          stripeSubscriptionId: subscription.id,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        } as const

        // First try to find if a subscription exists
        const existingSub = await db
          .select()
          .from(userSubscriptions)
          .where(eq(userSubscriptions.userId, userId))
          .limit(1)

        if (existingSub.length > 0) {
          // Update existing subscription
          await db
            .update(userSubscriptions)
            .set(values)
            .where(eq(userSubscriptions.userId, userId))
        } else {
          // Insert new subscription
          await db
            .insert(userSubscriptions)
            .values(values)
        }

        console.log('[Stripe] Successfully updated user_subscriptions table with values:', values)
      } catch (error) {
        console.error('[Stripe] Error updating user_subscriptions:', error)
      }
    }
  },
})
