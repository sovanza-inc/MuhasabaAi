'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useWorkspace } from '#features/common/hooks/use-workspace'
import { useAuth } from '@saas-ui/auth-provider'
import { api } from '#lib/trpc/react'

interface QuestionnaireContextType {
  hasQuestionnaireResponse: boolean
  isRedirecting: boolean
  showQuestionnaireModal: boolean
  redirectToQuestionnaire: () => void
  initialCheckDone: boolean
  isLoading: boolean
  shouldRestrictUI: boolean
}

const QuestionnaireContext = createContext<QuestionnaireContextType | undefined>(undefined)

export function QuestionnaireProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const workspaceSlug = useWorkspace()
  const { data: workspace, isLoading: isWorkspaceLoading } = api.workspaces.bySlug.useQuery(
    { slug: workspaceSlug },
    { enabled: !!workspaceSlug && isAuthenticated }
  )
  
  const [hasQuestionnaireResponse, setHasQuestionnaireResponse] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false)
  const [initialCheckDone, setInitialCheckDone] = useState(false)
  const [isCheckingQuestionnaire, setIsCheckingQuestionnaire] = useState(false)

  const redirectToQuestionnaire = React.useCallback(async () => {
    if (workspaceSlug) {
      setIsRedirecting(true)
      router.push(`/${workspaceSlug}/questionnaire-edit`)
    }
  }, [router, workspaceSlug])

  // Handle modal visibility based on pathname
  useEffect(() => {
    if (pathname?.includes('questionnaire-edit')) {
      setShowQuestionnaireModal(false)
      setIsRedirecting(false)
    }
  }, [pathname])

  // Initial questionnaire check
  const checkQuestionnaireResponse = React.useCallback(async () => {
    if (!workspace?.id || !isAuthenticated || isAuthLoading || isWorkspaceLoading) {
      return
    }

    try {
      setIsCheckingQuestionnaire(true)
      
      // Check if questionnaire response exists
      const response = await fetch(`/api/questionnaire?workspaceId=${workspace.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.status === 404) {
        setHasQuestionnaireResponse(false)
        setShowQuestionnaireModal(true)
        return
      }

      if (response.ok) {
        const data = await response.json()
        setHasQuestionnaireResponse(data.exists)
        if (!data.exists) {
          setShowQuestionnaireModal(true)
        }
      }
    } catch (error) {
      console.error('Error checking questionnaire response:', error)
      setHasQuestionnaireResponse(false)
      setShowQuestionnaireModal(true)
    } finally {
      setIsCheckingQuestionnaire(false)
      setInitialCheckDone(true)
    }
  }, [workspace?.id, isAuthenticated, isAuthLoading, isWorkspaceLoading])

  // Run check when workspace is available
  useEffect(() => {
    if (workspace?.id && isAuthenticated && !isAuthLoading && !isWorkspaceLoading) {
      checkQuestionnaireResponse()
    }
  }, [workspace?.id, isAuthenticated, isAuthLoading, isWorkspaceLoading, checkQuestionnaireResponse])

  const value = React.useMemo(() => ({
    hasQuestionnaireResponse,
    isRedirecting,
    showQuestionnaireModal,
    redirectToQuestionnaire,
    initialCheckDone,
    isLoading: isAuthLoading || isWorkspaceLoading || isCheckingQuestionnaire,
    shouldRestrictUI: initialCheckDone && !hasQuestionnaireResponse && !pathname?.includes('questionnaire-edit')
  }), [
    hasQuestionnaireResponse,
    isRedirecting,
    showQuestionnaireModal,
    redirectToQuestionnaire,
    initialCheckDone,
    isAuthLoading,
    isWorkspaceLoading,
    isCheckingQuestionnaire,
    pathname
  ])

  // Show loading overlay for any loading state
  if (isAuthLoading || isWorkspaceLoading || isCheckingQuestionnaire) {
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
    <QuestionnaireContext.Provider value={value}>
      {children}
    </QuestionnaireContext.Provider>
  )
}

export function useQuestionnaire() {
  const context = useContext(QuestionnaireContext)
  if (context === undefined) {
    throw new Error('useQuestionnaire must be used within a QuestionnaireProvider')
  }
  return context
} 