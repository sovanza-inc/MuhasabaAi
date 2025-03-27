import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { 
  pgTable, 
  serial, 
  varchar, 
  text, 
  timestamp, 
  uuid,
  pgEnum
} from 'drizzle-orm/pg-core';
import { users } from '../users/users.sql'; 
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { userId } from '../utils';

// Create an enum for the role
export const roleEnum = pgEnum('role', ['user', 'assistant']);

export const chatHistory = pgTable('chat_history', {
  id: serial('id').primaryKey(),
  userId: userId('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id').notNull().defaultRandom(),
  role: roleEnum('role').notNull(),
  message: text('message').notNull(),
  workspaceId: varchar('workspace_id', { length: 255 }),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
});

// Optional: Define relations if you need them
export const chatHistoryRelations = relations(chatHistory, ({ one }) => ({
  user: one(users, {
    fields: [chatHistory.userId],
    references: [users.id],
  }),
}));

// Type inference
export type ChatHistory = InferSelectModel<typeof chatHistory>;
export type NewChatHistory = InferInsertModel<typeof chatHistory>;

export const ChatHistorySchema = createSelectSchema(chatHistory);
export const ChatHistoryInsertSchema = createInsertSchema(chatHistory);