'use client'

import * as React from 'react'

import { Alert, AlertDescription, AlertTitle } from '@chakra-ui/react'
import { useLimitReached } from '@saas-ui-pro/billing'
import { Section, SectionBody, SectionHeader } from '@saas-ui-pro/react'
import { useSnackbar } from '@saas-ui/react'

import { WorkspaceMemberDTO } from '@acme/api/types'
import { Link } from '@acme/next'
import type { InviteData } from '@acme/ui/invite-dialog'
import { useModals } from '@acme/ui/modals'
import { SettingsPage } from '@acme/ui/settings-page'

import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import { usePath } from '#features/common/hooks/use-path'
import { api } from '#lib/trpc/react'

import { Member, MembersList } from './members-list'

export function MembersSettingsPage() {
  const snackbar = useSnackbar()
  const modals = useModals()
  const plansPath = usePath('/settings/plans')

  const [workspace] = useCurrentWorkspace()

  const { data, isLoading } = api.workspaceMembers.list.useQuery({
    workspaceId: workspace.id,
  })

  const members = data ?? []

  const limitReached = useLimitReached('users', members.length)

  const utils = api.useUtils()

  const inviteMembers = api.workspaceMembers.invite.useMutation({
    onSuccess() {
      utils.workspaceMembers.list.invalidate()
    },
  })

  const removeMember = api.workspaceMembers.removeMember.useMutation({
    onSuccess() {
      utils.workspaceMembers.list.invalidate()
    },
  })

  const updateRoles = api.workspaceMembers.updateRoles.useMutation({
    onSuccess() {
      utils.workspaceMembers.list.invalidate()
    },
  })

  const onInvite = async ({ emails, role }: InviteData) => {
    return snackbar.promise(
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
        success: `Invitation(s) have been sent.`,
        error: (err: Error) => err.message,
      },
    )
  }

  const onCancelInvite = async (member: Member) => {
    return snackbar.promise(
      removeMember.mutateAsync({
        id: member.id,
        workspaceId: workspace.id,
      }),
      {
        loading: `Removing ${member.email}...`,
        success: `Removed ${member.email}!`,
        error: (err: Error) => err.message,
      },
    )
  }

  const onRemove = (member: WorkspaceMemberDTO) => {
    modals.confirm?.({
      title: 'Remove member',
      body: `Are you sure you want to remove ${member.email} from ${
        workspace.name || 'this workspace'
      }?`,
      confirmProps: {
        colorScheme: 'red',
        children: 'Remove',
      },
      onConfirm: async () => {
        await snackbar.promise(
          removeMember.mutateAsync({
            workspaceId: workspace.id,
            id: member.id,
          }),
          {
            loading: `Removing ${member.email}...`,
            success: `Removed ${member.email}!`,
            error: (err: Error) => err.message,
          },
        )
      },
    })
  }

  const onUpdateRoles = async (member: Member, roles: string[]) => {
    return updateRoles.mutateAsync({
      userId: member.id,
      workspaceId: workspace.id,
      roles,
    })
  }

  return (
    <SettingsPage
      isLoading={isLoading}
      title="Members"
      description="Manage who can access your workspace"
    >
      <Section variant="annotated">
        <SectionHeader
          title="Members"
          description="Manage workspace members and their roles"
        />
        <SectionBody>
          {limitReached ? (
            <Alert mb="4" flexDirection="column" alignItems="flex-start">
              <AlertTitle>
                You have reached the limit of members for your current plan.
              </AlertTitle>
              <AlertDescription>
                Please upgrade your plan to invite more people.{' '}
                <Link href={plansPath} fontWeight="medium">
                  Upgrade now
                </Link>
              </AlertDescription>
            </Alert>
          ) : null}
          <MembersList
            allowInvite={!limitReached}
            members={members.map((member) => ({
              id: member.id,
              email: member.email!,
              roles: member.roles,
              status: member.status,
            }))}
            onInvite={onInvite}
            onCancelInvite={onCancelInvite}
            onRemove={onRemove}
            onUpdateRoles={onUpdateRoles}
          />
        </SectionBody>
      </Section>
    </SettingsPage>
  )
}
