import {
  Avatar,
  AvatarProps,
  Button,
  ButtonProps,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuGroup,
  MenuItem,
  MenuList,
  Portal,
  Spacer,
  Text,
} from '@chakra-ui/react'
import { Has } from '@saas-ui-pro/feature-flags'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LuCheck } from 'react-icons/lu'

import { usePath } from '../hooks/use-path'
import { useWorkspace } from '../hooks/use-workspace'
import { useWorkspaces } from '../hooks/use-workspaces'

const WorkspaceLogo: React.FC<AvatarProps> = (props) => {
  const { src, ...rest } = props
  return (
    <Avatar
      display="inline-flex"
      src={src}
      size="xs"
      borderRadius="full"
      {...rest}
    />
  )
}

export interface WorkspacesMenuProps {
  compact?: boolean
}

export const WorkspacesMenu: React.FC<WorkspacesMenuProps> = (props) => {
  const router = useRouter()
  const workspace = useWorkspace()
  const workspaces = useWorkspaces()

  const activeWorkspace = (function () {
    for (const i in workspaces) {
      if (workspaces[i]?.slug === workspace) {
        return workspaces[i]
      }
    }
    return workspaces[0]
  })()

  const setWorkspace = (workspace: string) => {
    router.push(`/${workspace}`)
  }

  const buttonProps: ButtonProps = {
    ['aria-label']: `Current workspace is ${activeWorkspace?.label}`,
    className: 'workspaces-menu',
    variant: 'ghost',
    ps: '1',
    _hover: {
      bg: 'sidebar-on-muted',
    },
    _active: {
      bg: 'sidebar-on-subtle',
    },
  }

  const activeLogo = (
    <WorkspaceLogo name={activeWorkspace?.label} src={activeWorkspace?.logo} />
  )

  return (
    <Menu>
      {props.compact ? (
        <MenuButton as={IconButton} {...buttonProps} icon={activeLogo} />
      ) : (
        <MenuButton as={Button} leftIcon={activeLogo} {...buttonProps}>
          {activeWorkspace?.label}
        </MenuButton>
      )}
      <Portal>
        {/* Wrap the menu in a portal so that the color scheme tokens get applied correctly.  */}
        <MenuList zIndex={['modal', null, 'dropdown']}>
          <MenuGroup title="Workspaces">
            {workspaces.map(({ slug, label, logo, ...props }) => {
              return (
                <MenuItem
                  key={slug}
                  value={slug}
                  icon={<WorkspaceLogo name={label} src={logo} />}
                  onClick={() => setWorkspace(slug)}
                  {...props}
                >
                  <HStack>
                    <Text>{label}</Text>
                    <Spacer />
                    {slug === activeWorkspace?.slug ? <LuCheck /> : null}
                  </HStack>
                </MenuItem>
              )
            })}
          </MenuGroup>
          <MenuDivider />
          <Has feature="settings">
            <MenuItem as={Link} href={usePath('settings/workspace')}>
              Workspace settings
            </MenuItem>
          </Has>
          <MenuItem as={Link} href="/getting-started">
            Create a workspace
          </MenuItem>
        </MenuList>
      </Portal>
    </Menu>
  )
}
