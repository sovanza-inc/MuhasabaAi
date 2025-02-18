'use client'

import * as React from 'react'

import {
  HStack,
  Spacer,
  Tab,
  TabList,
  TabPanels,
  Tabs,
  useBreakpointValue,
  useDisclosure,
} from '@chakra-ui/react'
import {
  Page,
  PageBody,
  PageHeader,
  Toolbar,
  ToolbarButton,
} from '@saas-ui-pro/react'
import { LuPanelRightOpen } from 'react-icons/lu'

import { Breadcrumbs } from '@acme/ui/breadcrumbs'

import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import { usePath } from '#features/common/hooks/use-path'
import { WorkspacePageProps } from '#lib/create-page'
import { api } from '#lib/trpc/react'

import { ActivitiesPanel } from './activities-panel'
import { ContactSidebar } from './contact-sidebar'

interface ContactsViewPageProps extends WorkspacePageProps<{ id: string }> {
  /**
   * Additional toolbar items when embedded in another page, eg the inbox
   */
  toolbarItems?: React.ReactNode
}

export function ContactsViewPage({
  params,
  toolbarItems,
}: ContactsViewPageProps) {
  const [workspace] = useCurrentWorkspace()

  const [data] = api.contacts.byId.useSuspenseQuery({
    id: params.id,
    workspaceId: workspace.id,
  })

  const isMobile = useBreakpointValue(
    { base: true, lg: false },
    {
      fallback: undefined,
    },
  )

  const sidebar = useDisclosure({
    defaultIsOpen: true,
  })

  React.useEffect(() => {
    if (isMobile === true) {
      sidebar.onClose()
    }
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [isMobile])

  const breadcrumbs = (
    <Breadcrumbs
      items={[
        { href: usePath('/contacts'), title: 'Contacts' },
        { title: data?.name },
      ]}
    />
  )

  const toolbar = (
    <Toolbar>
      <Spacer />
      {toolbarItems}
      <ToolbarButton
        icon={<LuPanelRightOpen />}
        label={sidebar.isOpen ? 'Hide contact details' : 'Show contact details'}
        onClick={sidebar.onToggle}
      />
    </Toolbar>
  )

  return (
    <Page>
      <PageHeader title={breadcrumbs} toolbar={toolbar} />
      <PageBody contentWidth="full" p="0">
        <HStack
          alignItems="stretch"
          width="100%"
          height="100%"
          overflowX="hidden"
          position="relative"
          spacing="0"
        >
          <Tabs
            variant="line"
            isLazy
            flex="1"
            minH="0"
            display="flex"
            flexDirection="column"
            size="sm"
          >
            <TabList borderBottomWidth="1px" px="3" pt="2" zIndex="1">
              <Tab>Activity</Tab>
            </TabList>
            <TabPanels overflowY="auto" flex="1">
              <ActivitiesPanel contact={data} />
            </TabPanels>
          </Tabs>

          <ContactSidebar contact={data} isOpen={sidebar.isOpen} />
        </HStack>
      </PageBody>
    </Page>
  )
}
