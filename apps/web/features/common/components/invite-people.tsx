import { useSnackbar } from '@saas-ui/react'

import { InviteDialog } from '@acme/ui/invite-dialog'

import { api, isTRPCClientError } from '#lib/trpc/react'

import { useCurrentWorkspace } from '../hooks/use-current-workspace'

export function InvitePeopleDialog(props: {
  isOpen: boolean
  onClose: () => void
}) {
  const snackbar = useSnackbar()

  const [workspace] = useCurrentWorkspace()

  const inviteMembers = api.workspaceMembers.invite.useMutation()

  return (
    <InviteDialog
      {...props}
      onInvite={async ({ emails, role }) => {
        const result = await snackbar.promise(
          inviteMembers.mutateAsync({
            workspaceId: workspace.id,
            emails,
            role,
          }),
          {
            loading:
              emails.length === 1
                ? `Inviting ${emails[0]}...`
                : `Inviting ${emails.length} people...`,
            success: () => {
              return 'Invitation(s) have been sent.'
            },
            error: (error: Error) => {
              if (isTRPCClientError(error)) {
                console.log(error.data)
              }

              return error.message
            },
          },
        )

        if (!result) {
          throw new Error('Failed to invite people')
        }
      }}
    />
  )
}
