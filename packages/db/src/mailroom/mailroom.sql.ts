import { pgTable, serial, char, text, timestamp, varchar } from 'drizzle-orm/pg-core'

export const mailroom = pgTable('mailroom', {
  id: serial('id').primaryKey(),
  workspace_id: char('workspace_id', { length: 24 }).notNull(),
  mail_from: text('mail_from').notNull(),
  mail_date: timestamp('mail_date').defaultNow().notNull(),
  mail_subject: text('mail_subject'),
  mail_content: text('mail_content'),
  attached_document: text('attached_document'),
  icon_url: text('icon_url'),
  status: varchar('status', { length: 20 }).default('unread'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}) 