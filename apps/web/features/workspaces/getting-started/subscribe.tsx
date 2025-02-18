import { Box, Flex, Heading, Stack, Switch, Text } from '@chakra-ui/react'
import { useSnackbar, useStepperContext } from '@saas-ui/react'

import { LinkButton } from '@acme/ui/button'

import { api } from '#lib/trpc/react'

import { OnboardingStep } from './onboarding-step'
import { SubscribeFormInput, subscribeSchema } from './schema/subscribe.schema'

interface SocialLink {
  title: string
  description: string
  href: string
  label: string
}

const socialLinks: SocialLink[] = [
  {
    title: 'Follow us on X',
    description: 'Regular posts with updates and tips.',
    href: 'https://x.com/saas_js',
    label: '@saas_js',
  },
  {
    title: 'Join our Discord community',
    description: 'Chat with other developers and founders.',
    href: 'https://saas-ui.dev/discord',
    label: 'Join Discord',
  },
]

export const SubscribeStep = () => {
  const stepper = useStepperContext()
  const snackbar = useSnackbar()

  const { mutateAsync, isPending } =
    api.users.subscribeToNewsletter.useMutation({
      onError: () => {
        snackbar.error('Could not subscribe you to our newsletter.')
      },
    })

  return (
    <OnboardingStep<SubscribeFormInput>
      schema={subscribeSchema}
      title="Subscribe to updates"
      description="Saas UI is updated regularly. These are the best ways to stay up to date."
      defaultValues={{ newsletter: false }}
      onSubmit={async (data) => {
        try {
          await mutateAsync({
            newsletter: data.newsletter,
          })
        } catch {
          snackbar.error('Could not subscribe you to our newsletter.')
        }

        stepper.nextStep()
      }}
      submitLabel="Continue"
    >
      <Box m="-6">
        <Flex borderBottomWidth="1px" p="6" display="flex" alignItems="center">
          <Stack flex="1" alignItems="flex-start" spacing="0.5">
            <Heading size="sm">Subscribe to our monthly newsletter</Heading>
            <Text id="newsletter-description" color="muted">
              Receive monthly updates in your email inbox.
            </Text>
          </Stack>
          <Switch
            name="newsletter"
            aria-labelledby="newsletter-description"
            isDisabled={isPending}
          />
        </Flex>

        {socialLinks.map(({ title, description, href, label }) => (
          <Flex
            key={href}
            borderBottomWidth="1px"
            p="6"
            display="flex"
            alignItems="center"
            _last={{ borderBottomWidth: 0 }}
          >
            <Stack flex="1" alignItems="flex-start" spacing="0.5">
              <Heading size="sm">{title}</Heading>
              <Text color="muted">{description}</Text>
            </Stack>
            <LinkButton href={href} target="_blank" isDisabled={isPending}>
              {label}
            </LinkButton>
          </Flex>
        ))}
      </Box>
    </OnboardingStep>
  )
}
