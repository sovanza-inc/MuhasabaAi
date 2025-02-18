import { InferSelectModel, relations } from 'drizzle-orm'
import { char, primaryKey, varchar } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

import { pgTable } from '../_table'
import { timestamps } from '../utils'
import { workspaces } from '../workspaces/workspaces.sql'

export const tags = pgTable(
  'tags',
  {
    id: varchar('id', { length: 40 }).notNull(),
    workspaceId: char('workspace_id', { length: 24 })
      .references(() => workspaces.id)
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    color: varchar('color', { length: 255 }),
    ...timestamps,
  },
  (t) => ({
    pk: primaryKey({
      columns: [t.workspaceId, t.id],
    }),
  }),
)

export const tagsRelations = relations(tags, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [tags.workspaceId],
    references: [workspaces.id],
  }),
}))

export type TagModel = InferSelectModel<typeof tags>
export const TagSchema = createSelectSchema(tags)
export const TagInsertSchema = createInsertSchema(tags)
