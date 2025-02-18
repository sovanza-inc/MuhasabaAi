import { ContactsViewPage } from '#features/contacts/view/view-page'
import { createPage } from '#lib/create-page'

const { Page, metadata } = createPage({
  title: 'Contact',
  params: ['workspace', 'id'],
  component: ContactsViewPage,
})

export { metadata }
export default Page
