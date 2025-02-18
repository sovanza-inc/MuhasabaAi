import { AcceptInvitePage } from '#features/workspaces/invite/accept-invite-page'
import { createPage } from '#lib/create-page'

const { Page, metadata } = createPage({
  title: 'Accept invitation',
  params: ['token'],
  component: AcceptInvitePage,
})

export { metadata }

export default Page
