'use client'

import { Button, Container, Heading, Stack, Text } from '@chakra-ui/react'
import {
  EmptyState,
  LoadingOverlay,
  LoadingSpinner,
  useSnackbar,
} from '@saas-ui/react'
import { useRouter } from 'next/navigation'

import { LogoIcon } from '@acme/ui/logo'

import { api } from '#lib/trpc/react'

export function AcceptInvitePage({ params }: { params: { token: string } }) {
  const snackbar = useSnackbar()
  const router = useRouter()

  const { data, isLoading, error } = api.workspaceMembers.invitation.useQuery({
    token: params.token,
  })

  const mutation = api.workspaceMembers.acceptInvitation.useMutation({
    onSuccess() {
      snackbar.success({
        title: 'Invitation accepted',
        description: 'You have successfully joined the workspace.',
      })

      router.push(`/${data?.workspace.slug}`)
    },
    onError(error) {
      console.error(error)
      snackbar.error({
        title: 'Failed to accept invitation',
        description: error.message,
      })
    },
  })

  if (isLoading) {
    return (
      <LoadingOverlay variant="fill">
        <LoadingSpinner />
      </LoadingOverlay>
    )
  }

  if (error) {
    return (
      <EmptyState
        title="Token invalid or expired"
        description="Please ask the person who invited you to send a new invitation."
      />
    )
  }

  return (
    <Stack flex="1" direction="row">
      <Stack
        flex="1"
        alignItems="flex-start"
        justify="center"
        direction="column"
        spacing="8"
      >
        <Container>
          <LogoIcon boxSize="10" mb="8" />

          <Heading as="h2" size="lg" mb="6">
            {data?.invitedBy ? (
              <>
                {data.invitedBy} invited you to join the {data?.workspace.name}{' '}
                workspace
              </>
            ) : (
              <>
                You have been invited to join the {data?.workspace.name}{' '}
                workspace
              </>
            )}
          </Heading>
          <Text fontSize="md" mb="6">
            Saas UI helps you build intuitive SaaS products with speed.
          </Text>
          <Button
            colorScheme="primary"
            size="md"
            isLoading={mutation.isPending}
            onClick={() => {
              mutation.mutate({
                token: params.token,
              })
            }}
          >
            Accept invitation
          </Button>
        </Container>
      </Stack>
    </Stack>
  )
}
