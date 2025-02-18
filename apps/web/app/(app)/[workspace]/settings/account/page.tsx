import { AccountProfilePage } from '#features/settings/account/account-profile-page'
import { createPage } from '#lib/create-page'

const { Page, metadata } = createPage({
  title: 'Account Settings',
  component: () => <AccountProfilePage />,
})

export { metadata }
export default Page
