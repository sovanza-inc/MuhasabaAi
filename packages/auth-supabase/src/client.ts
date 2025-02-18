import { createBrowserClient } from '@supabase/ssr'

import { env } from './env'

export { createAuthService } from '@saas-ui/supabase'

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
