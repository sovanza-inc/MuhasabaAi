import { Suspense } from 'react'

import { ErrorBoundary } from '@saas-ui/react'

import { BillingProvider } from '#features/billing/providers/billing-provider'
import { WorkspaceLoading } from '#features/workspaces/workspace.loading'
import { WorkspaceNotFound } from '#features/workspaces/workspace.not-found'
import { HydrateClient, api } from '#lib/trpc/rsc'

export default async function WorkspaceLayout(props: {
  params: Promise<{
    workspace: string
  }>
  children: React.ReactNode
}) {
  const slug = (await props.params).workspace

  api.workspaces.bySlug.prefetch({
    slug,
  })

  return (
    <HydrateClient>
      <Suspense fallback={<WorkspaceLoading />}>
        <ErrorBoundary fallback={<WorkspaceNotFound />}>
          <BillingProvider>{props.children}</BillingProvider>
        </ErrorBoundary>
      </Suspense>
    </HydrateClient>
  )
}
