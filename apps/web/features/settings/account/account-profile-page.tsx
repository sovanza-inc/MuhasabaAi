'use client'

import { useRef, useState } from 'react'

import {
  Avatar,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  Input,
  Tooltip,
} from '@chakra-ui/react'
import { Section, SectionBody, SectionHeader } from '@saas-ui-pro/react'
import { FormLayout, useSnackbar } from '@saas-ui/react'

import { UserDTO } from '@acme/api/types'
import { Form } from '@acme/ui/form'
import { SettingsPage } from '@acme/ui/settings-page'

import { useCurrentUser } from '#features/common/hooks/use-current-user'
import { api } from '#lib/trpc/react'

import { profileSchema } from './schema/profile.schema'

function ProfileDetails({ user }: { user: UserDTO }) {
  const snackbar = useSnackbar()

  const utils = api.useUtils()

  const { isPending, mutateAsync } = api.users.updateProfile.useMutation({
    onSettled: () => {
      utils.auth.me.invalidate()
    },
    onSuccess: () => {
      snackbar.success({
        title: 'Profile updated',
      })
    },
    onError: () => {
      snackbar.error({
        title: 'Failed to update profile',
      })
    },
  })

  const onSubmit = async (values: UserDTO) => {
    await mutateAsync(values)
  }

  return (
    <Section variant="annotated">
      <SectionHeader
        title="Basic details"
        description="Update your personal information."
      />
      <SectionBody>
        <Card>
          <Form
            schema={profileSchema}
            defaultValues={{
              name: user?.name ?? '',
              email: user?.email ?? '',
            }}
            onSubmit={onSubmit}
          >
            {({ Field }) => (
              <CardBody>
                <FormLayout>
                  <ProfileAvatar user={user} />
                  <Field name="name" label="Name" />
                  <Field name="email" label="Email" />
                  <ButtonGroup>
                    <Button
                      variant="primary"
                      type="submit"
                      isLoading={isPending}
                    >
                      Save
                    </Button>
                  </ButtonGroup>
                </FormLayout>
              </CardBody>
            )}
          </Form>
        </Card>
      </SectionBody>
    </Section>
  )
}

function ProfileAvatar({ user }: { user: UserDTO }) {
  const [previewUrl, setPreviewUrl] = useState<string | undefined>()
  const ref = useRef<HTMLInputElement>(null)

  const selectFile = () => {
    ref.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target?.files

    if (files?.[0]) {
      setPreviewUrl(URL.createObjectURL(files[0]))
    }
  }

  const avatarSrc = previewUrl ?? user.avatar ?? undefined

  return (
    <FormControl>
      <FormLabel>Profile picture</FormLabel>
      <Tooltip label="Upload a picture">
        <Avatar
          name={user.name ?? undefined}
          src={avatarSrc}
          size="lg"
          onClick={selectFile}
          cursor="pointer"
        />
      </Tooltip>
      <Input type="file" ref={ref} onChange={handleFileChange} display="none" />
    </FormControl>
  )
}

export function AccountProfilePage() {
  const [user] = useCurrentUser()

  return (
    <SettingsPage title="Profile" description="Manage your profile">
      {user && <ProfileDetails user={user} />}
    </SettingsPage>
  )
}
