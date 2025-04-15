'use client'

import { useEffect } from 'react'

import { useAuth } from '@saas-ui/auth-provider'
import { useRouter } from 'next/navigation'

/**
 * This component makes sure users are redirected back to the login page
 * if the session expires.
 *
 * @note The route is reloaded if the url contains a code after a redirect from Supabase.
 */
export function AuthGuard() {
  const router = useRouter()
  const { isLoading, isLoggingIn, isAuthenticated } = useAuth()

  useEffect(() => {
    const handleAuth = async () => {
      if (!isLoading && !isLoggingIn && !isAuthenticated) {
        router.push('/login')
      }
    }

    handleAuth()
  }, [router, isLoading, isLoggingIn, isAuthenticated])

  return null
}
