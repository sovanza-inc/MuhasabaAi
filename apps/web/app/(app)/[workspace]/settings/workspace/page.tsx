import { WorkspaceSettingsPage } from '#features/settings/workspace/workspace-settings-page'
import { createPage } from '#lib/create-page'

const { Page, metadata } = createPage({
  title: 'Workspace settings',
  component: WorkspaceSettingsPage,
})

export { metadata }
export default Page
