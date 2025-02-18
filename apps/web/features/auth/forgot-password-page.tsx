'use client'

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Container,
  Heading,
  Stack,
} from '@chakra-ui/react'
import { useAuth } from '@saas-ui/auth-provider'
import { FormLayout, SubmitButton, useSnackbar } from '@saas-ui/react'
import { useMutation } from '@tanstack/react-query'

import { Link } from '@acme/next'
import { Form } from '@acme/ui/form'
import { Logo } from '@acme/ui/logo'

import {
  ForgotPasswordFormInput,
  forgotPasswordSchema,
} from './schema/forgot-password.schema.ts'

export const ForgotPasswordPage = () => {
  const snackbar = useSnackbar()

  const auth = useAuth()

  const mutation = useMutation({
    mutationFn: (params: ForgotPasswordFormInput) =>
      auth.resetPassword(params, {
        redirectTo: '/reset-password',
      }),
    onError: (error) => {
      snackbar.error({
        title: 'Reset password failed',
        description: error.message,
      })
    },
  })

  const onSubmit = async (values: ForgotPasswordFormInput) => {
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
            Forgot your password?
          </Heading>

          {mutation.data ? (
            <Alert
              status="success"
              flexDirection="column"
              alignItems="flex-start"
            >
              <AlertTitle>Password reset email sent</AlertTitle>
              <AlertDescription>
                We&apos;ve sent an email to {mutation.variables?.email} with a
                link to reset your password.
              </AlertDescription>
            </Alert>
          ) : (
            <Form
              mode="onSubmit"
              schema={forgotPasswordSchema}
              onSubmit={onSubmit}
            >
              {({ Field }) => (
                <FormLayout>
                  <Field
                    name="email"
                    label="Email"
                    help="Enter your email address and we will send you a link to reset your password."
                  />
                  <SubmitButton>Reset password</SubmitButton>
                </FormLayout>
              )}
            </Form>
          )}
        </Container>

        <Link href="/login" color="chakra-body-text">
          Back to log in
        </Link>
      </Stack>
    </Stack>
  )
}
