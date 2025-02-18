'use client'

import { Button, Card } from '@chakra-ui/react'
import { Section, SectionBody, SectionHeader } from '@saas-ui-pro/react'
import {
  StructuredList,
  StructuredListCell,
  StructuredListItem,
  useSnackbar,
} from '@saas-ui/react'
import { LuChevronRight } from 'react-icons/lu'

import { useModals } from '@acme/ui/modals'
import { SettingsPage } from '@acme/ui/settings-page'

import { api } from '#lib/trpc/react'

import { UpdatePasswordDialog } from './update-password-dialog'

function TwoFactorAuthItem() {
  return (
    <StructuredListItem>
      <StructuredListCell flex="1">
        Two-factor authentication
      </StructuredListCell>
      <StructuredListCell px="4">
        <Button variant="secondary" size="sm">
          Enable
        </Button>
      </StructuredListCell>
    </StructuredListItem>
  )
}

function PasswordListItem({ lastChanged }: { lastChanged: Date | null }) {
  const modals = useModals()
  const snackbar = useSnackbar()

  return (
    <StructuredListItem
      onClick={() => {
        const id = modals.open({
          title: 'Update your password',
          component: UpdatePasswordDialog,
          isCentered: true,
          onSuccess() {
            snackbar.success({
              title: 'Your password has been updated',
            })
            modals.close(id)
          },
          onError(error: any) {
            snackbar.error({
              title: error.message,
            })
          },
        })
      }}
    >
      <StructuredListCell flex="1">Password</StructuredListCell>
      {lastChanged && (
        <StructuredListCell color="muted" px="4">
          Last changed {lastChanged.toLocaleDateString()}
        </StructuredListCell>
      )}
      <StructuredListCell>
        <LuChevronRight />
      </StructuredListCell>
    </StructuredListItem>
  )
}

function AccountSignIn() {
  const { data } = api.auth.listAccounts.useQuery()

  const authAccount = data?.find(
    (account) => account.providerId === 'credential',
  )

  return (
    <Section variant="annotated">
      <SectionHeader
        title="Signing in"
        description="Update your password and improve account security."
      />
      <SectionBody>
        <Card>
          <StructuredList variant="settings">
            {authAccount && (
              <PasswordListItem lastChanged={authAccount.updatedAt} />
            )}

            <TwoFactorAuthItem />
          </StructuredList>
        </Card>
      </SectionBody>
    </Section>
  )
}

export function AccountSecurityPage() {
  return (
    <SettingsPage
      title="Security"
      description="Manage your account security"
      isLoading={false}
    >
      <AccountSignIn />
    </SettingsPage>
  )
}
