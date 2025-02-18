import { createServerClient } from '@supabase/ssr'
import type { Session } from '@supabase/supabase-js'
import { type NextFetchEvent, NextRequest, NextResponse } from 'next/server'

import { env } from './env'

async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // This will make sure the session is refreshed
  const { data } = await supabase.auth.getUser()

  return {
    response,
    user: data?.user,
  }
}

interface SupabaseRequest extends NextRequest {
  auth: {
    user: Session['user'] | null
  }
}

type SupabaseMiddleware = (
  request: SupabaseRequest,
  supabaseResponse: NextResponse,
) => NextResponse

type AuthArgs = [NextRequest, NextFetchEvent] | [SupabaseMiddleware]

export function auth(...args: AuthArgs) {
  if (args[0] instanceof NextRequest) {
    return updateSession(args[0]).then(({ response }) => response)
  } else if (isMiddlewareWrapper(args[0])) {
    const middleware = args[0]
    return async (request: NextRequest) => {
      const { response, user } = await updateSession(request)

      const augmentedReq = request as SupabaseRequest
      augmentedReq.auth = {
        user,
      }

      return await middleware(augmentedReq, response)
    }
  }
  return NextResponse.next()
}

function isMiddlewareWrapper(arg: any): arg is SupabaseMiddleware {
  return typeof arg === 'function'
}
