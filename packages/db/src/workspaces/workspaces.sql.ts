import { InferSelectModel, relations } from 'drizzle-orm'
import {
  boolean,
  jsonb,
  pgEnum,
  primaryKey,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

import { pgTable } from '../_table'
import { billingAccounts, billingSubscriptions } from '../billing/billing.sql'
import { tags } from '../tags/tags.sql'
import { users } from '../users/users.sql'
import { id, timestamps, userId, workspaceId } from '../utils'

export const usersRelations = relations(users, ({ many }) => ({
  workspaces: many(workspaceMembers),
}))

export const workspaces = pgTable(
  'workspaces',
  {
    ...id,
    ownerId: varchar('owner_id', { length: 255 }),
    slug: varchar('slug', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    logo: varchar('logo', { length: 255 }),
    ...timestamps,
  },
  (workspace) => ({
    slugIndex: uniqueIndex('slug_idx').on(workspace.slug),
  }),
)

export const workspacesRelations = relations(workspaces, ({ many, one }) => ({
  members: many(workspaceMembers),
  account: one(billingAccounts, {
    fields: [workspaces.id],
    references: [billingAccounts.id],
  }),
  subscription: one(billingSubscriptions, {
    fields: [workspaces.id],
    references: [billingSubscriptions.accountId],
  }),
  tags: many(tags),
}))

export const workspaceMemberStatus = pgEnum('workspace_member_status', [
  'active',
  'suspended',
  'invited',
])

export const workspaceMembers = pgTable(
  'workspace_members',
  {
    userId: varchar('user_id', { length: 255 })
      .references(() => users.id)
      .notNull(),
    workspaceId: varchar('workspace_id', { length: 255 })
      .references(() => workspaces.id)
      .notNull(),
    role: varchar('role', { length: 20 }).notNull(),
    status: workspaceMemberStatus('status').notNull().default('active'),
    invitedAt: timestamp('invited_at'),
    ...timestamps,
  },
  (t) => ({
    pk: primaryKey({
      columns: [t.userId, t.workspaceId],
      name: 'workspace_members_pk',
    }),
  }),
)

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
    user: one(users, {
      fields: [workspaceMembers.userId],
      references: [users.id],
    }),
  }),
)

export const workspaceMemberSettings = pgTable(
  'workspace_member_settings',
  {
    userId: varchar('user_id', { length: 255 })
      .references(() => users.id)
      .notNull(),
    workspaceId: varchar('workspace_id', { length: 255 })
      .references(() => workspaces.id)
      .notNull(),
    channels: jsonb('notification_channels').$type<NotificationChannelsField>(),
    topics: jsonb('notification_topics').$type<NotificationTopicsField>(),
    newsletters: jsonb('newsletters').$type<NewslettersField>(),
    ...timestamps,
  },
  (t) => ({
    pk: primaryKey({
      columns: [t.userId, t.workspaceId],
      name: 'workspace_member_settings_pk',
    }),
  }),
)

export const workspaceInvitations = pgTable(
  'workspace_invitations',
  {
    ...workspaceId,
    userId: userId('user_id').references(() => users.id, {
      onDelete: 'cascade',
    }),
    email: varchar('email', { length: 255 }).notNull(),
    role: varchar('role', { length: 20 }).notNull(),
    invitedBy: userId('invited_by').references(() => users.id, {
      onDelete: 'cascade',
    }),
    accepted: boolean('accepted').default(false),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => ({
    unqEmail: uniqueIndex().on(t.workspaceId, t.email),
  }),
)

export const workspaceInvitationsRelations = relations(
  workspaceInvitations,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceInvitations.workspaceId],
      references: [workspaces.id],
    }),
    user: one(users, {
      fields: [workspaceInvitations.userId],
      references: [users.id],
    }),
    inviter: one(users, {
      fields: [workspaceInvitations.invitedBy],
      references: [users.id],
    }),
  }),
)

export interface NotificationChannelsField {
  email?: boolean
  desktop?: boolean
}

export interface NewslettersField {
  product_updates?: boolean
  important_updates?: boolean
}

export interface NotificationTopicsField {
  contacts_new_lead?: boolean
  contacts_account_upgraded?: boolean
  inbox_assigned_to_me?: boolean
  inbox_mentioned?: boolean
}

export type WorkspaceModel = InferSelectModel<typeof workspaces>
export const WorkspaceSchema = createSelectSchema(workspaces)
export const WorkspaceInsertSchema = createInsertSchema(workspaces)

export type WorkspaceMemberModel = InferSelectModel<typeof workspaceMembers>
export const WorkspaceMemberSchema = createSelectSchema(workspaceMembers)
export const WorkspaceMemberInsertSchema = createInsertSchema(workspaceMembers)
