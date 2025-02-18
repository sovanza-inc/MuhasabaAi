'use client'

import { Button, SimpleGrid } from '@chakra-ui/react'
import { useBilling } from '@saas-ui-pro/billing'
import { Section, SectionBody, SectionHeader } from '@saas-ui-pro/react'
import { Property, PropertyList } from '@saas-ui/react'
import {
  LuBox,
  LuBriefcase,
  LuCircleHelp,
  LuGithub,
  LuShield,
} from 'react-icons/lu'

import { FormattedDate } from '@acme/i18n'
import { LinkButton } from '@acme/ui/button'
import { SettingsPage } from '@acme/ui/settings-page'

import { usePath } from '#features/common/hooks/use-path'

import { SettingsCard } from '../common/settings-card'
import { SupportCard } from '../common/support-card'

export function SettingsOverviewPage() {
  const { currentPlan, isTrialing, isCanceled, trialEndsAt, status } =
    useBilling()

  return (
    <SettingsPage title="Overview" description="Manage your workspace settings">
      <Section>
        <SectionHeader title="Workspace settings" />
        <SectionBody>
          <SimpleGrid columns={[1, null, 2]} spacing={4}>
            <SettingsCard
              title="Billing"
              description="Manage your subscription."
              icon={LuBriefcase}
              footer={
                <LinkButton href={usePath('/settings/plans')} variant="primary">
                  {isCanceled ? 'Activate your account' : 'Upgrade'}
                </LinkButton>
              }
            >
              <PropertyList borderTopWidth="1px" px="4">
                <Property label="Billing plan" value={currentPlan?.name} />
                {isTrialing ? (
                  <Property
                    label="Trial ends"
                    value={<FormattedDate value={trialEndsAt} />}
                  />
                ) : (
                  <Property label="Status" value={status} />
                )}
              </PropertyList>
            </SettingsCard>
          </SimpleGrid>
        </SectionBody>
      </Section>

      <Section>
        <SectionHeader title="Your account" />
        <SectionBody>
          <SimpleGrid columns={[1, null, 2]} spacing={4}>
            <SettingsCard
              title="Security recommendations"
              description="Improve your account security by enabling two-factor
              authentication."
              icon={LuShield}
              footer={
                <Button variant="secondary">
                  Enable two-factor authentication
                </Button>
              }
            />
          </SimpleGrid>
        </SectionBody>
      </Section>

      <Section>
        <SectionHeader title="More" />
        <SectionBody>
          <SimpleGrid columns={[1, null, 3]} spacing={4}>
            <SupportCard
              title="Start guide"
              description="Read how to get started with Saas UI Pro."
              icon={LuCircleHelp}
              href="https://saas-ui.dev/docs/pro/overview"
            />
            <SupportCard
              title="Components"
              description="See all components and how they work."
              icon={LuBox}
              href="https://www.saas-ui.dev/docs/components"
            />
            <SupportCard
              title="Roadmap"
              description="Post feedback, bugs and feature requests."
              icon={LuGithub}
              href="https://roadmap.saas-ui.dev"
            />
          </SimpleGrid>
        </SectionBody>
      </Section>
    </SettingsPage>
  )
}
