import { AccountNotificationsPage } from '#features/settings/account/account-notifications-page'
import { createPage } from '#lib/create-page'

const { Page, metadata } = createPage({
  title: 'Notifications',
  component: AccountNotificationsPage,
})

export { metadata }
export default Page
