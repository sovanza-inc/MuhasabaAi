import { userService } from '#modules/users/index'
import { TRPCError, createTRPCRouter, protectedProcedure } from '#trpc'

import { authService } from '.'

export const authRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Not logged in',
      })
    }

    let me = await userService.userById(ctx.session.user.id)

    // When using Supabase you should use a trigger function
    // instead to create the user in your public schema.
    if (!me) {
      me = await userService.createUser({
        id: ctx.session.user.id,
        email: ctx.session.user.email,
        name: ctx.session.user.name,
      })
    }

    return me
  }),
  listAccounts: protectedProcedure.query(async ({ ctx }) => {
    return await authService.listAccounts(ctx.session.user.id)
  }),
})
