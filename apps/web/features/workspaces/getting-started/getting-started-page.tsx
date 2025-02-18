'use client'

import * as React from 'react'

import { Center, Container } from '@chakra-ui/react'
import { useSessionStorageValue } from '@react-hookz/web'
import {
  LoadingOverlay,
  LoadingSpinner,
  Steps,
  StepsCompleted,
  StepsItem,
} from '@saas-ui/react'
import { useRouter } from 'next/navigation'

import { AppearanceStep } from './appearance'
import { CreateWorkspaceStep } from './create-workspace'
import { InviteTeamMembersStep } from './invite-team-members'
import { OnboardingLayout } from './onboarding-layout'
import { SubscribeStep } from './subscribe'

export const GettingStartedPage: React.FC = () => {
  return (
    <OnboardingLayout>
      <Container maxW="container.md">
        <Center minH="$100vh">
          <Steps variant="dots" flexDirection="column-reverse" width="full">
            <StepsItem title="Create workspace">
              <CreateWorkspaceStep />
            </StepsItem>
            <StepsItem title="Choose your style">
              <AppearanceStep />
            </StepsItem>
            <StepsItem title="Invite team members">
              <InviteTeamMembersStep />
            </StepsItem>
            <StepsItem title="Subscribe to updates">
              <SubscribeStep />
            </StepsItem>

            <StepsCompleted>
              <OnboardingCompleted />
            </StepsCompleted>
          </Steps>
        </Center>
      </Container>
    </OnboardingLayout>
  )
}

const OnboardingCompleted = () => {
  const router = useRouter()
  const workspace = useSessionStorageValue('getting-started.workspace')

  React.useEffect(() => {
    router.push(`/${workspace.value}`)
  }, [router, workspace.value])

  return (
    <LoadingOverlay
      variant="overlay"
      bg="chakra-body-bg"
      _dark={{ bg: 'chakra-body-bg' }}
    >
      <LoadingSpinner />
    </LoadingOverlay>
  )
}
