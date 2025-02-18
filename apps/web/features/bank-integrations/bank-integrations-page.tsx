'use client'

import * as React from 'react'

import {
  Page,
  PageBody,
  PageHeader,
  Toolbar,
} from '@saas-ui-pro/react'
import { EmptyState } from '@saas-ui/react'
import { LuWallet } from 'react-icons/lu'
import { Button } from '@chakra-ui/react'

export function BankIntegrationsPage() {
  const toolbar = (
    <Toolbar>
      <Button colorScheme="primary">Add Bank Integration</Button>
    </Toolbar>
  )

  return (
    <Page>
      <PageHeader title="Bank Integrations" toolbar={toolbar} />
      <PageBody>
        <EmptyState
          title="No bank integrations yet"
          description="Add your first bank integration to get started."
          colorScheme="primary"
          icon={LuWallet}
          actions={
            <Button colorScheme="primary" variant="solid">
              Add Bank Integration
            </Button>
          }
        />
      </PageBody>
    </Page>
  )
} 