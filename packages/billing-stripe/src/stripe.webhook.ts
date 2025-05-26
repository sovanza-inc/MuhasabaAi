import Stripe from 'stripe'
import { db, userSubscriptions } from '@acme/db'
import { eq } from 'drizzle-orm'

import { StripeAdapter } from './stripe.adapter'

const webhookEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
])

export const createStripeWebhookHandler =
  (options: {
    onEvent?: (event: Stripe.Event) => Promise<void>
    debug?: boolean
  }) =>
  async (req: Request) => {
    const signature = req.headers.get('stripe-signature')

    const adapter = new StripeAdapter()

    const event = adapter.stripe.webhooks.constructEvent(
      await req.text(),
      signature ?? '',
      process.env.STRIPE_WEBHOOK_SECRET ?? '',
    )

    if (options.debug) {
      console.log('[Stripe] Received event:', event)
    }

    if (webhookEvents.has(event.type)) {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription
          await adapter.syncSubscriptionStatus({
            subscriptionId: subscription.id,
          })

          // Update our new user_subscriptions table
          const customer = subscription.customer as Stripe.Customer
          const userId = customer.metadata.userId // Make sure to set this when creating customer

          if (userId) {
            await db
              .insert(userSubscriptions)
              .values({
                id: userId,
                status: subscription.status === 'active' ? 'active' : 'free',
                stripeCustomerId: customer.id,
                stripeSubscriptionId: subscription.id,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
              })
              .onConflictDoUpdate({
                target: userSubscriptions.id,
                set: {
                  status: subscription.status === 'active' ? 'active' : 'free',
                  stripeCustomerId: customer.id,
                  stripeSubscriptionId: subscription.id,
                  currentPeriodStart: new Date(subscription.current_period_start * 1000),
                  currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                  cancelAtPeriodEnd: subscription.cancel_at_period_end,
                },
              })
          }
          break
        }
        case 'checkout.session.completed': {
          const checkoutSession = event.data.object as Stripe.Checkout.Session
          if (
            checkoutSession.mode === 'subscription' &&
            checkoutSession.subscription
          ) {
            const subscriptionId =
              typeof checkoutSession.subscription === 'string'
                ? checkoutSession.subscription
                : checkoutSession.subscription.id

            await adapter.syncSubscriptionStatus({
              subscriptionId,
              initial: true,
            })
          }
          break
        }
        default: {
          console.log('[Stripe] Unhandled event:', event)
        }
      }
    }

    if (options.onEvent) {
      await options.onEvent(event)
    }

    return Response.json({ received: true })
  }
