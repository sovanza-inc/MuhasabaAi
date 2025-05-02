import React from 'react'
import {
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  useDisclosure,
  Box,
  ModalHeader,
  ModalBody,
  useBreakpointValue,
} from '@chakra-ui/react'
import { EditIcon } from '@chakra-ui/icons'
import { QuestionnaireForm } from './QuestionnaireForm'

interface FloatingQuestionnaireButtonProps {
  initialData?: any // Using any for now, but you should use the same type as in QuestionnaireForm
  onComplete: () => Promise<void>
}

export function FloatingQuestionnaireButton({ initialData, onComplete }: FloatingQuestionnaireButtonProps) {
  const { isOpen, onOpen, onClose } = useDisclosure()

  const modalSize = useBreakpointValue({
    base: 'full',
    sm: 'full',
    md: '6xl',
  })

  const handleComplete = async () => {
    await onComplete()
    onClose()
  }

  return (
    <>
      <Box
        position="fixed"
        bottom="4"
        right="4"
        zIndex="999"
      >
        <IconButton
          aria-label="Edit Questionnaire"
          icon={<EditIcon boxSize={5} />}
          onClick={onOpen}
          colorScheme="green"
          size="lg"
          rounded="full"
          shadow="lg"
          width="56px"
          height="56px"
        />
      </Box>

      <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        size={modalSize}
        isCentered
      >
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent 
          maxH={{ base: '100vh', md: '90vh' }}
          mx={{ base: 0, md: 4 }}
          my={{ base: 0, md: 4 }}
          borderRadius={{ base: 0, md: 'md' }}
        >
          <ModalHeader 
            borderBottomWidth="1px"
            fontSize={{ base: 'lg', md: 'xl' }}
            py={{ base: 3, md: 4 }}
          >
            Edit Questionnaire
          </ModalHeader>
          <ModalCloseButton 
            top={{ base: 2, md: 3 }}
            right={{ base: 2, md: 3 }}
          />
          <ModalBody 
            p={0} 
            sx={{
              '&::-webkit-scrollbar': {
                display: 'none'
              },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              overflowY: 'auto',
              maxHeight: { 
                base: 'calc(100vh - 57px)', // Smaller header for mobile
                md: 'calc(90vh - 60px)' 
              }
            }}
          >
            <Box 
              p={{ base: 3, md: 6 }}
              className="questionnaire-form-container"
            >
              <QuestionnaireForm
                onComplete={handleComplete}
                initialData={initialData}
              />
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
} 