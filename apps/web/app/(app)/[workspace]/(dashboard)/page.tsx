import { DashboardPage } from '#features/workspaces/dashboard'
import { createPage } from '#lib/create-page'

const { Page, metadata } = createPage({
  title: 'Dashboard',
  params: ['workspace'],
  component: () => {
    return <DashboardPage />
  },
})

export { metadata }

export default Page
