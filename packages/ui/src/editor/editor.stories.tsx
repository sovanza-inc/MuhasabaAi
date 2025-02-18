import * as z from 'zod'
import { FormLayout, SubmitButton } from '@saas-ui/forms'
import { createZodForm } from '@saas-ui/forms/zod'
import { Meta } from '@storybook/react'

import { Editor, EditorField } from './'

const Form = createZodForm({
  fields: {
    editor: EditorField,
  },
})

export default {
  title: 'Components/Editor',
  component: Editor,
} as Meta

export const Default = {
  args: {},
}

const schema = z.object({
  title: z.string().min(4),
  editor: z.string().min(4),
})

export const Field = {
  render: () => (
    <Form schema={schema} onSubmit={async () => null}>
      {({ Field }) => (
        <FormLayout>
          <Field name="title" label="Title" />
          <Field name="editor" type="editor" label="Editor" />
          <SubmitButton />
        </FormLayout>
      )}
    </Form>
  ),
  args: {},
}
