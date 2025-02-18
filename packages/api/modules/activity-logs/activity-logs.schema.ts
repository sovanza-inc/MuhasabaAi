import { ActivityLogInsertSchema } from '@acme/db'

export const ActivityLogCreateSchema = ActivityLogInsertSchema.partial({
  id: true,
})
