'use client'

import type { AuthProviderProps } from '@saas-ui/auth-provider'
import type { Session } from 'next-auth'
import {
  type SignInResponse,
  getSession,
  signIn,
  signOut,
} from 'next-auth/react'

async function login(
  params: {
    provider?: string
    email?: string
    password?: string
  },
  options?: {
    redirectTo?: string
  },
) {
  const redirectTo = options?.redirectTo ?? '/'

  let response: SignInResponse | undefined

  if (params.provider) {
    response = await signIn(params.provider, {
      redirectTo,
    })

    if (response?.error) {
      throw new Error('Failed to sign in with provider', {
        cause: response.error,
      })
    }
  } else if (params.email && params.password) {
    response = await signIn('credentials', {
      email: params.email,
      password: params.password,
      redirect: false,
      redirectTo,
    })

    if (response?.error) {
      throw new Error('Invalid email or password', {
        cause: response.error,
      })
    }
  } else if (params.email) {
    response = await signIn('email', {
      email: params.email,
      redirect: false,
      redirectTo,
    })

    if (response?.error) {
      throw new Error('Failed to send magic link', {
        cause: response.error,
      })
    }
  }

  if (response && !response?.ok) {
    throw new Error(response.error ?? 'Login failed')
  }

  if (!response) {
    throw new Error('Invalid parameters')
  }

  return null
}

export function createAuthService() {
  return {
    onLogin: login,
    onSignup: login,
    onLogout: async () => {
      return await signOut()
    },
    onLoadUser: async () => {
      const session = await getSession()

      return session?.user ?? null
    },
  } satisfies AuthProviderProps<Session['user']>
}
