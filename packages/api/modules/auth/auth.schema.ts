import { z } from 'zod'

import { accounts } from '@acme/better-auth'
import { createSelectSchema } from '@acme/db'

export const AuthAccounts = createSelectSchema(accounts)

export type AuthAccountsDTO = z.infer<typeof AuthAccounts>
