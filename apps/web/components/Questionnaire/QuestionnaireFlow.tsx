'use client'

import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import { useAuth } from '@saas-ui/auth-provider'
import { QuestionnaireForm } from './QuestionnaireForm'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Spinner,
  Center,
  useToast,
  Text,
} from '@chakra-ui/react'

interface QuestionnaireFlowProps {
  children: React.ReactNode
}

export function QuestionnaireFlow({ children }: QuestionnaireFlowProps) {
  const router = useRouter()
  const pathname = usePathname()
  const toast = useToast()
  const { user } = useAuth()
  const [workspace, workspaceState] = useCurrentWorkspace()
  const [showQuestionnaire, setShowQuestionnaire] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const hasCheckedSubscription = React.useRef(false)
  const hasCheckedQuestionnaire = React.useRef(false)
  const isNavigating = React.useRef(false)

  // First check subscription
  React.useEffect(() => {
    let isMounted = true

    const checkSubscription = async () => {
      if (isNavigating.current || !workspace?.id || !workspaceState.isSuccess || !user?.id) {
        return
      }

      if (hasCheckedSubscription.current) {
        return
      }

      try {
        const subscriptionResponse = await fetch(`/api/user-subscriptions?user_id=${user?.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        hasCheckedSubscription.current = true

        if (subscriptionResponse.status === 404) {
          // Only redirect to plans page if we're not already there and there's no subscription at all
          if (!pathname.includes('/settings/plans')) {
            router.push(`/${workspace.slug}/settings/plans`)
          }
          if (isMounted) {
            setIsLoading(false)
          }
          return
        }

        // If we got a successful response but the subscription is not active
        if (subscriptionResponse.ok) {
          const data = await subscriptionResponse.json()
          // If the subscription exists but is not active, don't redirect
          // The dashboard will handle showing the appropriate UI
          if (!data.hasActiveSubscription) {
            if (isMounted) {
              setIsLoading(false)
            }
            return
          }
        }

        
        setIsLoading(false)
      } catch {
        if (isMounted) {
          toast({
            title: 'Error',
            description: 'Failed to check subscription status.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          })
          setIsLoading(false)
        }
      }
    }

    checkSubscription()

    return () => {
      isMounted = false
    }
  }, [workspace?.id, workspaceState.isSuccess, pathname, router, toast, user?.id])

  // Then check questionnaire only if subscription exists and we're not on plans page
  React.useEffect(() => {
    let isMounted = true

    const checkQuestionnaire = async () => {
      if (isNavigating.current || !workspace?.id || !workspaceState.isSuccess || !user?.id) {
        return
      }

      if (!hasCheckedSubscription.current || pathname.includes('/settings/plans')) {
        return
      }

      if (hasCheckedQuestionnaire.current) {
        return
      }

      try {
        const questionnaireResponse = await fetch(`/api/questionnaire?userId=${user?.id}&workspaceId=${workspace.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (questionnaireResponse.status === 404) {
          if (isMounted) {
            setShowQuestionnaire(true)
            hasCheckedQuestionnaire.current = true
          }
          return
        }

        await questionnaireResponse.json()
        
        if (isMounted) {
          hasCheckedQuestionnaire.current = true
          await checkCustomer()
        }
      } catch {
        if (isMounted) {
          toast({
            title: 'Error',
            description: 'Failed to check questionnaire status.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          })
        }
      }
    }

    checkQuestionnaire()

    return () => {
      isMounted = false
    }
  }, [workspace?.id, workspaceState.isSuccess, pathname, router, toast, user?.id, hasCheckedSubscription.current])

  const checkCustomer = async () => {
    if (!workspace?.id) return

    try {
      isNavigating.current = true
      const authResponse = await fetch('/api/bank-integration/auth')
      if (!authResponse.ok) throw new Error('Failed to authenticate')
      
      const authData = await authResponse.json()
      await fetch(`/api/bank-integration/get-customer?app_user_id=${workspace.id}`, {
        headers: { 'Authorization': `Bearer ${authData.access_token}` }
      })

      if (pathname !== `/${workspace.slug}`) {
        router.push(`/${workspace.slug}`)
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to verify customer status.',
        status: 'error',
        duration: 5000,
      })
    } finally {
      setIsLoading(false)
      isNavigating.current = false
    }
  }

  const handleQuestionnaireComplete = async () => {
    try {
      isNavigating.current = true
      setShowQuestionnaire(false)
      await checkCustomer()
    } finally {
      isNavigating.current = false
    }
  }

  if ((!workspaceState.isSuccess && !isNavigating.current) || isLoading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="blue.500" thickness="4px" />
      </Center>
    )
  }

  return (
    <>
      {children}
      {showQuestionnaire && !pathname.includes('/settings/plans') && (
        <Modal 
          isOpen={true}
          onClose={() => {}} 
          closeOnOverlayClick={false}
          closeOnEsc={false}
          size="xl"
        >
          <ModalOverlay backdropFilter='blur(10px)' />
          <ModalContent maxW="1100px">
            <ModalBody p={6}>
              <Text mb={4} fontSize="lg" fontWeight="bold">Please complete the questionnaire to continue</Text>
              <QuestionnaireForm onComplete={handleQuestionnaireComplete} />
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
    </>
  )
} 