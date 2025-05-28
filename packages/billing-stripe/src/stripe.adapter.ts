import Stripe from 'stripe'

import * as billingService from '@acme/api/modules/billing/billing.service'
import type { BillingAdapter } from '@acme/api'
import { db, userSubscriptions } from '@acme/db'

import pkg from '../package.json'
import { toISODateTime } from './utils'

export class StripeAdapter implements BillingAdapter {
  public stripe: Stripe

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
      apiVersion: '2024-12-18.acacia',
      appInfo: {
        name: pkg.name,
        version: pkg.version,
      },
    })
  }

  async findCustomerId(params: {
    id?: string
    accountId?: string
    email?: string
  }) {
    if (params.id) {
      const customer = await this.stripe.customers.retrieve(params.id)

      return customer.id
    }

    if (params.email) {
      const customers = await this.stripe.customers.list({
        limit: 1,
        email: params.email,
      })

      return customers.data[0]?.id ?? null
    }

    if (params.accountId) {
      const customers = await this.stripe.customers.search({
        query: `metadata['accountId']:'${params.accountId}'`,
      })

      return customers.data[0]?.id ?? null
    }

    return null
  }

  async createCustomer(params: {
    accountId: string
    name?: string | null
    email?: string | null
    userId?: string
  }): Promise<string> {
    const customer = await this.stripe.customers.create({
      metadata: {
        accountId: params.accountId,
        userId: params.userId || '',
      },
      ...(params.name ? { name: params.name } : {}),
      ...(params.email ? { email: params.email } : {}),
    })

    return customer.id
  }

  async updateCustomer(params: {
    customerId: string
    accountId: string
    email?: string
    name?: string
    userId?: string
  }) {
    await this.stripe.customers.update(params.customerId, {
      name: params.name,
      email: params.email,
      metadata: {
        accountId: params.accountId,
        userId: params.userId || '',
      },
    })
  }

  async createCheckoutSession(params: {
    customerId: string
    planId: string
    userId: string
    counts?: Record<string, number>
    successUrl: string
    cancelUrl: string
  }) {
    try {
      const plan = await billingService.getPlan(params.planId)

      if (!plan || !plan.active) {
        console.log(`Plan ${params.planId} not found in database, checking config...`)

        const { plans } = await import('@acme/config')

        const configPlan = plans.find((p) => p.id === params.planId)

        if (!configPlan || !configPlan.active) {
          throw new Error(`Plan ${params.planId} not found in config`)
        }

        const lineItems = configPlan.features
          ?.filter((feature) => feature.priceId)
          .map((feature) => {
            return {
              price: feature.priceId,
              quantity:
                feature.type === 'per_unit'
                  ? (params.counts?.[feature.id] ?? 1)
                  : 1,
            }
          })

        if (!lineItems || lineItems.length === 0) {
          throw new Error('Invalid pricing plan')
        }

        // Then create the checkout session
        const response = await this.stripe.checkout.sessions.create({
          mode: 'subscription',
          payment_method_types: ['card'],
          billing_address_collection: 'required',
          customer: params.customerId,
          line_items: lineItems,
          allow_promotion_codes: true,
          metadata: {
            planId: params.planId,
            userId: params.userId,
          },
          subscription_data: {
            metadata: {
              planId: params.planId,
              userId: params.userId,
            },
          },
          success_url: params.successUrl,
          cancel_url: params.cancelUrl,
        })

        return {
          id: response.id,
          url: response.url ?? undefined,
        }
      }

      const lineItems = plan.features
        ?.filter((feature) => feature.priceId)
        .map((feature) => {
          return {
            price: feature.priceId,
            quantity:
              feature.type === 'per_unit'
                ? (params.counts?.[feature.id] ?? 1)
                : 1,
          }
        })

      if (!lineItems || lineItems.length === 0) {
        throw new Error('Invalid pricing plan')
      }

      // Then create the checkout session
      const response = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        billing_address_collection: 'required',
        customer: params.customerId,
        line_items: lineItems,
        allow_promotion_codes: true,
        metadata: {
          planId: params.planId,
          userId: params.userId,
        },
        subscription_data: {
          metadata: {
            planId: params.planId,
            userId: params.userId,
          },
        },
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
      })

      return {
        id: response.id,
        url: response.url ?? undefined,
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      throw error
    }
  }

  async syncSubscriptionStatus(params: {
    subscriptionId: string
    initial?: boolean
  }) {
    const subscription = await this.stripe.subscriptions.retrieve(
      params.subscriptionId,
    )

    const customer = await this.stripe.customers.retrieve(
      subscription.customer as string,
    ) as Stripe.Customer

    const accountId = customer.metadata?.accountId
    const userId = customer.metadata?.userId

    if (!accountId) {
      throw new Error('No accountId found in customer metadata')
    }

    // Update billing_subscriptions table
    await billingService.upsertSubscription({
      id: params.subscriptionId,
      accountId,
      planId: subscription.metadata?.planId || '',
      metadata: subscription.metadata,
      status: subscription.status,
      quantity: 1,
      startedAt: toISODateTime(subscription.start_date),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelAt: subscription.cancel_at
        ? toISODateTime(subscription.cancel_at)
        : null,
      canceledAt: subscription.canceled_at
        ? toISODateTime(subscription.canceled_at)
        : null,
      currentPeriodStart: toISODateTime(subscription.current_period_start),
      currentPeriodEnd: toISODateTime(subscription.current_period_end),
      createdAt: toISODateTime(subscription.created),
      endedAt: subscription.ended_at
        ? toISODateTime(subscription.ended_at)
        : null,
      trialEndsAt: subscription.trial_end
        ? toISODateTime(subscription.trial_end)
        : null,
    })

    // Update user_subscriptions table
    if (userId) {
      try {
        await db
          .insert(userSubscriptions)
          .values({
            userId,
            planId: subscription.metadata?.planId || '',
            status: subscription.status === 'active' ? 'active' : 'free',
            stripeCustomerId: customer.id,
            stripeSubscriptionId: subscription.id,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          })
          .onConflictDoUpdate({
            target: [userSubscriptions.userId],
            set: {
              planId: subscription.metadata?.planId || '',
              status: subscription.status === 'active' ? 'active' : 'free',
              stripeCustomerId: customer.id,
              stripeSubscriptionId: subscription.id,
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
          })
      } catch (error) {
        console.error('[Stripe] Error updating user_subscriptions in syncSubscriptionStatus:', error)
      }
    }

    if (params.initial) {
      await billingService.updateAccount({
        id: accountId,
        customerId: customer.id,
        email: customer.email,
      })
    }
  }

  async updateSubscription(params: {
    subscriptionId: string
    planId: string
    status?: string
    counts?: Record<string, number>
  }) {
    const subscription = await this.stripe.subscriptions.retrieve(
      params.subscriptionId,
    )

    const plan = await billingService.getPlan(params.planId)

    if (!plan) {
      throw new Error(`Plan ${params.planId} not found`)
    }

    const lineItems = plan.features
      ?.filter((feature) => feature.priceId)
      .map((feature, i) => {
        const quantity = subscription.items.data[i].quantity
        return {
          id: subscription.items.data[i].id,
          price: feature.priceId,
          quantity:
            feature.type === 'per_unit'
              ? (params.counts?.[feature.id] ?? quantity)
              : undefined,
        }
      })

    if (!lineItems || lineItems.length === 0) {
      throw new Error('Invalid pricing plan')
    }

    await this.stripe.subscriptions.update(params.subscriptionId, {
      items: lineItems,
      metadata: {
        planId: params.planId,
      },
    })

    await this.syncSubscriptionStatus({
      subscriptionId: params.subscriptionId,
    })
  }

  async createBillingPortalSession(params: {
    customerId: string
    returnUrl: string
  }) {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    })

    return {
      url: session.url,
    }
  }

  async listInvoices(params: { customerId: string }) {
    const invoices = await this.stripe.invoices.list({
      customer: params.customerId,
    })

    return invoices.data.map((invoice) => {
      return {
        number: invoice.number!,
        date: new Date(invoice.created * 1000),
        status: invoice.status as string,
        total: invoice.total / 100,
        currency: invoice.currency,
        url: invoice.hosted_invoice_url ?? undefined,
      }
    })
  }

  async registerUsage(params: {
    customerId: string
    featureId: string
    quantity: number
  }) {
    await this.stripe.billing.meterEvents.create({
      event_name: params.featureId,
      payload: {
        value: String(params.quantity),
        stripe_customer_id: params.customerId,
      },
    })
  }

  async createPaymentIntent(params: {
    amount: number
    currency: string
    metadata?: Record<string, string>
    receipt_email?: string
  }) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100), // Convert to cents
      currency: params.currency.toLowerCase(),
      metadata: params.metadata,
      receipt_email: params.receipt_email,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret!,
    };
  }
}
