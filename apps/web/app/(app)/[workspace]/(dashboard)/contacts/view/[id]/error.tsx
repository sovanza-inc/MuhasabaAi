'use client'

import { Button } from '@chakra-ui/react'
import { EmptyState } from '@saas-ui/react'
import { TRPCClientError } from '@trpc/client'
import { useParams } from 'next/navigation'

export default function ContactsViewErrorPage({
  error,
  reset,
}: {
  error: typeof TRPCClientError | Error
  reset: () => void
}) {
  const params = useParams()

  if (error instanceof TRPCClientError && error.data.httpStatus === 404) {
    return (
      <EmptyState
        title="Contact not found"
        description={
          <>
            There is no contact with id <strong>{params.id}</strong>
          </>
        }
        height="full"
      />
    )
  }

  return (
    <EmptyState
      title="Failed to load contact"
      description="An error occurred while loading the contact."
      height="full"
      actions={
        <>
          <Button onClick={reset}>Try again</Button>
        </>
      }
    />
  )
}
