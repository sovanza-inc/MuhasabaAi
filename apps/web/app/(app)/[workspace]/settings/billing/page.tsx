import { BillingPage } from '#features/settings/billing/billing-page'
import { createPage } from '#lib/create-page'

const { Page, metadata } = createPage({
  title: 'Billing',
  component: BillingPage,
})

export { metadata }
export default Page
