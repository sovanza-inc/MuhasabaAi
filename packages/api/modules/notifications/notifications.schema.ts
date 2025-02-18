import { type ContactModel, NotificationModel } from '@acme/db'

export { NotificationInsertSchema } from '@acme/db'

export type NotificationMetaData = Record<string, string | number>

export interface NotificationDTO extends Omit<NotificationModel, 'metadata'> {
  metadata: NotificationMetaData
  subject?: ContactModel
}

export enum NotificationTypes {
  ACTION = 'action',
  COMMENT = 'comment',
  MENTIONED = 'mentioned',
  FIELD_UPDATED = 'field-updated',
  TAGS_UPDATED = 'tags-updated',
  STATUS_UPDATED = 'status-updated',
}
