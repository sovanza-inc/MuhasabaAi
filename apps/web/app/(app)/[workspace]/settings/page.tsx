import { SettingsOverviewPage } from '#features/settings/overview/overview-page'
import { createPage } from '#lib/create-page'

const { Page, metadata } = createPage({
  title: 'Organization Settings',
  component: SettingsOverviewPage,
})

export { metadata }
export default Page
