import { createServerSideHelpers } from '@trpc/react-query/server'
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import superjson from 'superjson'

import { createTRPCContext } from './context'
import type { AppRouter } from './router'
import { appRouter } from './router'
import { createCallerFactory } from './trpc'

export {
  TRPCError,
  createTRPCRouter,
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  workspaceProcedure,
} from './trpc'

/**
 * Create a server-side caller for the tRPC API
 * @example
 * const trpc = createCaller(createContext)
 * const res = await trpc.post.all()
 *       ^? Post[]
 */
const createCaller = createCallerFactory(appRouter)

/**
 * Create server-side helpers for the tRPC API
 * @example
 * const helpers = createHelpers(createContext)
 * const { data } = await helpers.post.all.prefetch()
 *       ^? Post[]
 *
 * helpers.dehydrate()
 */
const createHelpers = async (
  createContext: () => ReturnType<typeof createTRPCContext>,
) =>
  createServerSideHelpers({
    router: appRouter,
    ctx: await createContext(),
    transformer: superjson,
  })

/**
 * Inference helpers for input types
 * @example type HelloInput = RouterInputs['example']['hello']
 **/
type RouterInputs = inferRouterInputs<AppRouter>

/**
 * Inference helpers for output types
 * @example type HelloOutput = RouterOutputs['example']['hello']
 **/
type RouterOutputs = inferRouterOutputs<AppRouter>

export { appRouter, createCaller, createHelpers, createTRPCContext }
export type { AppRouter, RouterInputs, RouterOutputs }
