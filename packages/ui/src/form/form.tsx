import { forwardRef } from '@chakra-ui/react'
import {
  DateInput,
  DateInputProps,
  DateValue,
  parseDate,
} from '@saas-ui/date-picker'
import { createField } from '@saas-ui/forms'
import { createZodForm } from '@saas-ui/forms/zod'
import { createZodFormDialog } from '@saas-ui/modals/zod'

import { EditorField } from '../editor'

interface DateFieldProps extends Omit<DateInputProps, 'value' | 'onChange'> {
  value?: string
  onChange?: (value: string) => void
}

const DateField = createField(
  forwardRef<DateFieldProps, 'input'>((props, ref) => {
    const { value: valueProp, onChange: onChangeProp, ...rest } = props

    const value =
      typeof valueProp === 'string' && valueProp !== ''
        ? parseDate(valueProp)
        : valueProp === ''
          ? undefined
          : valueProp

    const onChange = (value: DateValue | null) => {
      onChangeProp?.(value?.toString() || '')
    }

    return <DateInput ref={ref} value={value} onChange={onChange} {...rest} />
  }),
  {
    isControlled: true,
  },
)

export const Form = createZodForm({
  fields: {
    date: DateField,
    editor: EditorField,
  },
})

export const FormDialog = createZodFormDialog(Form)
