import { InferSelectModel, relations } from 'drizzle-orm'
import { index, json, pgEnum, timestamp, varchar } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

import { pgTable } from '../_table'
import { users } from '../users/users.sql'
import { cuid, timestamps, workspaceId } from '../utils'

// Currently only user is supported as a target type, but could include teams, etc.
export const notificationTargetEnum = pgEnum('target_type', ['user'])

// Currently only contact is supported as a subject type, but could include tasks, etc.
export const notificationSubjectEnum = pgEnum('subject_type', ['contact'])

export const notificationActorEnum = pgEnum('actor_type', ['user', 'system'])

export const notifications = pgTable(
  'notification',
  {
    ...workspaceId,
    type: varchar('type', { length: 255 }),
    targetId: cuid('target_id').notNull(),
    targetType: notificationTargetEnum('target_type').notNull(),
    actorId: cuid('actor_id'),
    actorType: notificationActorEnum('actor_type').notNull().default('system'),
    subjectId: cuid('subject_id').notNull(),
    subjectType: notificationSubjectEnum('subject_type').notNull(),
    metadata: json('data'), // no need to query this, so json type is OK
    readAt: timestamp('readAt'),
    readById: varchar('readBy', { length: 255 }),
    ...timestamps,
  },
  (t) => ({
    workspace_idx: index().on(t.workspaceId, t.id),
  }),
)

export const notificationsRelations = relations(notifications, ({ one }) => ({
  readBy: one(users, {
    fields: [notifications.readById],
    references: [users.id],
  }),
  actor: one(users, {
    fields: [notifications.actorId],
    references: [users.id],
  }),
}))

export type NotificationModel = InferSelectModel<typeof notifications>
export const NotificationSchema = createSelectSchema(notifications)
export const NotificationInsertSchema = createInsertSchema(notifications)
