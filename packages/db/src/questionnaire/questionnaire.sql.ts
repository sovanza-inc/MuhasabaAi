import { json, index, text, char, primaryKey } from 'drizzle-orm/pg-core'
import { pgTable, timestamps, userId } from '../utils'

export const questionnaireResponses = pgTable('questionnaire_responses', {
  // Keep the existing char(24) id that's being used as user/workspace reference
  id: char('id', { length: 24 }).notNull(),
  workspaceId: char('workspace_id', { length: 24 }).notNull(),
  // Add user_id field
  userId: userId('user_id'),
  // Store the complete questionnaire response as JSON
  responses: json('responses').notNull(),
  // Store the generated system prompt
  systemPrompt: text('system_prompt'),
  ...timestamps,
}, (t) => ({
  // Make composite primary key from id and workspaceId
  pk: primaryKey({ columns: [t.id, t.workspaceId] }),
  // Keep the existing workspace index
  workspaceIdx: index('workspaceIdx').on(t.id, t.workspaceId),
  // Add index for user_id
  userIdx: index('userIdx').on(t.userId)
}))

export type QuestionnaireResponseModel = typeof questionnaireResponses.$inferSelect 