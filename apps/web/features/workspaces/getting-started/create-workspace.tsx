import { FormEvent, useRef } from 'react'

import {
  Icon,
  InputLeftElement,
  InputRightElement,
  Spinner,
  Text,
} from '@chakra-ui/react'
import { useDebouncedCallback, useSessionStorageValue } from '@react-hookz/web'
import {
  Field,
  FormLayout,
  UseFormReturn,
  useSnackbar,
  useStepperContext,
} from '@saas-ui/react'
import { LuCheck, LuCircleX } from 'react-icons/lu'
import slug from 'slug'

import { getBaseUrl } from '#features/common/util/get-base-url'
import { api } from '#lib/trpc/react'

import { OnboardingStep } from './onboarding-step'
import { WorkspaceFormInput, workspaceSchema } from './schema/workspace.schema'

interface SlugValidationState {
  isValidSlug: boolean
  isPending: boolean
  isAvailable?: boolean
}

function SlugStatusIndicator({
  isValidSlug,
  isPending,
  isAvailable,
}: SlugValidationState) {
  if (!isValidSlug || isAvailable === false) {
    return <Icon as={LuCircleX} color="red.500" strokeWidth="3" />
  }

  if (isPending) {
    return <Spinner size="xs" />
  }

  if (isAvailable) {
    return <Icon as={LuCheck} color="green.500" strokeWidth="3" />
  }

  return null
}

function WorkspaceUrlField({
  slugValidation,
  onSlugChange,
}: {
  slugValidation: SlugValidationState
  onSlugChange: (value: string) => void
}) {
  return (
    <Field
      name="slug"
      type="text"
      label="Workspace URL"
      paddingLeft={getBaseUrl().length * 7 + 8}
      leftAddon={
        <InputLeftElement
          bg="transparent"
          width="auto"
          ps="3"
          pointerEvents="none"
        >
          <Text color="muted">{getBaseUrl()}/</Text>
        </InputLeftElement>
      }
      rightAddon={
        <InputRightElement>
          <SlugStatusIndicator {...slugValidation} />
        </InputRightElement>
      }
      onChange={(e) => onSlugChange(e.currentTarget.value)}
    />
  )
}

export function CreateWorkspaceStep() {
  const stepper = useStepperContext()
  const snackbar = useSnackbar()
  const workspace = useSessionStorageValue('getting-started.workspace')
  const formRef = useRef<UseFormReturn<WorkspaceFormInput>>(null)
  const utils = api.useUtils()

  const { mutateAsync } = api.workspaces.create.useMutation({
    onSuccess: () => utils.auth.me.invalidate(),
  })

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

  function handleSlugChange(value: string) {
    const slugValue = slug(value)
    formRef.current?.setValue('slug', slugValue)

    if (!workspaceSchema.shape.slug.safeParse(slugValue).success) {
      slugAvailable.reset()
      return
    }

    checkSlug({ slug: slugValue })
  }

  async function handleSubmit(data: WorkspaceFormInput) {
    try {
      const result = await mutateAsync({ name: data.name, slug: data.slug })
      if (result?.slug) {
        workspace.set(result.slug)
        stepper.nextStep()
      }
    } catch (error: any) {
      snackbar.error({
        title: 'Failed to create workspace',
        description: error.message,
      })
    }
  }

  const slugValidationState: SlugValidationState = {
    isValidSlug: workspaceSchema.shape.slug.safeParse(
      formRef.current?.getValues('slug'),
    ).success,
    isPending: slugAvailable.isPending,
    isAvailable: slugAvailable.data?.available,
  }

  return (
    <OnboardingStep
      schema={workspaceSchema}
      formRef={formRef}
      title="Create a new workspace"
      description="Saas UI is multi-tenant and supports workspaces with multiple teams."
      defaultValues={{ name: '', slug: '' }}
      onSubmit={handleSubmit}
      submitLabel="Create workspace"
    >
      <FormLayout>
        <Field
          name="name"
          label="Workspace name"
          autoFocus
          rules={{ required: true }}
          data-1p-ignore
          onChange={(e: FormEvent<HTMLInputElement>) => {
            const value = e.currentTarget.value
            formRef.current?.setValue('name', value)
            handleSlugChange(value)
          }}
        />
        <WorkspaceUrlField
          slugValidation={slugValidationState}
          onSlugChange={handleSlugChange}
        />
      </FormLayout>
    </OnboardingStep>
  )
}
