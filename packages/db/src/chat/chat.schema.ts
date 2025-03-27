import { relations } from 'drizzle-orm';
import { 
  pgTable, 
  serial, 
  varchar, 
  text, 
  timestamp, 
  uuid,
  pgEnum 
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from '../users/users.sql';
import { workspaces } from '../workspaces/workspaces.sql';

// Enum for chat message roles
export const chatRoleEnum = pgEnum('chat_role', ['user', 'assistant']);

// Chat History Table
export const chatHistory = pgTable('chat_history', {
  // Primary key
  id: serial('id').primaryKey(),
  
  // Foreign key to users
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  
  // Foreign key to workspaces
  workspaceId: varchar('workspace_id', { length: 36 })
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  
  // Conversation tracking
  conversationId: uuid('conversation_id').notNull().defaultRandom(),
  
  // Message details
  role: chatRoleEnum('role').notNull(),
  message: text('message').notNull(),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Define relations
export const chatHistoryRelations = relations(chatHistory, ({ one }) => ({
  user: one(users, {
    fields: [chatHistory.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [chatHistory.workspaceId],
    references: [workspaces.id],
  }),
}));

// Zod schemas for validation
export const ChatHistorySchema = createSelectSchema(chatHistory);
export const ChatHistoryInsertSchema = createInsertSchema(chatHistory);

// TypeScript types
export type ChatHistory = typeof chatHistory.$inferSelect;
export type NewChatHistory = typeof chatHistory.$inferInsert;
