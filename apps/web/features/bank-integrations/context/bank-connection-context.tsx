'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useWorkspace } from '#features/common/hooks/use-workspace'
import { useAuth } from '@saas-ui/auth-provider'
import { api } from '#lib/trpc/react'

interface BankConnectionContextType {
  hasBankConnection: boolean
  isRedirecting: boolean
  showConnectionModal: boolean
  redirectToBankIntegration: () => void
  initialCheckDone: boolean
  isLoading: boolean
  shouldRestrictUI: boolean
}

const BankConnectionContext = createContext<BankConnectionContextType | undefined>(undefined)

export function BankConnectionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const workspaceSlug = useWorkspace()
  const { data: workspace, isLoading: isWorkspaceLoading } = api.workspaces.bySlug.useQuery(
    { slug: workspaceSlug },
    { enabled: !!workspaceSlug && isAuthenticated }
  )
  
  const [hasBankConnection, setHasBankConnection] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [showConnectionModal, setShowConnectionModal] = useState(false)
  const [initialCheckDone, setInitialCheckDone] = useState(false)
  const [isCheckingConnection, setIsCheckingConnection] = useState(false)

  const redirectToBankIntegration = React.useCallback(async () => {
    if (workspaceSlug) {
      setIsRedirecting(true)
      router.push(`/${workspaceSlug}/bank-integrations`)
    }
  }, [router, workspaceSlug])

  // Handle modal visibility based on pathname
  useEffect(() => {
    if (pathname?.includes('bank-integrations')) {
      setShowConnectionModal(false)
      setIsRedirecting(false)
    }
  }, [pathname])

  // Initial bank connection check
  const checkBankConnection = React.useCallback(async () => {
    if (!workspace?.id || !isAuthenticated || isAuthLoading || isWorkspaceLoading) {
      return
    }

    try {
      setIsCheckingConnection(true)
      // Get auth token
      const authResponse = await fetch('/api/bank-integration/auth', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!authResponse.ok) {
        setHasBankConnection(false)
        setShowConnectionModal(true)
        return
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
        setHasBankConnection(false)
        setShowConnectionModal(true)
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
          
          if (!hasConnectedBanks) {
            setShowConnectionModal(true)
          }
        } else {
          setHasBankConnection(false)
          setShowConnectionModal(true)
        }
      }
    } catch (error) {
      console.error('Error checking bank connection:', error)
      setHasBankConnection(false)
      setShowConnectionModal(true)
    } finally {
      setIsCheckingConnection(false)
      setInitialCheckDone(true)
    }
  }, [workspace?.id, isAuthenticated, isAuthLoading, isWorkspaceLoading])

  // Run check when workspace is available
  useEffect(() => {
    if (workspace?.id && isAuthenticated && !isAuthLoading && !isWorkspaceLoading) {
      checkBankConnection()
    }
  }, [workspace?.id, isAuthenticated, isAuthLoading, isWorkspaceLoading, checkBankConnection])

  const value = React.useMemo(() => ({
    hasBankConnection,
    isRedirecting,
    showConnectionModal,
    redirectToBankIntegration,
    initialCheckDone,
    isLoading: isAuthLoading || isWorkspaceLoading || isCheckingConnection,
    shouldRestrictUI: initialCheckDone && !hasBankConnection && !pathname?.includes('bank-integrations')
  }), [
    hasBankConnection,
    isRedirecting,
    showConnectionModal,
    redirectToBankIntegration,
    initialCheckDone,
    isAuthLoading,
    isWorkspaceLoading,
    isCheckingConnection,
    pathname
  ])

  // Show loading overlay for any loading state
  if (isAuthLoading || isWorkspaceLoading || isCheckingConnection) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'white',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 1,
          transition: 'opacity 0.2s ease-in-out'
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #1AB294',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

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