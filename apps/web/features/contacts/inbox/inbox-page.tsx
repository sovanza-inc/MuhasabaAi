'use client'

import * as React from 'react'

import {
  Box,
  Divider,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  Portal,
  Spacer,
  Switch,
  Tooltip,
  useBreakpointValue,
  useDisclosure,
} from '@chakra-ui/react'
import {
  MenuProperty,
  Page,
  PageBody,
  PageHeader,
  ResizeHandle,
  Resizer,
  SplitPage,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  ToolbarButton,
} from '@saas-ui-pro/react'
import { EmptyState, useLocalStorage } from '@saas-ui/react'
import { useRouter } from 'next/navigation'
import {
  LuChevronLeft,
  LuClock,
  LuInbox,
  LuSlidersHorizontal,
  LuTrash,
} from 'react-icons/lu'

import { NotificationDTO } from '@acme/api/types'

import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import { WorkspacePageProps } from '#lib/create-page'
import { api } from '#lib/trpc/react'

import { ContactsViewPage } from '../view/view-page'
import { InboxList } from './inbox-list'

/**
 * This is a simple wrapper around the ContactsViewPage with an inbox specific toolbar
 */
function InboxViewPage(props: {
  item: NotificationDTO
  params: {
    workspace: string
    type: NotificationDTO['subjectType']
    id: string
  }
  onBack?: () => void
}) {
  const toolbar = (
    <>
      <ToolbarButton
        display={{ base: 'inline-flex', lg: 'none' }}
        label="All notifications"
        onClick={props.onBack}
        icon={<LuChevronLeft size="1.2em" />}
        variant="ghost"
      />
      <Spacer />
      <ToolbarButton leftIcon={<LuTrash />} label="Delete notification" />
      <ToolbarButton leftIcon={<LuClock />} label="Snooze" />
    </>
  )
  return <ContactsViewPage params={props.params} toolbarItems={toolbar} />
}

export function InboxListPage({ params }: WorkspacePageProps<{ id?: string }>) {
  const router = useRouter()

  const [workspace] = useCurrentWorkspace()

  const [, startTransition] = React.useTransition()

  const { data, isLoading } = api.notifications.inbox.useQuery({
    workspaceId: workspace.id,
  })

  const isMobile = useBreakpointValue(
    { base: true, lg: false },
    { fallback: 'base' },
  )

  const { isOpen, onOpen, onClose } = useDisclosure({
    defaultIsOpen: !!params.id,
  })

  const [width, setWidth] = useLocalStorage('app.inbox-list.width', 280)

  React.useEffect(() => {
    if (!params.id && !isLoading && !isMobile) {
      const firstItem = data?.notifications[0]
      if (firstItem) {
        // redirect to the first inbox notification if it's available.
        startTransition(() => {
          router.replace(`/${params.workspace}/inbox/${firstItem.id}`)
        })
      }
    }
  }, [router, data, isLoading, isMobile, params])

  React.useEffect(() => {
    if (params.id) {
      onOpen()
    }
    // the isMobile dep is needed so that the SplitPage
    // will open again when the screen size changes to lg
  }, [params, isMobile, onOpen])

  const [visibleProps, setVisibleProps] = React.useState<string[]>([])

  const notificationCount = data?.notifications?.length || 0

  const displayProperties = (
    <ToggleButtonGroup
      type="checkbox"
      isAttached={false}
      size="xs"
      spacing="0"
      flexWrap="wrap"
      value={visibleProps}
      onChange={setVisibleProps}
    >
      {['id'].map((id) => {
        return (
          <ToggleButton
            key={id}
            value={id}
            mb="1"
            me="1"
            color="muted"
            _checked={{ color: 'app-text', bg: 'whiteAlpha.200' }}
          >
            {id.charAt(0).toUpperCase() + id.slice(1)}
          </ToggleButton>
        )
      })}
    </ToggleButtonGroup>
  )

  const toolbar = (
    <Toolbar>
      <Menu>
        <Tooltip label="Display settings">
          <MenuButton
            as={IconButton}
            icon={<LuSlidersHorizontal />}
            aria-label="Display settings"
            variant="tertiary"
            size="xs"
          />
        </Tooltip>
        <Portal>
          <MenuList maxW="260px">
            <MenuProperty
              label="Show snoozed"
              value={<Switch size="sm" defaultChecked={false} />}
            />
            <MenuProperty label="Show read" value={<Switch size="sm" />} />
            <Divider />
            <MenuProperty
              label="Display properties"
              value={displayProperties}
              orientation="vertical"
            />
          </MenuList>
        </Portal>
      </Menu>
    </Toolbar>
  )

  const emptyState = (
    <EmptyState
      icon={LuInbox}
      title="Inbox zero"
      description="Nothing to do here"
      variant="centered"
      height="100%"
    />
  )

  let content = <Box />
  if (params.id) {
    const item = data?.notifications?.find((item) => item.id === params.id)
    content = item ? (
      <InboxViewPage
        item={item}
        params={{
          workspace: params.workspace,
          type: item.subjectType,
          id: item.subjectId,
        }}
        onBack={() => onClose()}
      />
    ) : (
      <EmptyState
        title="Notification not found"
        description={`There is no notification with id ${params.id}.`}
      />
    )
  } else if (!notificationCount) {
    content = emptyState
  }

  return (
    <SplitPage isOpen={isOpen} onOpen={onOpen} onClose={onClose}>
      <Resizer
        defaultWidth={width}
        onResize={({ width }) => setWidth(width)}
        isResizable={!isMobile}
      >
        <Page
          as="div"
          borderRightWidth={{ base: 0, lg: '1px' }}
          minWidth="280px"
          maxW={{ base: '100%', lg: '640px' }}
          position="relative"
          isLoading={isLoading}
          flex={{ base: '1', lg: 'unset' }}
        >
          <PageHeader title="Inbox" toolbar={toolbar} />
          <PageBody p="0">
            {!notificationCount && !isOpen ? (
              emptyState
            ) : (
              <InboxList items={data?.notifications || []} />
            )}
          </PageBody>
          <ResizeHandle />
        </Page>
      </Resizer>
      {content}
    </SplitPage>
  )
}
