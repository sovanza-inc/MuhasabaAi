'use client'

import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
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

export function QuestionnaireFlow() {
  const router = useRouter()
  const pathname = usePathname()
  const toast = useToast()
  const [workspace, workspaceState] = useCurrentWorkspace()
  const [showQuestionnaire, setShowQuestionnaire] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const hasCheckedQuestionnaire = React.useRef(false)
  const isNavigating = React.useRef(false)

  // Reset states when workspace changes
  React.useEffect(() => {
    hasCheckedQuestionnaire.current = false
    isNavigating.current = false
    setShowQuestionnaire(false)
    setIsLoading(true)
  }, [workspace?.id])

  // Check if user needs to fill questionnaire
  React.useEffect(() => {
    let isMounted = true

    const checkQuestionnaire = async () => {
      // Don't proceed if we're navigating or if workspace is not ready
      if (isNavigating.current || !workspace?.id || !workspaceState.isSuccess) {
        return
      }

      // Prevent multiple checks in the same session
      if (hasCheckedQuestionnaire.current) {
        return
      }

      try {
        // First check if questionnaire exists
        const response = await fetch(`/api/questionnaire?workspaceId=${workspace.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        // If no questionnaire found, show the form
        if (response.status === 404) {
          if (isMounted) {
            setShowQuestionnaire(true)
            setIsLoading(false)
            hasCheckedQuestionnaire.current = true
          }
          return
        }

        // If questionnaire exists, check customer
        await response.json()
        
        if (isMounted) {
          hasCheckedQuestionnaire.current = true
          await checkCustomer()
        }
      } catch {
        if (isMounted) {
          setShowQuestionnaire(true)
          setIsLoading(false)
          hasCheckedQuestionnaire.current = true
          toast({
            title: 'Error',
            description: 'Failed to check questionnaire status. Please try again.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          })
        }
      }
    }

    if (workspace?.id && workspaceState.isSuccess) {
      checkQuestionnaire()
    }

    return () => {
      isMounted = false
    }
  }, [workspace?.id, workspaceState.isSuccess, pathname, router, toast])

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

      // Just navigate to workspace root regardless of customer status
      // This will let the normal bank integration flow handle 404 cases
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

  // Show loading spinner only while workspace is loading and we're not navigating
  if (!workspaceState.isSuccess && !isNavigating.current) {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="blue.500" thickness="4px" />
      </Center>
    )
  }

  // Show the questionnaire modal if needed
  return (
    <Modal 
      isOpen={showQuestionnaire} 
      onClose={() => {}} 
      closeOnOverlayClick={false}
      closeOnEsc={false}
      size="xl"
    >
      <ModalOverlay backdropFilter='blur(10px)' />
      <ModalContent maxW="800px">
        <ModalBody p={6}>
          <Text mb={4} fontSize="lg" fontWeight="bold">Please complete the questionnaire to continue</Text>
          <QuestionnaireForm onComplete={handleQuestionnaireComplete} />
        </ModalBody>
      </ModalContent>
    </Modal>
  )
} 