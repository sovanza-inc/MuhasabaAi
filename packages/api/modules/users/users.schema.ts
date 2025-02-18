import { z } from 'zod'

import { createInsertSchema, users } from '@acme/db'

export const CreateUserSchema = createInsertSchema(users)

export const UpdateUserSchema = createInsertSchema(users)

export type UserDTO = z.infer<typeof CreateUserSchema>
