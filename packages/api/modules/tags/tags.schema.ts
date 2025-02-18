import { z } from 'zod'

import type { TagModel } from '@acme/db'

export type TagDTO = Pick<TagModel, 'id' | 'name' | 'color'>

export const CreateTagSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional().nullable(),
})

export const UpdateTagSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  color: z.string().optional().nullable(),
})

/**
 * The values of these colors can be changed in the ui-theme package
 * `packages/ui-theme/src/foundations/semantic-tokens.ts`
 */
export const tagColors = [
  'gray',
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'cyan',
  'purple',
  'pink',
]
