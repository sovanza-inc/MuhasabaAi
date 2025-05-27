import { z } from 'zod'

export const UserSubscriptionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.enum(['free', 'active', 'cancelled', 'expired']).default('free'),
  planId: z.string(),
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
  currentPeriodStart: z.date().optional(),
  currentPeriodEnd: z.date().optional(),
  cancelAtPeriodEnd: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type UserSubscription = z.infer<typeof UserSubscriptionSchema>

export const CreateUserSubscriptionSchema = UserSubscriptionSchema.pick({
  userId: true,
  planId: true,
  status: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  cancelAtPeriodEnd: true,
})

export const UpdateUserSubscriptionSchema = UserSubscriptionSchema.partial().omit({
  id: true,
  userId: true,
  createdAt: true,
})
