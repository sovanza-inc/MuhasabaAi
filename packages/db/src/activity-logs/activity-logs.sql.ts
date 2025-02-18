import { InferSelectModel, relations } from 'drizzle-orm'
import { index, json, pgEnum, varchar } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

import { pgTable } from '../_table'
import { users } from '../users/users.sql'
import { cuid, timestamps, workspaceId } from '../utils'

export const logsSubjectTypeEnum = pgEnum('subjectType', ['contact'])

export const activityLogsActorTypeEnum = pgEnum('actor_type', [
  'user',
  'system',
])

export const activityLogs = pgTable(
  'activity_logs',
  {
    ...workspaceId,
    actorId: cuid('actor_id'),
    actorType: activityLogsActorTypeEnum('actor_type')
      .notNull()
      .default('system'),
    subjectId: varchar('subject_id', { length: 255 }).notNull(),
    subjectType: logsSubjectTypeEnum('subject_type').notNull(),
    type: varchar('type', { length: 255 }).notNull(),
    metadata: json('meta_data'),
    ...timestamps,
  },
  (t) => ({
    workspace_idx: index().on(t.workspaceId, t.id),
  }),
)

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  actor: one(users, {
    fields: [activityLogs.actorId],
    references: [users.id],
  }),
}))

export type ActivityLogModel = InferSelectModel<typeof activityLogs>

export const ActivityLogSchema = createSelectSchema(activityLogs)
export const ActivityLogInsertSchema = createInsertSchema(activityLogs)
