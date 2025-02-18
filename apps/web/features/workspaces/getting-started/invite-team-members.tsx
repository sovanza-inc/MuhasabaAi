import { Button } from '@chakra-ui/react'
import { useSessionStorageValue } from '@react-hookz/web'
import {
  Field,
  FormLayout,
  useSnackbar,
  useStepperContext,
} from '@saas-ui/react'

import { api } from '#lib/trpc/react'

import { OnboardingStep } from './onboarding-step'
import { inviteTeamSchema, parseEmails } from './schema/invite-team.schema'

export const InviteTeamMembersStep = () => {
  const workspace = useSessionStorageValue<string>('getting-started.workspace')

  const stepper = useStepperContext()
  const snackbar = useSnackbar()

  const { mutateAsync: invite } = api.workspaceMembers.invite.useMutation()

  return (
    <OnboardingStep
      schema={inviteTeamSchema}
      title="Invite your team"
      description="Saas UI works better with your team."
      defaultValues={{ emails: '' }}
      onSubmit={async (data) => {
        if (workspace.value && data.emails) {
          try {
            await invite({
              workspaceId: workspace.value,
              emails: parseEmails(data.emails),
            })
          } catch {
            snackbar.error({
              title: 'Failed to invite team members',
              description: 'Please try again or skip this step.',
              action: <Button onClick={() => stepper.nextStep()}>Skip</Button>,
            })
            return
          }
        }
        stepper.nextStep()
      }}
      submitLabel="Continue"
    >
      <FormLayout>
        <Field
          name="emails"
          label="Email address(es)"
          placeholder="member@acme.co, member2@acme.co"
          type="textarea"
          autoFocus
        />
      </FormLayout>
    </OnboardingStep>
  )
}
