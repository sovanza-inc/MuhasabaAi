import * as React from 'react'

import { useUpdatePassword } from '@saas-ui/auth-provider'
import { FormDialogProps, FormLayout, type SubmitHandler } from '@saas-ui/react'

import { FormDialog } from '@acme/ui/form'

import {
  UpdatePasswordFormInput,
  updatePasswordSchema,
} from './schema/update-password.schema.ts'

export interface UpdatePasswordFormProps
  extends Omit<
    FormDialogProps<UpdatePasswordFormInput>,
    'onSubmit' | 'title' | 'scrollBehavior' | 'children'
  > {
  onSuccess?: (data: any) => void
  onError?: (error: any) => void
  onValidationError?: (error: any) => void
}

export const UpdatePasswordDialog: React.FC<UpdatePasswordFormProps> = ({
  onSuccess = () => null,
  onError = () => null,
  onValidationError = () => null,
  isOpen,
  onClose,
}) => {
  const [, submit] = useUpdatePassword()

  const handleSubmit: SubmitHandler<UpdatePasswordFormInput> = async (
    values,
  ) => {
    try {
      const data = await submit({
        password: values.password,
        newPassword: values.newPassword,
      })
      onSuccess(data)
    } catch (error) {
      onError(error)
    }
  }

  return (
    <FormDialog
      title="Update your password"
      isOpen={isOpen}
      onClose={onClose}
      fields={{
        cancel: {
          children: 'Cancel',
        },
      }}
      schema={updatePasswordSchema}
      onError={onValidationError}
      onSubmit={handleSubmit}
      defaultValues={{
        password: '',
        newPassword: '',
        confirmPassword: '',
      }}
    >
      {({ Field }) => (
        <FormLayout>
          <Field
            name="password"
            label="Current Password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your current password"
          />

          <Field
            name="newPassword"
            label="New Password"
            type="password"
            placeholder="Enter a new password"
          />

          <Field
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            placeholder="Confirm your new password"
          />
        </FormLayout>
      )}
    </FormDialog>
  )
}
