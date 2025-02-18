import * as React from 'react'

import { Icon, useBreakpointValue } from '@chakra-ui/react'
import { Has } from '@saas-ui-pro/feature-flags'
import { ResizeHandle, ResizeHandler, Resizer } from '@saas-ui-pro/react'
import {
  NavGroup,
  NavItem,
  NavItemProps,
  Sidebar,
  SidebarOverlay,
  SidebarSection,
  SidebarToggleButton,
  useHotkeysShortcut,
} from '@saas-ui/react'
import { LuArrowLeft, LuFolder, LuUser } from 'react-icons/lu'

import { useActivePath } from '@acme/next'
import { LinkButton } from '@acme/ui/button'
import { useHelpCenter } from '@acme/ui/help-center'

import { usePath } from '#features/common/hooks/use-path'
import { useUserSettings } from '#lib/user-settings/use-user-settings'

const SettingsLink = (props: NavItemProps & { path: string }) => {
  const { path, ...rest } = props
  const href = usePath(`/settings${path}`)
  return (
    <NavItem inset={5} href={href} isActive={useActivePath(href)} {...rest} />
  )
}

export const SettingsSidebar = () => {
  const backRef = React.useRef<HTMLButtonElement>(null)

  const help = useHelpCenter()

  useHotkeysShortcut('general.help', () => {
    help.open()
  })

  useHotkeysShortcut('settings.close', () => {
    // Simply triggering a click here, so we don't need to reference the router.
    backRef.current?.click()
  })

  const [{ sidebarWidth }, setUserSettings] = useUserSettings()

  const onResize: ResizeHandler = ({ width }) => {
    setUserSettings('sidebarWidth', width)
  }

  return (
    <Resizer
      defaultWidth={sidebarWidth}
      onResize={onResize}
      isResizable={useBreakpointValue(
        { base: false, lg: true },
        { fallback: 'lg' },
      )}
    >
      <Sidebar>
        <SidebarToggleButton />

        <SidebarSection direction="row" alignItems="center">
          <LinkButton
            href={usePath('/')}
            ref={backRef}
            leftIcon={
              <Icon
                as={LuArrowLeft}
                transitionProperty="transform"
                transitionDuration="normal"
                sx={{
                  'a:hover &': {
                    transform: 'translateX(-4px)',
                  },
                }}
              />
            }
            variant="ghost"
            fontSize="lg"
          >
            Settings
          </LinkButton>
        </SidebarSection>
        <SidebarSection flex="1" overflowY="auto">
          <Has feature="settings">
            <NavGroup title="Workspace" icon={<LuFolder />}>
              <SettingsLink path="/">Overview</SettingsLink>
              <SettingsLink path="/workspace">Workspace</SettingsLink>
              <SettingsLink path="/members">Members</SettingsLink>
              <SettingsLink path="/tags">Tags</SettingsLink>
              <SettingsLink path="/plans">Plans</SettingsLink>
              <SettingsLink path="/billing">Billing</SettingsLink>
            </NavGroup>
          </Has>

          <NavGroup title="Account" icon={<LuUser />}>
            <SettingsLink path="/account">Profile</SettingsLink>
            <SettingsLink path="/account/security">Security</SettingsLink>
            <SettingsLink path="/account/notifications">
              Notifications
            </SettingsLink>
            <SettingsLink path="/account/api">Api</SettingsLink>
          </NavGroup>
        </SidebarSection>
        <SidebarOverlay />
        <ResizeHandle />
      </Sidebar>
    </Resizer>
  )
}
