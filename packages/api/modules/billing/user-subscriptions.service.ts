import { and, db, eq } from '@acme/db'
import { userSubscriptions } from '@acme/db/billing'
import { TRPCError } from '@trpc/server'

import { CreateUserSubscriptionSchema, UpdateUserSubscriptionSchema } from './user-subscriptions.schema'

export const createUserSubscription = async (input: typeof CreateUserSubscriptionSchema._type) => {
  const [subscription] = await db
    .insert(userSubscriptions)
    .values({
      id: crypto.randomUUID(),
      ...input,
      status: input.status ?? 'free',
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
    })
    .returning()

  return subscription
}

export const updateUserSubscription = async (
  id: string,
  input: typeof UpdateUserSubscriptionSchema._type
) => {
  const [subscription] = await db
    .update(userSubscriptions)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(userSubscriptions.id, id))
    .returning()

  if (!subscription) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Subscription not found',
    })
  }

  return subscription
}

export const getUserSubscription = async (id: string) => {
  const [subscription] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.id, id))
    .limit(1)

  if (!subscription) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Subscription not found',
    })
  }

  return subscription
}

export const getUserSubscriptionByUserId = async (userId: string) => {
  const [subscription] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .limit(1)

  return subscription || null
}

export const getUserSubscriptionByStripeCustomerId = async (stripeCustomerId: string) => {
  const [subscription] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.stripeCustomerId, stripeCustomerId))
    .limit(1)

  return subscription || null
}

export const updateUserSubscriptionByStripeCustomerId = async (
  stripeCustomerId: string,
  input: typeof UpdateUserSubscriptionSchema._type
) => {
  const [subscription] = await db
    .update(userSubscriptions)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(userSubscriptions.stripeCustomerId, stripeCustomerId))
    .returning()

  if (!subscription) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Subscription not found',
    })
  }

  return subscription
}
