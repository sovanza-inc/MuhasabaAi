'use client'

import React from 'react'
import {
  Box,
  Button,
  useToast,
  VStack,
  Heading,
  Text,
  Spinner,
} from '@chakra-ui/react'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import { QuestionnaireForm } from '#components/Questionnaire/QuestionnaireForm'

interface QuestionnaireEditViewProps {
  onClose?: () => void
}

export default function QuestionnaireEditView({ onClose }: QuestionnaireEditViewProps) {
  const toast = useToast()
  const [workspace] = useCurrentWorkspace()
  const [isLoading, setIsLoading] = React.useState(true)
  const [responses, setResponses] = React.useState<any>(null)
  const [isEditing, setIsEditing] = React.useState(false)

  React.useEffect(() => {
    fetchQuestionnaireResponses()
  }, [workspace?.id])

  const fetchQuestionnaireResponses = async () => {
    if (!workspace?.id) {
      console.error('No workspace ID available')
      return
    }

    setIsLoading(true)
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
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditComplete = async () => {
    try {
      setIsEditing(false)
      await fetchQuestionnaireResponses()
      toast({
        title: 'Success',
        description: 'Your responses have been updated successfully.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      })
      if (onClose) onClose()
    } catch (error) {
      console.error('Error completing edit:', error)
      toast({
        title: 'Error',
        description: 'Failed to refresh the updated responses. Please reload the page.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  if (isLoading) {
    return (
      <Box p={8} textAlign="center">
        <Spinner size="xl" />
        <Text mt={4}>Loading your responses...</Text>
      </Box>
    )
  }

  if (isEditing) {
    return <QuestionnaireForm onComplete={handleEditComplete} initialData={responses} />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <Box p={8} bg="white" borderRadius="xl">
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="lg" mb={2}>Questionnaire Responses</Heading>
          <Text color="gray.600">
            Review and edit your onboarding information
          </Text>
        </Box>

        {responses ? (
          <>
            <VStack spacing={6} align="stretch">
              <Box>
                <Heading size="md" mb={2}>Business Information</Heading>
                <Text><strong>Business Name:</strong> {responses.businessName}</Text>
                <Text><strong>Industry:</strong> {responses.industry}</Text>
                <Text><strong>Operating Since:</strong> {responses.operatingSince}</Text>
              </Box>

              {responses.hasAccountsPayable && (
                <Box>
                  <Heading size="md" mb={2}>Accounts Payable</Heading>
                  {responses.accountsPayable.map((payable: any, index: number) => (
                    <Box key={index} p={4} bg="gray.50" borderRadius="md" mb={2}>
                      <Text><strong>Vendor:</strong> {payable.vendorName}</Text>
                      <Text><strong>Amount:</strong> AED {payable.amount}</Text>
                      <Text><strong>Due Date:</strong> {formatDate(payable.dueDate)}</Text>
                      <Text><strong>Terms:</strong> {payable.terms}</Text>
                    </Box>
                  ))}
                </Box>
              )}

              {responses.hasAccountsReceivable && (
                <Box>
                  <Heading size="md" mb={2}>Accounts Receivable</Heading>
                  {responses.accountsReceivable.map((receivable: any, index: number) => (
                    <Box key={index} p={4} bg="gray.50" borderRadius="md" mb={2}>
                      <Text><strong>Customer:</strong> {receivable.customerName}</Text>
                      <Text><strong>Amount:</strong> AED {receivable.amount}</Text>
                      <Text><strong>Due Date:</strong> {formatDate(receivable.dueDate)}</Text>
                      <Text><strong>Terms:</strong> {receivable.terms}</Text>
                    </Box>
                  ))}
                </Box>
              )}

              {responses.hasLoans && (
                <Box>
                  <Heading size="md" mb={2}>Loans</Heading>
                  {responses.loans.map((loan: any, index: number) => (
                    <Box key={index} p={4} bg="gray.50" borderRadius="md" mb={2}>
                      <Text><strong>Purpose:</strong> {loan.purpose}</Text>
                      <Text><strong>Amount:</strong> AED {loan.amount}</Text>
                      <Text><strong>Interest Rate:</strong> {loan.interestRate}%</Text>
                      <Text><strong>Monthly Payment:</strong> AED {loan.monthlyPayment}</Text>
                      <Text><strong>Start Date:</strong> {formatDate(loan.startDate)}</Text>
                    </Box>
                  ))}
                </Box>
              )}

              <Button
                colorScheme="green"
                size="lg"
                onClick={() => setIsEditing(true)}
                mt={4}
              >
                Edit Responses
              </Button>
            </VStack>
          </>
        ) : (
          <Text>No responses found. Please complete the onboarding questionnaire.</Text>
        )}
      </VStack>
    </Box>
  )
} 