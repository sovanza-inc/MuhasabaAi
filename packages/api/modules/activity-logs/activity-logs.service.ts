import { z } from 'zod'

import { activityLogs, and, asc, createId, db, eq } from '@acme/db'

import { ActivityLogCreateSchema } from './activity-logs.schema'

export const findActivitiesByContactId = async (input: {
  workspaceId: string
  id: string
}) => {
  const { workspaceId, id } = input

  const activities = await db.query.activityLogs.findMany({
    where: and(
      eq(activityLogs.workspaceId, workspaceId),
      eq(activityLogs.subjectId, id),
      eq(activityLogs.subjectType, 'contact'),
    ),
    orderBy: asc(activityLogs.createdAt),
  })

  return activities
}

export const createActivityLog = async (
  input: z.infer<typeof ActivityLogCreateSchema>,
) => {
  const {
    workspaceId,
    actorId,
    actorType,
    subjectId,
    subjectType,
    type,
    metadata,
  } = input

  const activity = await db.insert(activityLogs).values({
    id: input.id ?? createId(),
    workspaceId,
    actorId,
    actorType,
    subjectId,
    subjectType,
    type,
    metadata,
  })

  return activity
}

export const deleteActivityLog = async (args: {
  id: string
  workspaceId: string
}) => {
  return db
    .delete(activityLogs)
    .where(
      and(
        eq(activityLogs.workspaceId, args.workspaceId),
        eq(activityLogs.id, args.id),
      ),
    )
}
