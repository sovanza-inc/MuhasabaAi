import { AccountApiPage } from '#features/settings/account/account-api-page'
import { createPage } from '#lib/create-page'

const { Page, metadata } = createPage({
  title: 'API',
  component: AccountApiPage,
})

export { metadata }
export default Page
