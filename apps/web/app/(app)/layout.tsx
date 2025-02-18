import { Suspense } from 'react'

import { getSession } from '@acme/better-auth'
import { AppLoader } from '@acme/ui/app-loader'

import { HydrateClient, api } from '#lib/trpc/rsc'

import { AuthGuard } from './auth-guard'

export default async function AppRootLayout(props: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (session) {
    await api.auth.me.prefetch()

    return (
      <HydrateClient>
        <AuthGuard />
        <Suspense fallback={<AppLoader />}>{props.children}</Suspense>
      </HydrateClient>
    )
  }

  return <AuthGuard />
}
