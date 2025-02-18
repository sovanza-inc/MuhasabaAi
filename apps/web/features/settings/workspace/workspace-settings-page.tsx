'use client'

import { useRef, useState } from 'react'

import {
  Avatar,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  FormControl,
  FormHelperText,
  FormLabel,
  Icon,
  Input,
  InputLeftElement,
  InputRightElement,
  Spinner,
  Text,
  Tooltip,
} from '@chakra-ui/react'
import { useDebouncedCallback } from '@react-hookz/web'
import { Section, SectionBody, SectionHeader } from '@saas-ui-pro/react'
import { FormLayout, UseFormReturn, useSnackbar } from '@saas-ui/react'
import { LuCheck } from 'react-icons/lu'
import slug from 'slug'
import { z } from 'zod'

import type { WorkspaceDTO } from '@acme/api/types'
import { Form } from '@acme/ui/form'
import { SettingsPage } from '@acme/ui/settings-page'

import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import { api } from '#lib/trpc/react'

const schema = z.object({
  name: z
    .string()
    .min(1, 'Please enter your workspace name.')
    .min(2, 'Please choose a name with at least 3 characters.')
    .max(50, 'The name should be no longer than 50 characters.')
    .describe('Name'),
  slug: z
    .string()
    .min(1, 'Please enter your workspace URL.')
    .min(2, 'Please choose an URL with at least 3 characters.')
    .max(50, 'The URL should be no longer than 50 characters.')
    .regex(
      /^[a-z0-9-]+$/,
      'The URL should only contain lowercase letters, numbers, and dashes.',
    )
    .describe('Slug'),
  logo: z.string().optional().describe('Logo'),
})

function WorkspaceDetails(props: { workspace: WorkspaceDTO }) {
  const { workspace } = props

  const snackbar = useSnackbar()

  const formRef = useRef<UseFormReturn<z.infer<typeof schema>>>(null)

  const { isPending, mutateAsync } = api.workspaces.update.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate()
      utils.workspaces.bySlug.invalidate()
    },
  })

  const utils = api.useUtils()

  const slugAvailable = api.workspaces.slugAvailable.useMutation({
    onSettled: (data) => {
      if (!data?.available) {
        formRef.current?.setError('slug', {
          type: 'manual',
          message: 'This workspace URL is already taken.',
        })
      } else {
        formRef.current?.clearErrors('slug')
      }
    },
  })

  const checkSlug = useDebouncedCallback(slugAvailable.mutate, [], 500)

  const setSlug = (value: string) => {
    const slugValue = slug(value)
    formRef.current?.setValue('slug', slugValue)

    if (!slugValue.trim()) {
      formRef.current?.setError('slug', {
        type: 'manual',
        message: 'Slug is required',
      })
    } else if (slugValue !== workspace.slug) {
      checkSlug({ slug: slugValue })
    }
  }

  let form
  if (workspace) {
    form = (
      <Form
        formRef={formRef}
        schema={schema}
        defaultValues={{
          name: workspace.name,
          logo: workspace.logo ?? '',
          slug: workspace.slug,
        }}
        onSubmit={(data) => {
          return mutateAsync({
            workspaceId: workspace.id,
            name: data.name,
            slug: data.slug,
          }).then(() =>
            snackbar.success({
              title: 'Workspace updated',
              description: 'Your workspace settings have been updated.',
            }),
          )
        }}
      >
        {({ Field }) => (
          <>
            <CardBody>
              <FormLayout>
                <WorkspaceLogo workspace={workspace} />
                <Field name="name" label="Workspace name" />
                <Field
                  name="slug"
                  type="text"
                  label="Workspace URL"
                  paddingLeft="140px"
                  leftAddon={
                    <InputLeftElement
                      bg="transparent"
                      width="auto"
                      ps="3"
                      pointerEvents="none"
                    >
                      <Text color="muted">https://saas-ui.dev/</Text>
                    </InputLeftElement>
                  }
                  rightAddon={
                    <InputRightElement>
                      {slugAvailable.isPending ? (
                        <Spinner size="xs" />
                      ) : slugAvailable.data?.available ? (
                        <Icon as={LuCheck} color="green.500" strokeWidth="3" />
                      ) : null}
                    </InputRightElement>
                  }
                  onChange={(e) => {
                    const value = e.currentTarget.value
                    setSlug(value)
                  }}
                />
                <ButtonGroup>
                  <Button
                    variant="solid"
                    colorScheme="primary"
                    type="submit"
                    isLoading={isPending}
                  >
                    Update
                  </Button>
                </ButtonGroup>
              </FormLayout>
            </CardBody>
          </>
        )}
      </Form>
    )
  }
  return (
    <Section variant="annotated">
      <SectionHeader
        title="Workspace details"
        description="Basic details about your workspace."
      />
      <SectionBody>
        <Card>{form}</Card>
      </SectionBody>
    </Section>
  )
}

// TODO add s3 uploads
function WorkspaceLogo(props: { workspace: WorkspaceDTO }) {
  const { workspace } = props
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

  const avatarSrc = previewUrl ?? workspace.logo ?? undefined

  return (
    <FormControl>
      <FormLabel>Workspace logo</FormLabel>
      <Tooltip label="Upload a logo">
        <Avatar
          name={workspace.name ?? undefined}
          src={avatarSrc}
          size="lg"
          onClick={selectFile}
          cursor="pointer"
        />
      </Tooltip>
      <FormHelperText>Recommended size: 200x200px</FormHelperText>
      <Input type="file" ref={ref} onChange={handleFileChange} display="none" />
    </FormControl>
  )
}

export function WorkspaceSettingsPage() {
  const [workspace] = useCurrentWorkspace()

  return (
    <SettingsPage
      title="Workspace"
      description="Manage your workspace settings"
    >
      <WorkspaceDetails workspace={workspace} />
    </SettingsPage>
  )
}
