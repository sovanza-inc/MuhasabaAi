import { TagsSettingsPage } from '#features/settings/tags/tags-settings-page'
import { createPage } from '#lib/create-page'

const { Page, metadata } = createPage({
  title: 'Workspace tags',
  component: TagsSettingsPage,
})

export { metadata }
export default Page
