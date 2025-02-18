'use client'

import * as React from 'react'

import {
  Badge,
  Box,
  IconButton,
  Spacer,
  Stack,
  useBreakpointValue,
} from '@chakra-ui/react'
import {
  Command,
  ResizeHandle,
  ResizeHandler,
  Resizer,
} from '@saas-ui-pro/react'
import {
  NavGroup,
  NavItem,
  NavItemProps,
  Sidebar,
  SidebarOverlay,
  SidebarProps,
  SidebarSection,
  SidebarToggleButton,
  useHotkeysShortcut,
  useSidebarContext,
} from '@saas-ui/react'
import { Route } from 'next'
import { useRouter } from 'next/navigation'
import {
  LuCircleHelp,
  LuHouse,
  LuInbox,
  LuPlus,
  LuSearch,
  LuSquareUser,
} from 'react-icons/lu'

import { useActivePath } from '@acme/next'
import { useHelpCenter } from '@acme/ui/help-center'
import { useModals } from '@acme/ui/modals'

import { usePath } from '#features/common/hooks/use-path'
import { useUserSettings } from '#lib/user-settings/use-user-settings'

import { BillingStatus } from './billing-status'
import { GlobalSearchInput } from './global-search-input'
import { InvitePeopleDialog } from './invite-people'
import { AppSidebarTags } from './sidebar-tags'
import { UserMenu } from './user-menu'
import { WorkspacesMenu } from './workspaces-menu'

export interface AppSidebarProps extends SidebarProps {}

export const AppSidebar: React.FC<AppSidebarProps> = (props) => {
  const modals = useModals()
  const help = useHelpCenter()

  const [{ sidebarWidth }, setUserSettings] = useUserSettings()

  const { variant, colorScheme } = props
  const isCompact = variant === 'compact'

  const onResize: ResizeHandler = ({ width }) => {
    setUserSettings('sidebarWidth', width)
  }

  return (
    <Resizer
      defaultWidth={isCompact ? 60 : sidebarWidth}
      onResize={onResize}
      isResizable={useBreakpointValue(
        { base: false, lg: true },
        { fallback: 'lg' },
      )}
    >
      <Sidebar
        {...props}
        variant={variant}
        colorScheme={colorScheme}
        suppressHydrationWarning
      >
        <Stack flex="1" spacing="4">
          <SidebarToggleButton />
          <SidebarSection direction="row">
            <React.Suspense>
              <WorkspacesMenu compact={isCompact} />
            </React.Suspense>

            {!isCompact && (
              <>
                <Spacer />
                <React.Suspense>
                  <UserMenu />
                </React.Suspense>
              </>
            )}
          </SidebarSection>
          <Box px={3}>
            {isCompact ? (
              <IconButton icon={<LuSearch />} aria-label="Search" />
            ) : (
              <GlobalSearchInput />
            )}
          </Box>
          <SidebarSection overflowY="auto" flex="1">
            <NavGroup>
              <AppSidebarLink
                href={usePath('/')}
                label="Dashboard"
                icon={<LuHouse />}
                hotkey="navigation.dashboard"
              />
              <AppSidebarLink
                href={usePath('inbox')}
                isActive={useActivePath('inbox', { end: false })}
                label="Inbox"
                badge={2}
                icon={<LuInbox />}
                hotkey="navigation.inbox"
              />
              <AppSidebarLink
                href={usePath('contacts')}
                isActive={useActivePath('contacts', { end: false })}
                label="Contacts"
                icon={<LuSquareUser />}
                hotkey="navigation.contacts"
              />
            </NavGroup>

            {!isCompact && <AppSidebarTags />}

            <Spacer />

            <NavGroup>
              <NavItem
                onClick={() => modals.open(InvitePeopleDialog)}
                color="sidebar-muted"
                icon={<LuPlus />}
              >
                Invite people
              </NavItem>
              <NavItem
                onClick={() => help.open()}
                color="sidebar-muted"
                icon={<LuCircleHelp />}
              >
                Help &amp; support
              </NavItem>
            </NavGroup>
          </SidebarSection>

          {isCompact ? (
            <SidebarSection>
              <UserMenu />
            </SidebarSection>
          ) : (
            <BillingStatus />
          )}
        </Stack>
        <SidebarOverlay />
        <ResizeHandle />
      </Sidebar>
    </Resizer>
  )
}

interface AppSidebarlink<Href extends Route = Route> extends NavItemProps {
  hotkey: string
  href: Route<Href>
  label: string
  badge?: React.ReactNode
}

const AppSidebarLink = <Href extends Route = Route>(
  props: AppSidebarlink<Href>,
) => {
  const { href, label, hotkey, badge, ...rest } = props
  const { push } = useRouter()
  const isActive = useActivePath(href)

  const { variant } = useSidebarContext()

  const command = useHotkeysShortcut(hotkey, () => {
    push(href)
  }, [href])

  return (
    <NavItem
      href={href}
      isActive={isActive}
      {...rest}
      tooltipProps={{
        label: (
          <>
            {label} <Command>{command}</Command>
          </>
        ),
      }}
    >
      <Box as="span" noOfLines={1}>
        {label}
      </Box>

      {typeof badge !== 'undefined' && variant !== 'compact' ? (
        <Badge borderRadius="sm" ms="auto" px="1.5" bg="none">
          {badge}
        </Badge>
      ) : null}
    </NavItem>
  )
}
