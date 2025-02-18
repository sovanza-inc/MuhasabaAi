import { useAuth } from '@saas-ui/auth-provider'
import { LoadingOverlay, LoadingSpinner, useSnackbar } from '@saas-ui/react'

import { ContactDTO } from '@acme/api/types'

import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import { api } from '#lib/trpc/react'

import { Activity, ActivityTimeline } from './activity-timeline'
import { ContactTabPanel } from './contact-panel'

export const ActivitiesPanel: React.FC<{
  contact: ContactDTO
}> = ({ contact }) => {
  const { user } = useAuth()
  const [workspace] = useCurrentWorkspace()

  const snackbar = useSnackbar()

  const utils = api.useUtils()

  const input = {
    id: contact.id,
    workspaceId: contact.workspaceId,
  }

  const { data, isLoading } = api.contacts.activitiesById.useQuery(input)

  const addMutation = api.contacts.addComment.useMutation({
    onError: (error) => {
      snackbar.error({
        title: 'Failed to add your comment',
        description: error.message,
      })
    },
    onSettled: () => {
      utils.contacts.activitiesById.invalidate(input)
    },
  })

  const deleteMutation = api.contacts.removeComment.useMutation({
    onError: (error) => {
      snackbar.error({
        title: 'Failed to delete your comment',
        description: error.message,
      })
    },
    onSettled: () => {
      utils.contacts.activitiesById.invalidate(input)
    },
  })

  const getMember = (id: string) => {
    const member = workspace?.members?.find((member) => member.id === id)

    return member
      ? {
          id: member?.id,
          name: member?.name,
          avatar: member?.avatar,
        }
      : undefined
  }

  const activities = (data?.activities || []).map(
    (activity) =>
      ({
        id: activity.id,
        type: activity.type,
        user: activity.actorId ? getMember(activity.actorId) : undefined,
        data: activity.metadata,
        date: activity.createdAt,
      }) as Activity,
  )

  return (
    <ContactTabPanel bg="page-body-bg-subtle">
      {!user || isLoading ? (
        <LoadingOverlay>
          <LoadingSpinner />
        </LoadingOverlay>
      ) : (
        <ActivityTimeline
          currentUser={user}
          activities={activities}
          onAddComment={async (data) => {
            return addMutation.mutate({
              workspaceId: contact.workspaceId,
              contactId: contact.id,
              comment: data.comment,
            })
          }}
          onDeleteComment={async (id) => {
            return deleteMutation.mutate({
              workspaceId: contact.workspaceId,
              commentId: id as string,
            })
          }}
        />
      )}
    </ContactTabPanel>
  )
}
