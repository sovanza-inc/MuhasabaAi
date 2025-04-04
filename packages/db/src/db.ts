import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as activityLogs from './activity-logs/activity-logs.sql'
import * as billing from './billing/billing.sql'
import * as contacts from './contacts/contacts.sql'
import * as notifications from './notifications/notifications.sql'
import * as tags from './tags/tags.sql'
import * as users from './users/users.sql'
import * as workspaces from './workspaces/workspaces.sql'
import * as chat from './chat/chat.sql'
import * as chatSchema from './chat/chat.schema'
import { accounts, authenticators, sessions, users as authUsers, verifications } from '../../better-auth/src/auth.sql'


const schema = {
  ...activityLogs,
  ...billing,
  ...contacts,
  ...notifications,
  ...users,
  ...workspaces,
  ...tags,
  ...chat,
  ...chatSchema,
  auth_accounts: accounts,
  auth_authenticators: authenticators,
  auth_sessions: sessions,
  auth_users: authUsers,
  auth_verifications: verifications
}

export const db = drizzle(postgres(process.env.DATABASE_URL!), {
  schema,
  logger: process.env.NODE_ENV !== 'production',
})
