'use client'

import { ButtonGroup, Card, CardBody, HStack, Text } from '@chakra-ui/react'
import { Section, SectionBody, SectionHeader } from '@saas-ui-pro/react'
import { SubmitButton } from '@saas-ui/forms'
import {
  FormLayout,
  LoadingOverlay,
  LoadingSpinner,
  StructuredList,
  StructuredListCell,
  StructuredListItem,
  useSnackbar,
} from '@saas-ui/react'
import { LuArrowRight } from 'react-icons/lu'
import { z } from 'zod'

import { WorkspaceDTO } from '@acme/api/types'
import { FormattedDate, FormattedNumber } from '@acme/i18n'
import { LinkButton } from '@acme/ui/button'
import { Form } from '@acme/ui/form'
import { SettingsPage } from '@acme/ui/settings-page'

import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import { usePath } from '#features/common/hooks/use-path'
import { api } from '#lib/trpc/react'

import { BillingStatus } from './billing-status'
import { ManageBillingButton } from './manage-billing-button'

function BillingPlan({ workspace }: { workspace: WorkspaceDTO }) {
  return (
    <Section variant="annotated">
      <SectionHeader
        title="Billing plan"
        description="Update your billing plan."
      />
      <SectionBody>
        <Card>
          <CardBody>
            <BillingStatus />
            <HStack mt="4">
              <LinkButton href={usePath('/settings/plans')} variant="secondary">
                Update plan
              </LinkButton>

              <ManageBillingButton workspaceId={workspace.id} variant="ghost" />
            </HStack>
          </CardBody>
        </Card>
      </SectionBody>
    </Section>
  )
}

const BillingEmailSchema = z.object({
  email: z.string().email(),
})

function BillingEmail({ workspace }: { workspace: WorkspaceDTO }) {
  const snackbar = useSnackbar()

  const { data, isLoading } = api.billing.account.useQuery({
    workspaceId: workspace.id,
  })

  const mutation = api.billing.updateBillingDetails.useMutation({
    onError() {
      snackbar.error({
        title: 'Failed to update the billing email',
        description:
          'Please try again, or contact us if the problems persists.',
      })
    },
    onSuccess() {
      snackbar.success({
        title: 'Billing email updated',
        description: 'Invoices will now be sent to the new email address.',
      })
    },
  })

  return (
    <Section variant="annotated" isLoading={isLoading}>
      <SectionHeader
        title="Billing email"
        description="Send invoices to an alternative address."
      />
      <SectionBody>
        {!isLoading ? (
          <Card>
            <CardBody>
              <Form
                schema={BillingEmailSchema}
                defaultValues={{
                  email: data?.email ?? '',
                }}
                onSubmit={async (data) =>
                  mutation.mutate({
                    workspaceId: workspace.id,
                    email: data.email,
                  })
                }
              >
                {({ Field }) => (
                  <FormLayout>
                    <Field name="email" label="Email address" type="email" />
                    <ButtonGroup>
                      <SubmitButton>Update</SubmitButton>
                    </ButtonGroup>
                  </FormLayout>
                )}
              </Form>
            </CardBody>
          </Card>
        ) : null}
      </SectionBody>
    </Section>
  )
}

function BillingInvoices({ workspace }: { workspace: WorkspaceDTO }) {
  const { data, isLoading } = api.billing.listInvoices.useQuery({
    workspaceId: workspace.id,
  })

  let content = null
  if (isLoading) {
    content = (
      <LoadingOverlay variant="fill">
        <LoadingSpinner />
      </LoadingOverlay>
    )
  } else if (!data?.length) {
    content = <Text>No invoices received yet.</Text>
  } else if (data) {
    content = (
      <StructuredList>
        {data.map((invoice) => (
          <StructuredListItem key={invoice.number} gap="4" fontSize="sm">
            <StructuredListCell color="muted" flex="1">
              <FormattedDate value={invoice.date} />
            </StructuredListCell>
            <StructuredListCell fontWeight="medium">
              <InvoiceStatus status={invoice.status} />
            </StructuredListCell>
            <StructuredListCell minW="100px" textAlign="end">
              <FormattedNumber
                value={invoice.total}
                currency={invoice.currency}
                style="currency"
              />
            </StructuredListCell>
            <StructuredListCell>
              <LinkButton
                href={invoice.url}
                target="_blank"
                variant="link"
                fontWeight="normal"
                colorScheme="primary"
                rightIcon={<LuArrowRight />}
              >
                View invoice
              </LinkButton>
            </StructuredListCell>
          </StructuredListItem>
        ))}
      </StructuredList>
    )
  }

  return (
    <Section variant="annotated">
      <SectionHeader
        title="Invoices"
        description="Invoices are sent on the first of every month."
      />
      <SectionBody>
        <Card>
          <CardBody>{content}</CardBody>
        </Card>
      </SectionBody>
    </Section>
  )
}

function InvoiceStatus(props: { status: string }) {
  switch (props.status) {
    case 'paid':
      return <Text>Paid</Text>
    default:
    case 'open':
      return <Text color="orange.500">Open</Text>
  }
}

export function BillingPage() {
  const [workspace] = useCurrentWorkspace()

  return (
    <SettingsPage
      title="Billing"
      description="Manage your billing information and invoices"
    >
      <BillingPlan workspace={workspace} />
      <BillingEmail workspace={workspace} />
      <BillingInvoices workspace={workspace} />
    </SettingsPage>
  )
}
