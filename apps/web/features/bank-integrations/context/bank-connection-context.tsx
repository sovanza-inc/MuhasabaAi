'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '#features/common/hooks/use-workspace'
import { useAuth } from '@saas-ui/auth-provider'
import { api } from '#lib/trpc/react'

interface BankConnectionContextType {
  hasBankConnection: boolean
  isLoading: boolean
  checkBankConnection: () => Promise<void>
  shouldRestrictUI: boolean
  redirectToBankIntegration: () => void
}

const BankConnectionContext = createContext<BankConnectionContextType | undefined>(undefined)

export function BankConnectionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const workspaceSlug = useWorkspace()
  const { data: workspace, isLoading: isWorkspaceLoading } = api.workspaces.bySlug.useQuery(
    { slug: workspaceSlug },
    { enabled: !!workspaceSlug && isAuthenticated }
  )
  
  const [hasBankConnection, setHasBankConnection] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [shouldRestrictUI, setShouldRestrictUI] = useState(false)

  const redirectToBankIntegration = React.useCallback(() => {
    if (workspaceSlug) {
      router.push(`/${workspaceSlug}/banking-integration`)
    }
  }, [router, workspaceSlug])

  const checkBankConnection = React.useCallback(async () => {
    if (!workspace?.id || !isAuthenticated || isAuthLoading || isWorkspaceLoading) {
      return
    }

    setIsLoading(true)

    try {
      // Get auth token
      const authResponse = await fetch('/api/bank-integration/auth', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!authResponse.ok) {
        throw new Error('Failed to authenticate')
      }
      
      const authData = await authResponse.json()

      // Check if customer exists
      const customerCheckResponse = await fetch(`/api/bank-integration/get-customer?app_user_id=${workspace.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authData.access_token}`
        }
      })

      if (customerCheckResponse.status === 404) {
        console.log('Customer not found, redirecting to banking integration')
        setHasBankConnection(false)
        setShouldRestrictUI(false)
        redirectToBankIntegration()
        return
      }

      if (customerCheckResponse.ok) {
        const customerData = await customerCheckResponse.json()
        
        // Check if customer has any connected banks
        const banksResponse = await fetch(`/api/bank-integration/accounts?customer_id=${customerData.customer_id}`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${authData.access_token}`
          }
        })

        if (banksResponse.ok) {
          const banksData = await banksResponse.json()
          const hasConnectedBanks = Array.isArray(banksData) && banksData.length > 0
          setHasBankConnection(hasConnectedBanks)
          setShouldRestrictUI(!hasConnectedBanks)
          
          if (!hasConnectedBanks) {
            console.log('No connected banks, redirecting to banking integration')
            redirectToBankIntegration()
          }
        } else {
          setHasBankConnection(false)
          setShouldRestrictUI(false)
          redirectToBankIntegration()
        }
      }
    } catch (error) {
      console.error('Error checking bank connection:', error)
      setHasBankConnection(false)
      setShouldRestrictUI(false)
      redirectToBankIntegration()
    } finally {
      setIsLoading(false)
    }
  }, [workspace?.id, isAuthenticated, isAuthLoading, isWorkspaceLoading, redirectToBankIntegration])

  // Run check when workspace is available and user is authenticated
  useEffect(() => {
    if (workspace?.id && isAuthenticated && !isAuthLoading && !isWorkspaceLoading) {
      checkBankConnection()
    }
  }, [workspace?.id, isAuthenticated, isAuthLoading, isWorkspaceLoading, checkBankConnection])

  const value = React.useMemo(() => ({
    hasBankConnection,
    isLoading: isLoading || isAuthLoading || isWorkspaceLoading || !workspace,
    shouldRestrictUI,
    checkBankConnection,
    redirectToBankIntegration
  }), [
    hasBankConnection,
    isLoading,
    isAuthLoading,
    isWorkspaceLoading,
    workspace,
    shouldRestrictUI,
    checkBankConnection,
    redirectToBankIntegration
  ])

  return (
    <BankConnectionContext.Provider value={value}>
      {children}
    </BankConnectionContext.Provider>
  )
}

export function useBankConnection() {
  const context = useContext(BankConnectionContext)
  if (context === undefined) {
    throw new Error('useBankConnection must be used within a BankConnectionProvider')
  }
  return context
} 