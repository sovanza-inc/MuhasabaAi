'use client'

import * as React from 'react'

import {
  Badge,
  Box,
  IconButton,
  Spacer,
  Stack,
  useBreakpointValue,
  Icon,
  Collapse,
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
  LuWallet,
  LuChartArea,
  LuReceipt,
  LuUser,
  LuBanknote,
} from 'react-icons/lu'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa' // Import arrow icons

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

  const [isAccountingOpen, setIsAccountingOpen] = React.useState(false)

  // Track the active path to check if any subpage under Accounting is active
  const isAccountsActive = useActivePath('accounts', { end: false })
  const isIdentityActive = useActivePath('identity', { end: false })
  const isTransactionActive = useActivePath('transaction', { end: false })
  const isCashflowActive = useActivePath('cashflow', { end: false })

  // Set the parent item to be open if any subpage is active
  React.useEffect(() => {
    if (isAccountsActive || isIdentityActive || isTransactionActive || isCashflowActive) {
      setIsAccountingOpen(true)
    }
  }, [isAccountsActive, isIdentityActive, isTransactionActive, isCashflowActive])

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
              <AppSidebarLink
                href={usePath('bank-integrations')}
                isActive={useActivePath('bank-integrations', { end: false })}
                label="Bank Integrations"
                icon={<LuWallet />}
                hotkey="navigation.bankIntegrations"
              />

              {/* Parent Accounting Item */}
              <NavItem
                icon={<LuBanknote />}
                onClick={() => setIsAccountingOpen(!isAccountingOpen)} // Toggle the collapse state
                display="flex"
                alignItems="center"
              >
                Accounting
                <Box ml="auto">
                  <Icon
                    as={isAccountingOpen ? FaChevronDown : FaChevronUp} // Toggle arrow based on state
                    boxSize={3}
                    transform={isAccountingOpen ? 'rotate(0deg)' : 'rotate(90deg)'} // Rotate arrow
                    transition="transform 0.3s ease" // Smooth transition for rotation
                    color="gray.600" // Lighter color for less bold appearance
                  />
                </Box>
              </NavItem>

              {/* Collapse section for subpages under Accounts */}
              <Collapse in={isAccountingOpen}>
                <Stack pl={4}>
                  <AppSidebarLink
                    href={usePath('accounts')}
                    isActive={isAccountsActive}
                    label="Accounts"
                    icon={<LuBanknote />}
                    hotkey="navigation.accounts"
                  />
                  <AppSidebarLink
                    href={usePath('identity')}
                    isActive={isIdentityActive}
                    label="Identity"
                    icon={<LuUser />}
                    hotkey="navigation.identity"
                  />
                  <AppSidebarLink
                    href={usePath('transaction')}
                    isActive={isTransactionActive}
                    label="Transaction"
                    icon={<LuReceipt />}
                    hotkey="navigation.transaction"
                  />
                  <AppSidebarLink
                    href={usePath('cashflow')}
                    isActive={isCashflowActive}
                    label="Cashflow"
                    icon={<LuChartArea />}
                    hotkey="navigation.cashflow"
                  />
                </Stack>
              </Collapse>
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
