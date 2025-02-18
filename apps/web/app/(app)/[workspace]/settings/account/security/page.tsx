import { AccountSecurityPage } from '#features/settings/account/account-security-page'
import { createPage } from '#lib/create-page'

const { Page, metadata } = createPage({
  title: 'Security',
  component: AccountSecurityPage,
})

export { metadata }
export default Page
