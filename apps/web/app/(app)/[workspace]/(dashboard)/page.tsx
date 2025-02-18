import { DashboardPage } from '#features/workspaces/dashboard'
import { createPage } from '#lib/create-page'

const { Page, metadata } = createPage({
  title: 'Dashboard',
  params: ['workspace'],
  component: ({ params }) => {
    return <DashboardPage params={params} />
  },
})

export { metadata }

export default Page
