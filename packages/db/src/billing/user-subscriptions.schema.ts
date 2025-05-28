import { pgTable, text, timestamp, boolean, uuid, pgEnum } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'free',
  'active',
  'cancelled',
  'expired',
])

export const userSubscriptions = pgTable('user_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  planId: text('plan_id').notNull(),
  status: subscriptionStatusEnum('status').default('free').notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type UserSubscription = typeof userSubscriptions.$inferSelect
export type NewUserSubscription = typeof userSubscriptions.$inferInsert


