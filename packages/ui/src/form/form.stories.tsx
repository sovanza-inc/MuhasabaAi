import * as z from 'zod'
import { FormLayout, SubmitButton } from '@saas-ui/forms'
import { Meta } from '@storybook/react'

import { Form } from './form'

export default {
  title: 'Components/Form',
  component: Form,
} as Meta

const schema = z.object({
  title: z.string().min(4),
  date: z.string(),
  description: z.string().min(4),
})

export const Default = {
  render: () => (
    <Form
      schema={schema}
      defaultValues={{
        title: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
      }}
      onSubmit={async (data) => console.log(data)}
    >
      {({ Field }) => (
        <FormLayout>
          <Field name="title" label="Title" />
          <Field name="date" label="Date" type="date" />
          <Field name="description" label="Description" type="editor" />
          <SubmitButton />
        </FormLayout>
      )}
    </Form>
  ),
  args: {},
}
