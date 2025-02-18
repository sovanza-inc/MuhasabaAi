import * as React from 'react'

import {
  Badge,
  BadgeProps,
  Box,
  Button,
  HTMLChakraProps,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  MenuProps,
  Portal,
  Tag,
  TagCloseButton,
  TagLabel,
  TagProps,
  Tooltip,
  UseControllableStateProps,
  chakra,
  useControllableState,
  useDisclosure,
} from '@chakra-ui/react'
import { MenuInput, useSearchQuery } from '@saas-ui-pro/react'
import { LuPlus, LuTag } from 'react-icons/lu'

export interface TagsListProps extends HTMLChakraProps<'div'> {
  children: React.ReactNode
}

export const TagsList: React.FC<TagsListProps> = (props) => {
  return <chakra.div {...props}>{props.children}</chakra.div>
}

export interface TagsListItemProps extends Omit<TagProps, 'rightIcon'> {
  icon?: React.ReactNode
  onDelete?(): void
}

export const TagsListItem: React.FC<TagsListItemProps> = (props) => {
  const { icon, children, onDelete } = props

  let _icon
  if (icon && React.isValidElement<any>(icon)) {
    _icon = React.cloneElement(icon, {
      verticalAlign: 'top',
      marginEnd: '0.5rem',
    })
  }

  return (
    <Tag me="1" mb="1">
      {_icon}
      <TagLabel>{children}</TagLabel>
      {onDelete && <TagCloseButton onClick={onDelete} />}
    </Tag>
  )
}

export interface TagColorProps extends Omit<BadgeProps, 'color'> {
  color?: string
}

export const TagColor: React.FC<TagColorProps> = (props) => {
  const { color = 'gray', ...rest } = props

  let tagColor = color
  const colorRegex = /^(#|hsl)/
  if (!colorRegex.test(tagColor)) {
    tagColor = `tag.${tagColor}`
  }

  return (
    <Badge
      bg="currentColor"
      color={color}
      borderRadius="full"
      boxSize="8px"
      {...rest}
    />
  )
}

export interface AddTagProps
  extends UseControllableStateProps<string[]>,
    Omit<MenuProps, 'children'> {
  tags?: Array<{ id: string; name: string; color?: string | null }>
  variant?: 'compact' | 'default'
}

export const AddTag: React.FC<AddTagProps> = (props) => {
  const {
    value: valueProp,
    defaultValue,
    onChange: onChangeProp,
    variant,
  } = props

  const [value, setValue] = useControllableState({
    defaultValue: defaultValue || [],
    value: valueProp,
    onChange: onChangeProp,
  })

  const {
    results,
    onReset,
    value: inputValue,
    ...inputProps
  } = useSearchQuery({
    items: props.tags || [],
    fields: ['name'],
  })

  const { isOpen, onOpen, onClose } = useDisclosure({
    onClose() {
      setTimeout(() => {
        onReset()
      }, 100) // prevent flicker
    },
  })

  const onCreate = (tag: string) => {
    setValue([...value, tag])
    onClose()
  }

  return (
    <Menu
      placement="left-start"
      isOpen={isOpen}
      onOpen={onOpen}
      onClose={onClose}
    >
      {variant === 'compact' ? (
        <Tooltip label="Add tags">
          <MenuButton
            as={IconButton}
            rounded="full"
            size="xs"
            height="6"
            minWidth="6"
            variant="ghost"
            fontWeight="medium"
            icon={<LuPlus strokeWidth="3" />}
          />
        </Tooltip>
      ) : (
        <MenuButton
          as={Button}
          size="xs"
          variant="ghost"
          fontWeight="medium"
          leftIcon={<LuTag />}
        >
          Add tag
        </MenuButton>
      )}
      <Portal>
        <MenuList pt="0" zIndex="dropdown">
          <Box>
            <MenuInput
              placeholder="Add tags"
              command="L"
              value={inputValue}
              onKeyUp={(e) => {
                if (e.key === 'Enter' && !results?.length && inputValue) {
                  onCreate?.(inputValue)
                }
              }}
              {...inputProps}
            />
          </Box>
          <MenuOptionGroup
            type="checkbox"
            value={value}
            onChange={(value) => setValue(value as string[])}
          >
            {!inputValue || results?.length ? (
              (results || []).map(({ id, name, color }) => {
                return (
                  <MenuItemOption
                    key={id}
                    value={id}
                    flexDirection="row-reverse"
                    pe="0"
                  >
                    <TagColor color={color ?? undefined} me="2" /> {name}
                  </MenuItemOption>
                )
              })
            ) : (
              <MenuItem onClick={() => onCreate?.(inputValue)}>
                Create tag:{' '}
                <chakra.span color="muted" ms="1">
                  &quot;{inputValue}&quot;
                </chakra.span>
              </MenuItem>
            )}
          </MenuOptionGroup>
        </MenuList>
      </Portal>
    </Menu>
  )
}
