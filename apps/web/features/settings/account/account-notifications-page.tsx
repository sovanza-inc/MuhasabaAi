'use client'

import { Card, Divider, Heading, Switch, Text } from '@chakra-ui/react'
import { Section, SectionBody, SectionHeader } from '@saas-ui-pro/react'
import {
  StructuredList,
  StructuredListCell,
  StructuredListHeader,
  StructuredListItem,
} from '@saas-ui/react'

import { WorkspaceMemberSettingsDTO } from '@acme/api/types'
import { SettingsPage } from '@acme/ui/settings-page'

import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import { api } from '#lib/trpc/react'

interface NotificationItemProps {
  title?: string
  description?: string
  isChecked?: boolean
  onChange?: (checked: boolean) => void
}

const NotificationItem: React.FC<NotificationItemProps> = (props) => {
  const { title, description, isChecked, onChange } = props
  return (
    <StructuredListItem py={title ? 2 : 1}>
      <StructuredListCell flex="1">
        {title ? (
          <Heading size="sm" fontWeight="medium" mb="1">
            {title}
          </Heading>
        ) : null}

        {description ? (
          <Text color="muted" fontSize="sm">
            {description}
          </Text>
        ) : null}
      </StructuredListCell>
      <StructuredListCell>
        <Switch
          isChecked={isChecked}
          onChange={(e) => {
            onChange?.(e.target.checked)
          }}
        />
      </StructuredListCell>
    </StructuredListItem>
  )
}

function NotificationChannels(props: {
  data: Required<WorkspaceMemberSettingsDTO>['channels']
  onUpdate: (args: { key: string; value: boolean }) => void
}) {
  const { data, onUpdate } = props

  const handleChange = (key: string) => (value: boolean) => {
    onUpdate({ key, value })
  }

  const onDesktopChange = async (checked: boolean) => {
    if (checked) {
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission()

        if (permission === 'granted') {
          onUpdate({
            key: 'desktop',
            value: true,
          })
        }
      }
    } else {
      onUpdate({
        key: 'desktop',
        value: false,
      })
    }
  }

  return (
    <Section variant="annotated">
      <SectionHeader
        title="Notification channels"
        description="Where can we notify you?"
      />
      <SectionBody>
        <Card>
          <StructuredList variant="settings">
            <NotificationItem
              title="Email"
              description="Receive a daily email digest."
              isChecked={!!data?.email}
              onChange={handleChange('email')}
            />
            <NotificationItem
              title="Desktop"
              description="Receive desktop notifications."
              isChecked={!!data?.desktop}
              onChange={onDesktopChange}
            />
          </StructuredList>
        </Card>
      </SectionBody>
    </Section>
  )
}

function NotificationTopics(props: {
  data: Required<WorkspaceMemberSettingsDTO>['topics']
  onUpdate: (args: { key: string; value: boolean }) => void
}) {
  const { data, onUpdate } = props

  const handleChange = (key: keyof typeof data) => (value: boolean) => {
    onUpdate({ key, value })
  }

  return (
    <Section variant="annotated">
      <SectionHeader
        title="Notification topics"
        description="Notify me when..."
      />
      <SectionBody>
        <Card>
          <StructuredList>
            <StructuredListHeader
              px="4"
              py="1"
              fontWeight="medium"
              color="inherit"
            >
              Contacts
            </StructuredListHeader>
            <NotificationItem
              description="A new lead is added."
              isChecked={data?.contacts_new_lead}
              onChange={handleChange('contacts_new_lead')}
            />
            <NotificationItem
              description="An account has upgraded."
              isChecked={data?.contacts_account_upgraded}
              onChange={handleChange('contacts_account_upgraded')}
            />
          </StructuredList>
          <Divider />
          <StructuredList>
            <StructuredListHeader
              px="4"
              py="1"
              fontWeight="medium"
              color="inherit"
            >
              Inbox
            </StructuredListHeader>
            <NotificationItem
              description="A message is assigned to me."
              isChecked={data?.inbox_assigned_to_me}
              onChange={handleChange('inbox_assigned_to_me')}
            />
            <NotificationItem
              description="Somebody mentions me."
              isChecked={data?.inbox_mentioned}
              onChange={handleChange('inbox_mentioned')}
            />
          </StructuredList>
        </Card>
      </SectionBody>
    </Section>
  )
}

function AccountUpdates(props: {
  data: Required<WorkspaceMemberSettingsDTO>['newsletters']
  onUpdate: (args: { key: string; value: boolean }) => void
}) {
  const { data, onUpdate } = props

  const handleChange = (key: keyof typeof data) => (value: boolean) => {
    onUpdate({ key, value })
  }

  return (
    <Section variant="annotated">
      <SectionHeader
        title="Account updates"
        description="Receive updates about Saas UI."
      />
      <SectionBody>
        <Card>
          <StructuredList variant="settings">
            <NotificationItem
              title="Product updates"
              description="Receive a weekly email with all new features and updates."
              isChecked={data?.product_updates}
              onChange={handleChange('product_updates')}
            />
            <NotificationItem
              title="Important updates"
              description="Receive emails about important updates like security fixes, maintenance, etc."
              isChecked={data?.important_updates}
              onChange={handleChange('important_updates')}
            />
          </StructuredList>
        </Card>
      </SectionBody>
    </Section>
  )
}

export function AccountNotificationsPage() {
  const [workspace] = useCurrentWorkspace()

  const workspaceId = workspace?.id

  const utils = api.useUtils()

  const settings = api.workspaceMembers.notificationSettings.useQuery({
    workspaceId,
  })

  const updateSettings =
    api.workspaceMembers.updateNotificationSettings.useMutation({
      onSettled: () => {
        utils.workspaceMembers.notificationSettings.invalidate()
      },
    })

  if (!workspaceId) {
    return null
  }

  const handleUpdateSettings =
    (type: 'channels' | 'topics' | 'newsletters') =>
    (args: { key: string; value: boolean }) => {
      updateSettings.mutate({
        workspaceId,
        [type]: {
          ...settings.data?.[type],
          [args.key]: args.value,
        },
      })
    }

  return (
    <SettingsPage
      title="Notifications"
      description="Manage how and where you want to be notified."
    >
      <NotificationChannels
        data={{
          ...settings.data?.channels,
          ...updateSettings.variables?.channels,
        }}
        onUpdate={handleUpdateSettings('channels')}
      />
      <NotificationTopics
        data={{
          ...settings.data?.topics,
          ...updateSettings.variables?.topics,
        }}
        onUpdate={handleUpdateSettings('topics')}
      />
      <AccountUpdates
        data={{
          ...settings.data?.newsletters,
          ...updateSettings.variables?.newsletters,
        }}
        onUpdate={handleUpdateSettings('newsletters')}
      />
    </SettingsPage>
  )
}
