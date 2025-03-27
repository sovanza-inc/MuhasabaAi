import { InboxListPage } from '#features/contacts/inbox/inbox-page'
import { createPage } from '#lib/create-page'

const { Page, metadata } = createPage({
  title: 'Inbox',
  params: ['workspace', 'id'],
  component: (props) => <InboxListPage {...props} />,
})

export { metadata }
export default Page