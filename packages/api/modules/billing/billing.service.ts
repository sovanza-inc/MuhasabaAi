import { startOfMonth } from 'date-fns'
import { z } from 'zod'

import {
  and,
  billingAccounts,
  billingPlans,
  billingSubscriptions,
  contacts,
  count,
  db,
  eq,
  gte,
  sql,
  workspaceMembers,
} from '@acme/db'
import { unionAll } from '@acme/db/utils'

import { ServiceError } from '#utils/error'

import {
  BillingPlanDTO,
  BillingSubscriptionDTO,
  UpdateBillingAccountSchema,
} from './billing.schema'

/**
 * Sync billing plans from a static config
 */
export const syncPlans = async (plans: BillingPlanDTO[]) => {
  return await db.transaction(async (tx) => {
    for (const plan of plans) {
      const values = {
        ...plan,
        features: sql.raw(`'${JSON.stringify(plan.features ?? [])}'::jsonb`), // FIXME this should be handled by drizzle
        metadata: sql.raw(`'${JSON.stringify(plan.metadata ?? {})}'::jsonb`), // FIXME this should be handled by drizzle
      }
      await tx.insert(billingPlans).values(values).onConflictDoUpdate({
        target: billingPlans.id,
        set: values,
      })
    }
  })
}

export const getPlan = async (id: string) => {
  return await db.query.billingPlans.findFirst({
    where: eq(billingPlans.id, id),
  })
}

export const getPlanByMetadata = async (key: string, value: string) => {
  return await db
    .select()
    .from(billingPlans)
    .where(sql`metadata->>${key} = ${value}`)
    .limit(1)
    .execute()
    .then((rows) => rows[0])
}

export const listPlans = async () => {
  return await db.query.billingPlans.findMany({
    where: eq(billingPlans.active, true),
  })
}

export const updateAccount = async (
  details: z.infer<typeof UpdateBillingAccountSchema>,
) => {
  const { id, ...$set } = details

  const result = await db
    .update(billingAccounts)
    .set($set)
    .where(eq(billingAccounts.id, id))
    .returning({
      id: billingAccounts.id,
    })

  return result[0]
}

export const getAccount = async (id: string) => {
  return await db.query.billingAccounts.findFirst({
    where: eq(billingAccounts.id, id),
    with: {
      subscription: true,
    },
  })
}

export const upsertAccount = async (
  details: z.infer<typeof UpdateBillingAccountSchema>,
) => {
  const { id, ...$set } = details

  await db
    .insert(billingAccounts)
    .values({
      id,
      ...$set,
    })
    .onConflictDoUpdate({
      target: billingAccounts.id,
      set: $set,
    })
}

export const upsertSubscription = async (
  subscription: BillingSubscriptionDTO,
) => {
  await db
    .insert(billingSubscriptions)
    .values(subscription)
    .onConflictDoUpdate({
      target: billingSubscriptions.id,
      set: subscription,
    })
}

export const getSubscription = async (id: string) => {
  return await db.query.billingSubscriptions.findFirst({
    where: eq(billingSubscriptions.id, id),
  })
}

/**
 * Get feature counts for a workspace
 */
export const getFeatureCounts = async (args: { accountId: string }) => {
  const usersCount = db
    .select({ feature: sql<string>`'users'`, count: count() })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, args.accountId),
        eq(workspaceMembers.status, 'active'),
      ),
    )

  const contactsCount = db
    .select({ feature: sql<string>`'contacts'`, count: count() })
    .from(contacts)
    .where(
      and(
        eq(contacts.workspaceId, args.accountId),
        gte(contacts.updatedAt, startOfMonth(new Date())),
      ),
    )

  const result = await unionAll(usersCount, contactsCount)

  const counts: Record<string, number> = {}
  for (const row of result) {
    counts[row.feature] = row.count
  }

  return {
    users: counts.users ?? 0,
    contacts: counts.contacts ?? 0,
  }
}

export async function limitReached(args: {
  planId: string
  featureId: string
  quantity: number
}) {
  const plan = await getPlan(args.planId)

  if (!plan) {
    return false
  }

  const feature = plan.features?.find(
    (feature) => feature.id === args.featureId,
  )

  if (!feature) {
    return false
  }

  if (feature.limit && args.quantity >= feature.limit) {
    return true
  }

  return false
}

export async function throwIfLimitReached(args: {
  planId: string
  featureId: string
  quantity: number
}) {
  if (await limitReached(args)) {
    throw new ServiceError(
      'billing.limit_reached',
      `Limit for ${args.featureId} reached`,
    )
  }
}
