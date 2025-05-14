'use client'

import { AppShell, AppShellProps } from '@saas-ui/react'
import { PaymentOverdueBanner } from '#features/billing/components/payment-overdue-banner'
import { FloatingQuestionnaireButton } from '#components/Questionnaire/FloatingQuestionnaireButton'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import { useToast } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

export interface AppLayoutProps extends AppShellProps {}

/**
 * Base layout for app pages.
 */
export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  sidebar,
  ...rest
}) => {
  const toast = useToast()
  const [workspace] = useCurrentWorkspace()
  const [questionnaireData, setQuestionnaireData] = useState<any>(null)

  useEffect(() => {
    const fetchQuestionnaireData = async () => {
      if (!workspace?.id) return

      try {
        const response = await fetch(`/api/questionnaire/${workspace.id}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
          }
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch questionnaire data')
        }

        const data = await response.json()
        setQuestionnaireData(data.responses)
      } catch (error) {
        console.error('Error fetching questionnaire data:', error)
      }
    }

    fetchQuestionnaireData()
  }, [workspace?.id])

  const handleQuestionnaireComplete = async () => {
    // Refetch the data after completion
    if (workspace?.id) {
      try {
        const response = await fetch(`/api/questionnaire/${workspace.id}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
          }
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch updated questionnaire data')
        }

        const data = await response.json()
        setQuestionnaireData(data.responses)
      } catch (error) {
        console.error('Error fetching updated questionnaire data:', error)
      }
    }

    toast({
      title: 'Success',
      description: 'Questionnaire updated successfully.',
      status: 'success',
      duration: 5000,
      isClosable: true,
    })
  }

  return (
    <AppShell
      h="$100vh"
      sidebar={sidebar}
      navbar={<PaymentOverdueBanner />}
      {...rest}
    >
      {children}
      {workspace && (
        <FloatingQuestionnaireButton 
          initialData={questionnaireData} 
          onComplete={handleQuestionnaireComplete}
        />
      )}
    </AppShell>
  )
}
