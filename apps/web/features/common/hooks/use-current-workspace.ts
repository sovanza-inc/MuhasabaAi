'use client'

import { api } from '#lib/trpc/react'

import { useWorkspace } from './use-workspace'

export const useCurrentWorkspace = () => {
  const slug = useWorkspace()

  return api.workspaces.bySlug.useSuspenseQuery(
    { slug },
    {
      retry(failureCount, error) {
        return failureCount < 3 && error.data?.httpStatus !== 404
      },
    },
  )
}
