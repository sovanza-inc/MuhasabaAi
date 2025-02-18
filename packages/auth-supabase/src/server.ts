import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { env } from './env'

export type { Session } from '@supabase/supabase-js'

export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies()

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  )
}

export const getSession = async () => {
  const client = await createSupabaseServerClient()

  const {
    data: { session },
  } = await client.auth.getSession()

  // Make sure we fetch the user data,
  // because we cannot trust the session data.
  const {
    data: { user },
  } = await client.auth.getUser()

  if (!session || !user) {
    return null
  }

  const {
    access_token,
    expires_in,
    refresh_token,
    token_type,
    expires_at,
    provider_refresh_token,
    provider_token,
  } = session

  return {
    access_token,
    expires_in,
    refresh_token,
    token_type,
    expires_at,
    provider_refresh_token,
    provider_token,
    user,
  }
}

export const restoreSession = async ({ code }: { code: string }) => {
  const client = await createSupabaseServerClient()

  await client.auth.exchangeCodeForSession(code)

  return getSession()
}
