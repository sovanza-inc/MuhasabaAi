'use client'

import React from 'react'
import { useToast } from '@chakra-ui/react'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import { FloatingQuestionnaireButton } from './FloatingQuestionnaireButton'

interface QuestionnaireProviderProps {
  children: React.ReactNode
}

export function QuestionnaireProvider({ children }: QuestionnaireProviderProps) {
  const toast = useToast()
  const [workspace] = useCurrentWorkspace()
  const [responses, setResponses] = React.useState<any>(null)

  React.useEffect(() => {
    fetchQuestionnaireResponses()
  }, [workspace?.id])

  const fetchQuestionnaireResponses = async () => {
    if (!workspace?.id) {
      console.error('No workspace ID available')
      return
    }

    try {
      const response = await fetch(`/api/questionnaire/${workspace.id}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',  // Prevent caching
        }
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to fetch questionnaire responses')
      }

      const data = await response.json()
      setResponses(data.responses)
    } catch (error: unknown) {
      console.error('Error fetching responses:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch your responses. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const handleComplete = async () => {
    await fetchQuestionnaireResponses()
    toast({
      title: 'Success',
      description: 'Your responses have been updated successfully.',
      status: 'success',
      duration: 5000,
      isClosable: true,
    })
  }

  return (
    <>
      {children}
      <FloatingQuestionnaireButton initialData={responses} onComplete={handleComplete} />
    </>
  )
} 