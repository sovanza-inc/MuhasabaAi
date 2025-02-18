import { Button, Icon } from '@chakra-ui/react'
import { useSnackbar } from '@saas-ui/react'
import { LuArrowRight } from 'react-icons/lu'

import { api } from '#lib/trpc/react'

export function ManageBillingButton(props: {
  workspaceId: string
  variant?: string
}) {
  const snackbar = useSnackbar()

  const { mutateAsync, isPending } =
    api.billing.createBillingPortalSession.useMutation()

  return (
    <Button
      role="group"
      variant={props.variant ?? 'link'}
      isDisabled={isPending}
      rightIcon={
        <Icon
          as={LuArrowRight}
          transition="all"
          transitionDuration="normal"
          transform="translateX(-4px)"
          _groupHover={{ transform: 'translateX(0)' }}
        />
      }
      onClick={async () => {
        try {
          const result = await mutateAsync({
            workspaceId: props.workspaceId,
            returnUrl: window.location.href,
          })

          if (result.url) {
            window.location.href = result.url
          }
        } catch (error: any) {
          console.error(error)
          snackbar.error({
            title: 'Failed to open billing settings',
            description: error.message,
          })
        }
      }}
    >
      Manage billing settings
    </Button>
  )
}
