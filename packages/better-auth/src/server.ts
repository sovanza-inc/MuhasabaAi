import { cache } from 'react'

import { toNextJsHandler } from 'better-auth/next-js'
import { headers as getHeaders } from 'next/headers'

import { auth } from './auth'

/**
 * Returns the session object, if the user is logged in.
 * Can be called in server components, the result is cached.
 */
export const getSession = cache(async () => {
  const headers = await getHeaders()
  return await auth.api.getSession({ headers })
})

export const handlers = toNextJsHandler(auth)
