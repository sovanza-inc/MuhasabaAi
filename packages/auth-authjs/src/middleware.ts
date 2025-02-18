import NextAuth from 'next-auth'

import { authConfig } from './config'

/**
 * Edge compatible middleware
 * @see https://authjs.dev/getting-started/migrating-to-v5#edge-compatibility
 */
export const { auth } = NextAuth(authConfig)
