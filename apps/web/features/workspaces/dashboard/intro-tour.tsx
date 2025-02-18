import * as React from 'react'
import { ButtonGroup, Text, useBreakpointValue, Box } from '@chakra-ui/react'
import {
  BenefitsModal,
  BenefitsModalBody,
  BenefitsModalFooter,
  BenefitsModalHeader,
  Tour,
  TourDialog,
  TourDialogActions,
  TourDialogBody,
  TourDialogFooter,
  TourDialogHeader,
  TourDismissButton,
  TourNextButton,
  TourSpotlight,
} from '@saas-ui-pro/onboarding'
import { ErrorBoundary, useLocalStorage } from '@saas-ui/react'
import { LogoIcon } from '@acme/ui/logo'

/**
 * Step type to avoid TypeScript errors
 */
type Step = {
  target: string
  title: string
  content: string
  placement: string
}

export const IntroTour = () => {
  const [tour, setTour] = useLocalStorage('muhasaba.intro-tour', false)

  const steps: Step[] = [
    {
      target: '[data-tour="workspaces"]',
      title: 'Workspaces',
      content: 'Muhasaba AI supports multiple workspaces for different organizations.',
      placement: 'right',
    },
    {
      target: '[data-tour="billing"]',
      title: 'Get Started',
      content: 'Start managing your Islamic finances with Muhasaba AI.',
      placement: 'right',
    },
  ]

  const onDismiss = () => {
    setTour(true)
  }

  const onTourComplete = () => {
    setTour(true)
  }

  return (
    <ErrorBoundary>
      <Tour
        defaultIsActive={!tour}
        onDismiss={onDismiss}
        onComplete={onTourComplete}
      >
        <BenefitsModal data-target="modal" hideOverlay>
          <BenefitsModalHeader>
            <Box textAlign="center" mb="8">
              <LogoIcon boxSize="8" mb="4" /> <Text>Welcome to Muhasaba AI</Text>
            </Box>
          </BenefitsModalHeader>
          <BenefitsModalBody fontSize="md" color="muted">
            Benefits modals can be used to highlight new features and their
            benefits in your app. Embed illustrations or videos to make ideas
            more accessible.
          </BenefitsModalBody>
          <BenefitsModalFooter>
            <ButtonGroup>
              <TourDismissButton />
              <TourNextButton>Start</TourNextButton>
            </ButtonGroup>
          </BenefitsModalFooter>
        </BenefitsModal>
        {steps.map((step, i) => (
          <TourDialog key={i} data-target={step.target}>
            <TourDialogHeader>{step.title}</TourDialogHeader>
            <TourDialogBody>{step.content}</TourDialogBody>
            <TourDialogFooter>
              <Text>
                Step {i + 1} of {steps.length}
              </Text>
              <TourDialogActions>
                <TourDismissButton />
                <TourNextButton variant="subtle" colorScheme="white">
                  {i === steps.length - 1 ? 'Finish' : 'Next'}
                </TourNextButton>
              </TourDialogActions>
            </TourDialogFooter>
          </TourDialog>
        ))}
        <TourSpotlight />
      </Tour>
    </ErrorBoundary>
  )
}
