'use client'

import { Button, IconButton, Text, useClipboard } from '@chakra-ui/react'
import {
  Section,
  SectionBody,
  SectionDescription,
  SectionHeader,
  Toolbar,
} from '@saas-ui-pro/react'
import {
  StructuredList,
  StructuredListCell,
  StructuredListItem,
} from '@saas-ui/react'
import { LuCheck, LuCopy, LuX } from 'react-icons/lu'

import { LinkButton } from '@acme/ui/button'
import { SettingsPage } from '@acme/ui/settings-page'

import { SettingsCard } from '../common/settings-card'

function AccessToken({ token, onRemove }: any) {
  const { value, onCopy, hasCopied } = useClipboard(token)

  const handleRemove = () => {
    onRemove?.(token)
  }

  return (
    <StructuredListItem onClick={onCopy}>
      <StructuredListCell flex="1">
        <Text size="sm">{value}</Text>
      </StructuredListCell>
      <StructuredListCell px="4">
        {hasCopied ? <LuCheck /> : <LuCopy />}
      </StructuredListCell>
      <StructuredListCell>
        <IconButton
          icon={<LuX />}
          aria-label="Remove access token"
          variant="ghost"
          onClick={handleRemove}
        />
      </StructuredListCell>
    </StructuredListItem>
  )
}

function PersonalAccessTokens() {
  const onRemove = () => null

  return (
    <Section variant="annotated">
      <SectionHeader
        title="Personal access tokens"
        description={
          <SectionDescription>
            <Text>Use personal access tokens to access our API.</Text>
          </SectionDescription>
        }
      />
      <SectionBody>
        <SettingsCard
          footer={<Button variant="primary">Create new token</Button>}
        >
          <StructuredList variant="settings" p="0">
            <AccessToken token="12345" onRemove={onRemove} />
          </StructuredList>
        </SettingsCard>
      </SectionBody>
    </Section>
  )
}

export function AccountApiPage() {
  return (
    <SettingsPage
      title="API access"
      description="Access the Saas UI API."
      toolbar={
        <Toolbar>
          <LinkButton href="#">API documentation</LinkButton>
        </Toolbar>
      }
    >
      <PersonalAccessTokens />
    </SettingsPage>
  )
}
