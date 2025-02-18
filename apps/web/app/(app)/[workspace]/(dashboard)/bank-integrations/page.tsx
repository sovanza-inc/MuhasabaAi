import { BankIntegrationsPage } from '#features/bank-integrations/bank-integrations-page'
import { createPage } from '#lib/create-page'

const { Page, metadata } = createPage({
  title: 'Bank Integrations',
  params: ['workspace'],
  component: BankIntegrationsPage,
})

export { metadata }
export default Page 