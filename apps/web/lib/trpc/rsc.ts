import { cache } from 'react'

import { createHydrationHelpers } from '@trpc/react-query/rsc'

import { createCaller, createTRPCContext } from '@acme/api'
import type { AppRouter } from '@acme/api/types'
import { getSession } from '@acme/better-auth'

import { getQueryClient } from '#lib/react-query/get-query-client'

import { createAdapters } from './adapters'

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async () => {
  const adapters = createAdapters()

  const session = await getSession()

  return createTRPCContext({
    session,
    headers: new Headers({
      'x-trpc-source': 'rsc',
    }),
    adapters,
  })
})

export const caller = createCaller(createContext)

/**
 * This is the tRPC API caller that is used in server components and actions.
 */
export const { trpc: api, HydrateClient } = createHydrationHelpers<AppRouter>(
  caller,
  cache(() => getQueryClient()),
)
