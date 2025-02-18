import { seedContacts } from './contacts'

export async function seedDemoData({
  workspaceId,
}: {
  userId: string
  workspaceId: string
}) {
  await seedContacts(workspaceId)
}
