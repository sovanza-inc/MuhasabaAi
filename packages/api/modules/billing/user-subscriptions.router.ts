import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '#trpc'
import {
  CreateUserSubscriptionSchema,
  UpdateUserSubscriptionSchema,
} from './user-subscriptions.schema'
import * as userSubscriptionService from './user-subscriptions.service'

export const userSubscriptionsRouter = createTRPCRouter({
  // Get current user's subscription
  getMySubscription: protectedProcedure.query(async ({ ctx }) => {
    return userSubscriptionService.getUserSubscriptionByUserId(ctx.session.user.id)
  }),

  // Create a new subscription
  create: protectedProcedure
    .input(CreateUserSubscriptionSchema)
    .mutation(async ({ input, ctx }) => {
      // Check if user already has a subscription
      const existingSubscription = await userSubscriptionService.getUserSubscriptionByUserId(
        ctx.session.user.id
      )

      if (existingSubscription) {
        throw new Error('User already has a subscription')
      }

      return userSubscriptionService.createUserSubscription({
        ...input,
        userId: ctx.session.user.id,
      })
    }),

  // Update a subscription
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: UpdateUserSubscriptionSchema,
      })
    )
    .mutation(async ({ input }) => {
      return userSubscriptionService.updateUserSubscription(input.id, input.data)
    }),

  // Webhook handler for Stripe events
  webhook: createTRPCRouter({
    customerSubscriptionUpdated: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          customer: z.string(),
          status: z.enum(['active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired', 'trialing']),
          current_period_start: z.number(),
          current_period_end: z.number(),
          cancel_at_period_end: z.boolean(),
        })
      )
      .mutation(async ({ input }) => {
        const statusMap = {
          active: 'active',
          past_due: 'active', // Still active but payment failed
          unpaid: 'expired',
          canceled: 'cancelled',
          incomplete: 'free',
          incomplete_expired: 'expired',
          trialing: 'active',
        } as const

        const subscription = await userSubscriptionService.updateUserSubscriptionByStripeCustomerId(
          input.customer,
          {
            status: statusMap[input.status] || 'free',
            stripeSubscriptionId: input.id,
            currentPeriodStart: new Date(input.current_period_start * 1000),
            currentPeriodEnd: new Date(input.current_period_end * 1000),
            cancelAtPeriodEnd: input.cancel_at_period_end,
          }
        )

        return { success: true, subscription }
      }),
  }),
})
