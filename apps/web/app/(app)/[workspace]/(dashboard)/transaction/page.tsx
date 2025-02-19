'use client'

import { Button } from '@chakra-ui/react'
import { Section, SectionBody, SectionHeader } from '@saas-ui-pro/react'
import { EmptyState } from '@saas-ui/react'
import { LuReceipt } from 'react-icons/lu'

export function TransactionPage() {
  return (
    <Section>
      <SectionHeader title="Transactions" />
      <SectionBody>
        <EmptyState
          title="No transactions yet"
          description="Add your first transaction to get started."
          colorScheme="primary"
          icon={LuReceipt}
          actions={
            <Button colorScheme="primary" variant="solid">
              Add Transaction
            </Button>
          }
        />
      </SectionBody>
    </Section>
  )
} 