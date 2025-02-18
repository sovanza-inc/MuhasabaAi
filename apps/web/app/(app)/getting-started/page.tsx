import { GettingStartedPage } from '#features/workspaces/getting-started'
import { createPage } from '#lib/create-page'

const { Page, metadata } = createPage({
  title: 'Getting started',
  component: () => {
    return <GettingStartedPage />
  },
})

export { metadata }
export default Page
