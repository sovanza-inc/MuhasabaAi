import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import type { SocialProviders } from 'better-auth/social-providers'

import { db } from '@acme/db'
import { mailer, render } from '@acme/email'
import ConfirmEmailAddressEmail from '@acme/email/confirm-email-address'
import ResetPasswordEmail from '@acme/email/reset-password'

import * as schema from './auth.sql.ts'
import { env } from './env.ts'

const socialProviders: SocialProviders = {}

if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  }
}

export const auth = betterAuth({
  secret: env.AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
    usePlural: true,
  }),
  socialProviders,
  emailAndPassword: {
    enabled: true,
    // Auto sign in after sign up
    autoSignIn: true,
    // Email can be confirmed after logging in
    requireEmailVerification: false,
    sendResetPassword: async (props) => {
      if (!env.RESEND_API_KEY) {
        console.log('[Auth] Reset password request', props)
        return
      }

      const html = await render(
        ResetPasswordEmail({
          resetUrl: props.url,
          user: {
            name: props.user.name,
            email: props.user.email,
          },
          token: props.token,
        }),
      )

      mailer.send({
        to: props.user.email,
        subject: 'Reset your password',
        html,
      })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async (props) => {
      const html = await render(
        ConfirmEmailAddressEmail({
          confirmUrl: props.url,
          token: props.token,
        }),
      )

      mailer.send({
        to: props.user.email,
        subject: 'Confirm your email address',
        html,
      })
    },
  },
})
