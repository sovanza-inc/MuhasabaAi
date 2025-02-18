import { PlansPage } from '#features/settings/billing/plans-page'
import { createPage } from '#lib/create-page'

const { Page, metadata } = createPage({
  title: 'Plans',
  component: PlansPage,
})

export { metadata }
export default Page
