import {
  ContactsListPage,
  paramsSchema,
} from '#features/contacts/list/list-page'
import { createPage } from '#lib/create-page'

const { Page, metadata } = createPage({
  title: 'Contacts',
  params: paramsSchema,
  component: ContactsListPage,
})

export { metadata }
export default Page
