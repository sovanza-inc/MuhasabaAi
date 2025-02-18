'use client'

import React, { useState } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'
import { loggerLink, unstable_httpBatchStreamLink } from '@trpc/client'
import SuperJSON from 'superjson'

import { getBaseUrl } from '#features/common/util/get-base-url.ts'
import { getQueryClient } from '#lib/react-query/get-query-client.ts'
import { ReactQueryDevtools } from '#lib/react-query/react-query-devtools.tsx'

import { api } from './react.ts'

export const TRPCProvider: React.FC<{ children: React.ReactNode }> = (
  props,
) => {
  const baseUrl = getBaseUrl()

  const queryClient = getQueryClient()

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === 'development' ||
            (op.direction === 'down' && op.result instanceof Error),
        }),
        unstable_httpBatchStreamLink({
          transformer: SuperJSON,
          url: baseUrl + '/api/trpc',
          async headers() {
            const headers = new Headers()

            headers.set('x-trpc-source', 'nextjs')

            return headers
          },
        }),
      ],
    }),
  )

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {props.children}
        <ReactQueryDevtools />
      </QueryClientProvider>
    </api.Provider>
  )
}
