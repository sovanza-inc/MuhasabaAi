import { z } from 'zod'

import { TRPCError, createTRPCRouter, protectedProcedure } from '#trpc'

import { UpdateUserSchema } from './users.schema'
import { updateUserById } from './users.service'

export const usersRouter = createTRPCRouter({
  updateProfile: protectedProcedure
    .input(UpdateUserSchema.pick({ name: true, email: true, avatar: true }))
    .mutation(async ({ ctx, input }) => {
      try {
        await updateUserById({
          id: ctx.session.user.id,
          ...input,
        })
      } catch (error: unknown) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update profile',
          cause: error,
        })
      }
    }),
  subscribeToNewsletter: protectedProcedure
    .input(z.object({ newsletter: z.boolean() }))
    .mutation(() => {
      // not implemented
    }),
})
