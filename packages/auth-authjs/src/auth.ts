import { cache } from 'react'

import { env } from 'env'

import { DrizzleAdapter } from '@auth/drizzle-adapter'
import NextAuth, { type DefaultSession } from 'next-auth'
import Resend from 'next-auth/providers/resend'

import { db } from '@acme/db'

import {
  accounts,
  authenticators,
  sessions,
  users,
  verificationTokens,
} from './auth.sql'
import { authConfig } from './config'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
    } & DefaultSession['user']
    expires: string
  }
}

const adapter = DrizzleAdapter(db, {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: sessions,
  verificationTokensTable: verificationTokens,
  authenticatorsTable: authenticators,
})

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter,
  providers: [
    Resend({
      id: 'email',
      apiKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM,
      ...(env.RESEND_API_KEY
        ? {}
        : {
            sendVerificationRequest: (params) => {
              console.log('sendVerificationRequest', params)
            },
          }),
    }),
  ],
})

/**
 * Returns the session object, if the user is logged in.
 * Can be called in server components, the result is cached.
 */
export const getSession = cache(async () => auth())
