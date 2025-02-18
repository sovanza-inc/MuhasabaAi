import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as activityLogs from './activity-logs/activity-logs.sql'
import * as billing from './billing/billing.sql'
import * as contacts from './contacts/contacts.sql'
import * as notifications from './notifications/notifications.sql'
import * as tags from './tags/tags.sql'
import * as users from './users/users.sql'
import * as workspaces from './workspaces/workspaces.sql'

const schema = {
  ...activityLogs,
  ...billing,
  ...contacts,
  ...notifications,
  ...users,
  ...workspaces,
  ...tags,
}

export const db = drizzle(postgres(process.env.DATABASE_URL!), {
  schema,
  logger: process.env.NODE_ENV !== 'production',
})
