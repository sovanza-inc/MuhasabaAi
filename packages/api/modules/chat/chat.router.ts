import { z } from 'zod'
import { and, eq } from "drizzle-orm";
import { createTRPCRouter, workspaceProcedure } from "#trpc";
import { db } from "@acme/db";
import { chatHistory } from "../../../db/src/chat/chat.sql";
import { v4 as uuidv4 } from 'uuid';
import { generateAIResponse, type ChatMessage } from '../../../../apps/web/lib/ai/assistant';

const DEFAULT_WELCOME_MESSAGE = "Hello! How can I help you today?";

export const chatRouter = createTRPCRouter({
  // Get conversation history
  getConversation: workspaceProcedure
    .input(z.object({
      workspaceId: z.string(),
      conversationId: z.string().uuid().optional(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        // Validate session
        if (!ctx.session || !ctx.session.user) {
          throw new Error('User not authenticated');
        }

        // If no conversation exists, create a new one
        const conversationId = input.conversationId ?? uuidv4();
        
        // Check if conversation already exists
        const existingMessages = await db
          .select()
          .from(chatHistory)
          .where(
            and(
              eq(chatHistory.workspaceId, input.workspaceId),
              eq(chatHistory.userId, ctx.session.user.id)
            )
          );

        // Only add welcome message if no messages exist for this workspace and user
        if (existingMessages.length === 0) {
          await db.insert(chatHistory).values({
            userId: ctx.session.user.id,
            workspaceId: input.workspaceId,
            conversationId,
            role: 'assistant',
            message: DEFAULT_WELCOME_MESSAGE,
            timestamp: new Date(),
          });
        }

        // Fetch ALL messages for this workspace and user
        const messages = await db
          .select()
          .from(chatHistory)
          .where(
            and(
              eq(chatHistory.workspaceId, input.workspaceId),
              eq(chatHistory.userId, ctx.session.user.id)
            )
          )
          .orderBy(chatHistory.timestamp);

        return messages;
      } catch (error) {
        console.error('Error fetching conversation:', error);
        throw new Error('Failed to fetch conversation');
      }
    }),

  // Send a new message
  sendMessage: workspaceProcedure
    .input(z.object({
      workspaceId: z.string(),
      conversationId: z.string().uuid(),
      message: z.string().min(1, "Message cannot be empty"),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session || !ctx.session.user) {
        throw new Error('User not authenticated');
      }

      try {
        // Insert user message
        await db.insert(chatHistory).values({
          userId: ctx.session.user.id,
          workspaceId: input.workspaceId,
          conversationId: input.conversationId,
          role: 'user',
          message: input.message,
          timestamp: new Date(),
        });

        // Get conversation history for context
        const previousMessages = await db
          .select()
          .from(chatHistory)
          .where(
            and(
              eq(chatHistory.workspaceId, input.workspaceId),
              eq(chatHistory.conversationId, input.conversationId)
            )
          )
          .orderBy(chatHistory.timestamp);

        // Transform messages to ChatMessage format
        const chatMessages: ChatMessage[] = previousMessages.map(msg => ({
          conversation_id: msg.conversationId,
          role: msg.role,
          content: msg.message
        }));

        // Generate AI response
        const aiResponse = await generateAIResponse(chatMessages);

        // Insert AI response
        await db.insert(chatHistory).values({
          userId: ctx.session.user.id,
          workspaceId: input.workspaceId,
          conversationId: input.conversationId,
          role: 'assistant',
          message: aiResponse,
          timestamp: new Date(),
        });

        return {
          success: true,
          message: aiResponse,
        };
      } catch (error) {
        console.error('Error sending message:', error);
        throw new Error('Failed to send message. Please try again.');
      }
    }),
});