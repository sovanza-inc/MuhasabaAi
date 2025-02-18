'use client'

import {
  Button,
  HStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
} from '@chakra-ui/react'
import { BackButton } from '@saas-ui-pro/react'
import { useAuth } from '@saas-ui/auth-provider'
import Link from 'next/link'

import { AppLayout, AppLayoutProps } from './app-layout'

/**
 * Fullscreen layout, for functionality that requires extra focus, like onboarding/checkout/etc.
 */
export const FullscreenLayout: React.FC<
  AppLayoutProps & { hideBackButton?: boolean }
> = ({ children, hideBackButton, ...rest }) => {
  const { user, logOut } = useAuth()

  let menu
  if (user) {
    menu = (
      <Menu>
        <MenuButton
          as={Button}
          variant="ghost"
          textAlign="left"
          py="2"
          height="auto"
          lineHeight="1.6"
        >
          <Text size="xs" color="muted" fontWeight="normal">
            Logged in as
          </Text>
          <Text fontWeight="medium">{user?.email}</Text>
        </MenuButton>
        <MenuList>
          <MenuItem onClick={() => logOut()}>Log out</MenuItem>
        </MenuList>
      </Menu>
    )
  }

  return (
    <AppLayout {...rest}>
      <HStack
        position="fixed"
        zIndex="overlay"
        top="0"
        px="4"
        py="2"
        width="full"
      >
        {!hideBackButton && <BackButton as={Link} href="/" />}
        {menu}
      </HStack>
      {children}
    </AppLayout>
  )
}
