import { MembersSettingsPage } from '#features/settings/members/members-page'
import { createPage } from '#lib/create-page'

const { Page, metadata } = createPage({
  title: 'Members',
  component: MembersSettingsPage,
})

export { metadata }
export default Page
