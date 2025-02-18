import { InferSelectModel } from 'drizzle-orm'
import { varchar } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

import { pgTable } from '../_table'
import { timestamps, userId } from '../utils'

export const users = pgTable('users', {
  id: userId('id').primaryKey().notNull(),
  avatar: varchar('avatar', { length: 255 }),
  email: varchar('email', { length: 255 }).unique('users_email_unique', {
    nulls: 'not distinct',
  }),
  name: varchar('name', { length: 255 }),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  locale: varchar('locale', { length: 10 }),
  ...timestamps,
})

export type UserModel = InferSelectModel<typeof users>
export const UserSchema = createSelectSchema(users)
export const UserInsertSchema = createInsertSchema(users)
