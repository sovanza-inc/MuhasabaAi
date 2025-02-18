'use client'

import { useEffect } from 'react'

import { LoadingOverlay, LoadingSpinner } from '@saas-ui/react'
import { useRouter } from 'next/navigation'

import { useCurrentUser } from '#features/common/hooks/use-current-user'
import { useWorkspace } from '#features/common/hooks/use-workspace'

/**
 * We use `localStorage` to store the current workspace
 * so we have to use a client component here.
 */
export function HomePage() {
  const router = useRouter()

  const [user, { error }] = useCurrentUser()

  const workspace = useWorkspace()

  useEffect(() => {
    if (workspace && user?.workspaces?.some((w) => w.slug === workspace)) {
      router.push(`/${workspace}`)
    } else if (user?.workspaces?.[0]) {
      router.push(`/${user.workspaces[0].slug}`)
    } else if (!error) {
      router.push('/getting-started')
    }
  }, [router, workspace, error, user])

  return (
    <LoadingOverlay variant="fullscreen" suppressHydrationWarning>
      <LoadingSpinner />
    </LoadingOverlay>
  )
}
