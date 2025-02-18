import type { NextAuthConfig } from 'next-auth'

import { env } from './env'

export const authConfig = {
  debug: env.AUTH_DEBUG,
  secret: env.AUTH_SECRET,
  session: {
    /**
     * We use JWT strategy because our database
     * adapter does not support Edge runtime.
     *
     * If you use an edge compatible provider, like Neon
     * you can use the `database` strategy.
     */
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    newUser: '/signup',
  },
  callbacks: {
    authorized: async ({ auth }) => {
      return !!auth
    },
    session({ session, user, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: user ? user.id : token?.sub,
        },
      }
    },
  },
  providers: [],
} satisfies NextAuthConfig
