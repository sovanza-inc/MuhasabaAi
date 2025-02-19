'use client'

import { Button } from '@chakra-ui/react'
import { Section, SectionBody, SectionHeader } from '@saas-ui-pro/react'
import { EmptyState } from '@saas-ui/react'
import { LuChartArea } from 'react-icons/lu'

export function CashflowPage() {
  return (
    <Section>
      <SectionHeader title="Cashflow" />
      <SectionBody>
        <EmptyState
          title="No cashflow data yet"
          description="Add your first transaction to start tracking cashflow."
          colorScheme="primary"
          icon={LuChartArea}
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
