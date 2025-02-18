'use client'

import { Container, Heading, Stack } from '@chakra-ui/react'
import { useAuth } from '@saas-ui/auth-provider'
import { FormLayout, SubmitButton, useSnackbar } from '@saas-ui/react'
import { useMutation } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'

import { Link } from '@acme/next'
import { Form } from '@acme/ui/form'
import { Logo } from '@acme/ui/logo'

import {
  ResetPasswordFormInput,
  resetPasswordSchema,
} from './schema/reset-password.schema'

export const ResetPasswordPage = () => {
  const router = useRouter()
  const snackbar = useSnackbar()
  const auth = useAuth()
  const search = useSearchParams()

  const mutation = useMutation({
    mutationFn: (values: ResetPasswordFormInput) => {
      return auth.updatePassword({
        password: values.newPassword,
        token: search.get('token') ?? '',
      })
    },
    onSuccess: () => {
      snackbar.success({
        title: 'Password updated',
        description: 'You can now log in with your new password',
      })

      router.push('/login')
    },
    onError: (error) => {
      snackbar.error({
        title: 'Could not update your password',
        description:
          error.message ??
          'Please try again or contact us if the problem persists.',
      })
    },
  })

  const onSubmit = async (values: ResetPasswordFormInput) => {
    await mutation.mutateAsync(values)
  }

  return (
    <Stack flex="1" direction="row">
      <Stack
        flex="1"
        alignItems="center"
        justify="center"
        direction="column"
        spacing="8"
      >
        <Container maxW="container.sm" py="8">
          <Logo mb="12" width="120px" />

          <Heading as="h2" size="md" mb="4">
            Choose a new password
          </Heading>

          <Form mode="onBlur" schema={resetPasswordSchema} onSubmit={onSubmit}>
            {({ Field }) => (
              <FormLayout>
                <Field name="newPassword" type="password" label="Password" />

                <Field
                  name="confirmPassword"
                  type="password"
                  label="Confirm Password"
                />

                <SubmitButton />
              </FormLayout>
            )}
          </Form>
        </Container>

        <Link href="/login" color="chakra-body-text">
          Back to log in
        </Link>
      </Stack>
    </Stack>
  )
}
