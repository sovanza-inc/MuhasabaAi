import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db, users } from '@acme/db'

import { UpdateUserSchema, UserDTO } from './users.schema'

const parseName = (name?: string | null) => {
  if (!name) {
    return {}
  }

  const [firstName, ...lastName] = name.split(' ')
  return {
    firstName,
    lastName: lastName.join(' '),
  }
}

export const userById = async (id: UserDTO['id']) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: {
      id: true,
      email: true,
      avatar: true,
      name: true,
      locale: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      updatedAt: true,
    },
    with: {
      workspaces: {
        with: {
          workspace: {
            columns: {
              id: true,
              name: true,
              slug: true,
              logo: true,
            },
          },
        },
      },
    },
  })

  if (!user) {
    return null
  }

  return {
    ...user,
    workspaces: user.workspaces.map((w) => w.workspace),
  }
}

export const createUser = async (input: UserDTO) => {
  const result = await db
    .insert(users)
    .values({
      ...input,
      ...parseName(input.name),
    })
    .onConflictDoNothing()
    .returning({
      insertedId: users.id,
    })
    .execute()

  const id = result[0]?.insertedId

  return id ? userById(id) : null
}

export const updateUserById = async (
  input: z.infer<typeof UpdateUserSchema>,
) => {
  const { id, ...$set } = input
  const result = await db
    .update(users)
    .set({
      ...$set,
      ...parseName(input.name),
    })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
    })

  return result[0]
}
