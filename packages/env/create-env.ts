import { z } from 'zod'

export function createEnv<Schema extends z.AnyZodObject>(
  schema: Schema,
  clientEnv?: Partial<z.infer<Schema>>,
): z.infer<Schema> {
  const env = {
    ...process.env,
    ...clientEnv,
  }

  if (!!process.env.CI || process.env.npm_lifecycle_event === 'lint') {
    return env as any
  }

  const result = schema.safeParse({
    ...process.env,
    ...clientEnv,
  })

  if (!result.success) {
    throw new Error(
      'Invalid environment variables:\n' +
        result.error.errors
          .map((error) => `❗'${error.path['0']}' ${error.message}`)
          .join('\n'),
    )
  }

  return result.data
}
