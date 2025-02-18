import {
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuListProps,
  MenuProps,
  Portal,
} from '@chakra-ui/react'
import { LuEllipsisVertical } from 'react-icons/lu'

export interface OverflowMenuProps extends MenuProps {
  children: React.ReactNode
  portal?: boolean
  zIndex?: MenuListProps['zIndex']
}

export const OverflowMenu: React.FC<OverflowMenuProps> = (props) => {
  const { children, portal, zIndex, ...rest } = props

  const list = portal ? (
    <Portal>
      <MenuList>{children}</MenuList>
    </Portal>
  ) : (
    <MenuList zIndex={zIndex}>{children}</MenuList>
  )

  return (
    <Menu {...rest}>
      <MenuButton
        as={IconButton}
        icon={<LuEllipsisVertical />}
        aria-label="Actions"
        size="xs"
        variant="ghost"
      />
      {list}
    </Menu>
  )
}
