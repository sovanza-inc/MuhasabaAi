import { TRPCClientError, createTRPCReact } from '@trpc/react-query'

import type { AppRouter } from '@acme/api/types'

export type { RouterInputs, RouterOutputs } from '@acme/api/types'

export const api = createTRPCReact<AppRouter>()

export function isTRPCClientError(
  cause: unknown,
): cause is TRPCClientError<AppRouter> {
  return cause instanceof TRPCClientError
}
