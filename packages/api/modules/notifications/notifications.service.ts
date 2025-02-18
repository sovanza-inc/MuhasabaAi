import { z } from 'zod'

import {
  NotificationInsertSchema,
  and,
  db,
  desc,
  eq,
  notifications,
} from '@acme/db'

export const findNotificationsByUserId = async (args: {
  workspaceId: string
  userId: string
}) => {
  const results = await db.query.notifications.findMany({
    orderBy: desc(notifications.createdAt),
    where: and(
      eq(notifications.workspaceId, args.workspaceId),
      eq(notifications.targetType, 'user'),
      eq(notifications.targetId, args.userId),
    ),
  })

  return results
}

export const markNotificationAsRead = async (args: {
  workspaceId: string
  userId: string
  notificationId: string
}) => {
  return db
    .update(notifications)
    .set({
      readAt: new Date(),
    })
    .where(
      and(
        eq(notifications.workspaceId, args.workspaceId),
        eq(notifications.targetType, 'user'),
        eq(notifications.targetId, args.userId),
      ),
    )
}

export const createNotification = async (
  notification: z.infer<typeof NotificationInsertSchema>,
) => {
  return db.insert(notifications).values(notification)
}
