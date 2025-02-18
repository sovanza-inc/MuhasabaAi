import { createEnv } from 'env/create'
import { z } from 'zod'

export const env = createEnv(
  z.object({
    AUTH_DEBUG: z.coerce.boolean().optional(),
    AUTH_SECRET: z.string(),
    EMAIL_FROM: z.string(),
  }),
)
