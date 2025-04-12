'use client'

import { useEffect } from 'react'

import { useAuth } from '@saas-ui/auth-provider'
import { useRouter } from 'next/navigation'
import { useBankConnection } from '#features/bank-integrations/context/bank-connection-context'

/**
 * This component makes sure users are redirected back to the login page
 * if the session expires.
 *
 * @note The route is reloaded if the url contains a code after a redirect from Supabase.
 */
export function AuthGuard() {
  const router = useRouter()
  const { isLoading, isLoggingIn, isAuthenticated } = useAuth()
  const { checkBankConnection } = useBankConnection()

  useEffect(() => {
    const handleAuth = async () => {
      if (!isLoading && !isLoggingIn) {
        if (!isAuthenticated) {
          router.push('/login')
        } else {
          await checkBankConnection()
        }
      }
    }

    handleAuth()
  }, [router, isLoading, isLoggingIn, isAuthenticated, checkBankConnection])

  return null
}
