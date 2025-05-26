import { z } from 'zod'

import {
  TRPCError,
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from '#trpc'

import { UpdateBillingAccountSchema } from './billing.schema'
import {
  getAccount,
  getFeatureCounts,
  listPlans,
  updateAccount,
  upsertAccount,
} from './billing.service'

export const billingRouter = createTRPCRouter({
  /**
   * Get available billing plans
   * @public
   */
  plans: publicProcedure.query(async () => {
    return listPlans()
  }),

  /**
   * Get the billing account information
   */
  account: adminProcedure.query(async ({ input }) => {
    return getAccount(input.workspaceId)
  }),

  /**
   * Update billing details
   */
  updateBillingDetails: adminProcedure
    .input(UpdateBillingAccountSchema.pick({ email: true }))
    .mutation(async ({ input, ctx }) => {
      const account = await getAccount(input.workspaceId)

      if (!account) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found',
        })
      }

      let customerId = account.customerId

      if (!customerId && ctx.adapters.billing?.createCustomer) {
        customerId = await ctx.adapters.billing.createCustomer?.({
          accountId: input.workspaceId,
          name: ctx.workspace?.name,
          email: input?.email ?? undefined,
          userId: ctx.session?.user?.id
        })

        await upsertAccount({
          id: input.workspaceId,
          email: input.email,
          customerId,
        })

        return
      }

      await updateAccount({
        id: input.workspaceId,
        email: input.email,
      })

      if (
        ctx.adapters.billing?.updateCustomer &&
        input.email &&
        account.customerId
      ) {
        await ctx.adapters.billing?.updateCustomer({
          customerId: account.customerId,
          accountId: account.id,
          name: ctx.workspace?.name,
          email: input.email,
        })
      }
    }),

  /**
   * List invoices for a customer (workspace)
   */
  listInvoices: adminProcedure.query(async ({ input, ctx }) => {
    const account = await getAccount(input.workspaceId)

    if (!account) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Account not found',
      })
    }

    if (!account?.customerId) {
      return []
    }

    return await ctx.adapters.billing?.listInvoices?.({
      customerId: account?.customerId,
    })
  }),

  setSubscriptionPlan: adminProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        planId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.adapters.billing?.updateSubscription) {
        throw new TRPCError({
          code: 'NOT_IMPLEMENTED',
          message: 'Updating subscriptions is not supported',
        })
      }

      const account = await getAccount(input.workspaceId)

      if (!account) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found',
        })
      }

      if (!account?.customerId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Customer ID not found',
        })
      }

      if (!account?.subscription) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Account has no subscription',
        })
      }

      const counts = await getFeatureCounts({
        accountId: input.workspaceId,
      })

      await ctx.adapters.billing?.updateSubscription?.({
        subscriptionId: account.subscription.id,
        planId: input.planId,
        counts,
      })
    }),

  createCheckoutSession: adminProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        planId: z.string(),
        successUrl: z.string(),
        cancelUrl: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.adapters.billing) {
        throw new TRPCError({
          code: 'NOT_IMPLEMENTED',
          message: 'Billing adapter is not configured',
        })
      }

      const account = await getAccount(input.workspaceId)

      const email = account?.email ?? ctx.session.user.email ?? undefined

      // Always create a new customer to avoid issues with non-existent customers
      let customerId: string | undefined
      
      try {
        // Try to find the customer first, but don't error if not found
        if (account?.customerId) {
          try {
            const foundCustomerId = await ctx.adapters.billing.findCustomerId?.({
              id: account.customerId,
            })

            if (foundCustomerId && ctx.adapters.billing.updateCustomer) {
              customerId = foundCustomerId
              // Update customer metadata to ensure userId is set
              await ctx.adapters.billing.updateCustomer({
                customerId: foundCustomerId,
                accountId: input.workspaceId,
                email,
                name: ctx.workspace?.name,
                userId: ctx.session.user.id,
              })
            }
          } catch (error) {
            ctx.logger.error('Error finding customer', error)
          }
        }

        // If customer not found or error occurred, create a new one
        if (!customerId && ctx.adapters.billing.createCustomer) {
          if (!ctx.session?.user?.id) {
            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: 'User must be logged in to create a subscription',
            })
          }

          customerId = await ctx.adapters.billing.createCustomer?.({
            accountId: input.workspaceId,
            name: ctx.workspace?.name,
            email,
            userId: ctx.session.user.id,
          })

          await upsertAccount({
            id: input.workspaceId,
            customerId,
          })
        }

        // Always ensure we have a customer ID and it has proper metadata
        // Update customer metadata to ensure userId is set
        if (customerId) {
          if (!ctx.session?.user?.id) {
            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: 'User must be logged in to create a subscription',
            })
          }

          if (!ctx.adapters.billing.updateCustomer) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Billing adapter does not support updating customer metadata',
            })
          }

          await ctx.adapters.billing.updateCustomer({
            customerId,
            accountId: input.workspaceId,
            name: ctx.workspace?.name,
            email,
            userId: ctx.session.user.id,
          })
        }
        if (!customerId) {
          if (!ctx.session?.user?.id) {
            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: 'User must be logged in to create a subscription',
            })
          }

          // Create a new customer even if createCustomer is not implemented
          try {
            if (!ctx.adapters.billing.stripe) {
              throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Stripe adapter not initialized',
              })
            }

            const customer = await ctx.adapters.billing.stripe.customers.create({
              metadata: {
                accountId: input.workspaceId,
                userId: ctx.session.user.id,
              },
              name: ctx.workspace?.name,
              email,
            })
            customerId = customer.id

            await upsertAccount({
              id: input.workspaceId,
              customerId,
            })
          } catch (error) {
            ctx.logger.error('Error creating customer:', error)
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to create customer',
              cause: error,
            })
          }
        }

        const counts = await getFeatureCounts({
          accountId: input.workspaceId,
        })

        if (!customerId) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create or retrieve customer ID',
          })
        }

        return ctx.adapters.billing.createCheckoutSession({
          customerId,
          planId: input.planId,
          counts,
          successUrl: input.successUrl,
          cancelUrl: input.cancelUrl,
        })
      } catch (error) {
        ctx.logger.error('Error creating checkout session', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create checkout session',
          cause: error,
        })
      }
    }),

  createBillingPortalSession: adminProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        returnUrl: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.adapters.billing?.createBillingPortalSession) {
        throw new TRPCError({
          code: 'NOT_IMPLEMENTED',
          message: 'Billing portal not supported',
        })
      }

      const account = await getAccount(input.workspaceId)

      const email = account?.email ?? ctx.session.user.email ?? undefined

      let customerId = await ctx.adapters.billing.findCustomerId?.({
        id: account?.customerId ?? undefined,
        accountId: input.workspaceId,
        email,
      })

      // If we found an existing customer, ensure it has the userId in metadata
      if (customerId && ctx.adapters.billing.updateCustomer && ctx.session?.user?.id) {
        await ctx.adapters.billing.updateCustomer({
          customerId,
          accountId: input.workspaceId,
          userId: ctx.session.user.id,
          email,
          name: ctx.workspace?.name,
        })
      }

      if (!customerId && ctx.adapters.billing.createCustomer) {
        customerId = await ctx.adapters.billing.createCustomer?.({
          accountId: input.workspaceId,
          name: ctx.workspace?.name,
          email,
          userId: ctx.session?.user?.id,
        })

        await upsertAccount({
          id: input.workspaceId,
          customerId,
        })
      } else if (!customerId) {
        ctx.logger.debug('createCustomer not implemented')

        // if the adapter does not support upserting customers, we don't need to store the reference ID
        // but instead will use the workspace ID as a reference in checkout.
        customerId = input.workspaceId
      }

      if (!account) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found',
        })
      }

      if (!customerId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Customer ID not found',
        })
      }

      return ctx.adapters.billing?.createBillingPortalSession?.({
        customerId: customerId,
        returnUrl: input.returnUrl,
      })
    }),

  createPaymentIntent: adminProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        planId: z.string(),
        amount: z.number(),
        currency: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.adapters.billing) {
        throw new TRPCError({
          code: 'NOT_IMPLEMENTED',
          message: 'Billing adapter is not configured',
        })
      }

      const account = await getAccount(input.workspaceId)
      const email = account?.email ?? ctx.session.user.email ?? undefined

      try {
        const result = await ctx.adapters.billing.createPaymentIntent({
          amount: input.amount,
          currency: input.currency,
          metadata: {
            workspaceId: input.workspaceId,
            planId: input.planId,
          },
          receipt_email: email,
        })

        return {
          clientSecret: result.clientSecret,
        }
      } catch (error) {
        ctx.logger.error('Error creating payment intent', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create payment intent',
          cause: error,
        })
      }
    }),
})
