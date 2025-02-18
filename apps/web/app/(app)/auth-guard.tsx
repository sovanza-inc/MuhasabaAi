'use client'

import { useEffect } from 'react'

import { useAuth } from '@saas-ui/auth-provider'
import { useRouter, useSearchParams } from 'next/navigation'

/**
 * This component makes sure users are redirected back to the login page
 * if the session expires.
 *
 * @note The route is reloaded if the url contains a code after a redirect from Supabase.
 */
export function AuthGuard() {
  const router = useRouter()

  const searchParams = useSearchParams()

  const { isLoading, isLoggingIn, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isLoading && !isLoggingIn && !isAuthenticated) {
      router.push('/login')
    } else if (isAuthenticated && searchParams.get('code')) {
      router.refresh() // refresh to get the session
    }
  }, [router, isLoading, isLoggingIn, isAuthenticated, searchParams])

  return null
}
