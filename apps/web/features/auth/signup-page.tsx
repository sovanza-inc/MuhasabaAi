'use client'

import { Box, Center, Container, Heading, Stack, Text } from '@chakra-ui/react'
import { useAuth } from '@saas-ui/auth-provider'
import { FormLayout, SubmitButton, useSnackbar } from '@saas-ui/react'
import { useMutation } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { z } from 'zod'

import { Link } from '@acme/next'
import { Form } from '@acme/ui/form'
import { Logo } from '@acme/ui/logo'

import { Testimonial } from './components/testimonial'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const SignupPage = () => {
  const snackbar = useSnackbar()
  const router = useRouter()
  const auth = useAuth()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo')

  const { mutateAsync, isPending, isSuccess } = useMutation({
    mutationFn: (params: z.infer<typeof schema>) => auth.signUp(params),
    onSuccess: () => {
      void router.push(redirectTo ?? '/')
    },
    onError: (error) => {
      snackbar.error({
        title: error.message ?? 'Could not sign you up',
        description: 'Please try again or contact us if the problem persists.',
      })
    },
  })

  const handleSubmit = async (values: z.infer<typeof schema>) => {
    await mutateAsync({
      email: values.email,
      password: values.password,
    })
  }

  return (
    <Stack flex="1" direction="row" height="$100vh">
      <Stack
        flex="1"
        alignItems="center"
        justify="center"
        direction="column"
        spacing="8"
        bgImage="url('/img/onboarding/DASH.png')"
        bgSize="cover"
        bgRepeat="round"
        position="relative"
        _before={{
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          zIndex: 0,
        }}
      >
        <Container maxW="container.sm" py="8" position="relative" zIndex={1}>
          <Box display="flex" justifyContent="center" width="100%">
            <Logo mb="12" width="120px" />
          </Box>

          <Heading as="h2" size="md" mb="4" textAlign="center">
            Signup
          </Heading>

          <Form
            schema={schema}
            onSubmit={handleSubmit}
            disabled={isPending || isSuccess}
            sx={{
              'input:focus-visible, select:focus-visible': {
                borderColor: '#1AB294 !important',
                boxShadow: '0 0 0 1px #1AB294 !important',
              }
            }}
          >
            {({ Field }) => (
              <FormLayout>
                <Field
                  name="email"
                  label="Email"
                  autoComplete="email"
                  type="email"
                  placeholder="Enter your email"
                />

                <Field
                  name="password"
                  label="Password"
                  type="password"
                  autoComplete="password"
                  placeholder="Create a password"
                />

                <Link
                  href="/forgot-password"
                  onClick={(e) =>
                    (isPending || isSuccess) && e.preventDefault()
                  }
                >
                  Forgot your password?
                </Link>

                <SubmitButton backgroundColor="#1AB294"
                  _hover={{ backgroundColor: 'green.800' }}
                  color="white" loadingText="Creating account...">
                  Sign up
                </SubmitButton>
              </FormLayout>
            )}
          </Form>
        </Container>

        <Text color="muted" position="relative" zIndex={1}>
          Already have an account?{' '}
          <Link href="/login" color="green.500">
            Login
          </Link>
          .
        </Text>
      </Stack>
      <Stack flex="1" bg="green.600" display={{ base: 'none', sm: 'none', md: 'flex' }}>
        <Center flex="1">
          <Testimonial />
        </Center>
      </Stack>
    </Stack>
  )
}
