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
          const customer = await adapter.stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer
          const userId = customer.metadata?.userId // Make sure to set this when creating customer

          console.log('[Stripe] Processing subscription update:', {
            subscriptionId: subscription.id,
            customerId: customer.id,
            userId,
            metadata: customer.metadata,
            status: subscription.status,
          })

          if (userId) {
            try {
              const planId = subscription.metadata?.planId || ''
              const status = subscription.status === 'active' ? 'active' as const : 'free' as const
              const values = {
                userId,
                planId,
                status,
                stripeCustomerId: customer.id,
                stripeSubscriptionId: subscription.id,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
              } as const

              // First try to find if a subscription already exists
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
              console.error('[Stripe] Error updating user_subscriptions for subscription update:', error)
            }
          } else {
            console.error('[Stripe] No userId found in customer metadata for subscription update:', customer.metadata)
          }
          break
        }
        case 'checkout.session.completed': {
          const checkoutSession = event.data.object as Stripe.Checkout.Session
          if (
            checkoutSession.mode === 'subscription' &&
            checkoutSession.subscription &&
            checkoutSession.customer
          ) {
            const subscriptionId =
              typeof checkoutSession.subscription === 'string'
                ? checkoutSession.subscription
                : checkoutSession.subscription.id

            // Get the full subscription details
            const subscription = await adapter.stripe.subscriptions.retrieve(subscriptionId)
            const customer = await adapter.stripe.customers.retrieve(checkoutSession.customer as string) as Stripe.Customer
            const workspaceId = customer.metadata?.accountId
            // Try to get userId from multiple places
            const userId = customer.metadata?.userId

            if (!userId) {
              console.error('[Stripe] No userId found in customer metadata:', customer.metadata)
              return // Skip processing if no userId is found
            }

            // Ensure subscription metadata has userId
            if (userId && subscription.metadata?.userId !== userId) {
              await adapter.stripe.subscriptions.update(subscriptionId, {
                metadata: {
                  ...subscription.metadata,
                  userId,
                  planId: subscription.metadata?.planId || checkoutSession.metadata?.planId || '',
                }
              })
            }

            console.log('[Stripe] Processing checkout session completion:', {
              subscriptionId,
              customerId: customer.id,
              workspaceId,
              userId,
              metadata: {
                customer: customer.metadata,
                subscription: subscription.metadata,
                session: checkoutSession.metadata,
              },
            })

            // First update the user_subscriptions table
            if (userId) {
              try {
                const planId = subscription.metadata?.planId || checkoutSession.metadata?.planId || ''
                const status = subscription.status === 'active' ? 'active' as const : 'free' as const
                const values = {
                  userId,
                  planId,
                  status,
                  stripeCustomerId: customer.id,
                  stripeSubscriptionId: subscription.id,
                  currentPeriodStart: new Date(subscription.current_period_start * 1000),
                  currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                  cancelAtPeriodEnd: subscription.cancel_at_period_end,
                } as const

                // First try to find if a subscription already exists
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
            } else {
              console.error('[Stripe] No userId found in customer metadata:', customer.metadata)
            }

            // Then update the billing_subscriptions table
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
