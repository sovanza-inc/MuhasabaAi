import React, { useEffect, useMemo, useState } from 'react'

import {
  Box,
  Button,
  Collapse,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Stack,
  Text,
  useControllableState,
  useDisclosure,
} from '@chakra-ui/react'
import {
  SearchInput,
  StructuredList,
  StructuredListCell,
  StructuredListItem,
} from '@saas-ui/react'
import { LuPencil, LuTrash } from 'react-icons/lu'

import { ColorControl } from './color-control'

export interface Tag {
  id: string
  name: string
  count?: number
  color?: string | null
}

interface TagListItemProps {
  colors: string[]
  item: Tag
  isEditing?: boolean
  onEdit?: () => void
  onCancel?: () => void
  onSave?: (tag: Tag) => Promise<void>
  onDelete?: () => void
}

const TagListItem: React.FC<TagListItemProps> = (props) => {
  const {
    colors,
    item,
    isEditing,
    onEdit: onEditProp,
    onCancel: onCancelProp,
    onSave: onSaveProp,
    onDelete: onDeleteProp,
  } = props

  const [edit, setEdit] = useControllableState({
    value: isEditing,
    defaultValue: false,
  })

  const [error, setError] = React.useState('')
  const [isLoading, setLoading] = React.useState(false)

  const [values, setValues] = useState({
    color: item.color,
    name: item.name,
  })

  const onEdit = () => {
    setValues({
      color: item.color,
      name: item.name,
    })
    setEdit(true)
    onEditProp?.()
  }

  const onCancel = () => {
    setEdit(false)
    setValues({
      color: item.color,
      name: item.name,
    })
    setError('')
    onCancelProp?.()
  }

  const onSave = async () => {
    try {
      setError('')
      setLoading(true)

      await onSaveProp?.({
        ...item,
        ...values,
      })

      setEdit(false)
    } catch (e: any) {
      setError(e.message)
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const color = values.color ?? item.color ?? undefined

  const colorBadge = <Box bgColor={color} borderRadius="full" boxSize="2.5" />

  return edit ? (
    <StructuredListItem
      role="group"
      py="1"
      bg="blackAlpha.50"
      borderRadius="md"
      mb="1.5"
      gap="2"
    >
      <StructuredListCell px="0">
        <ColorControl
          value={color}
          colors={colors}
          onChange={(color) =>
            setValues((values) => ({
              ...values,
              color,
            }))
          }
        />
      </StructuredListCell>
      <StructuredListCell
        display="flex"
        alignItems="center"
        flex="1"
        gap="2"
        px="0"
      >
        <FormControl isInvalid={!!error}>
          <FormLabel display="none">Label</FormLabel>
          <Input
            type="text"
            defaultValue={item.name}
            value={values.name}
            size="sm"
            autoFocus
            px="2"
            bg="chakra-body-bg"
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                // prevent modal from closing
                e.preventDefault()
                e.stopPropagation()

                // cancel editing
              } else if (e.key === 'Enter') {
                // save changes
                onSave()
              }
            }}
          />
        </FormControl>
      </StructuredListCell>
      <StructuredListCell display="flex" gap="2">
        <Button
          variant="secondary"
          bg="chakra-body-bg"
          onClick={() => onCancel()}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          isLoading={isLoading}
          onClick={() => onSave()}
        >
          Save
        </Button>
      </StructuredListCell>
    </StructuredListItem>
  ) : (
    <StructuredListItem
      role="group"
      py="1"
      bg="blackAlpha.50"
      borderRadius="md"
      mb="1.5"
      gap="2"
    >
      <StructuredListCell px="0">
        <Flex
          border="1px solid transparent"
          boxSize="8"
          alignItems="center"
          justifyContent="center"
        >
          {colorBadge}
        </Flex>
      </StructuredListCell>
      <StructuredListCell display="flex" alignItems="center" flex="1" gap="2">
        <Text as="span" fontSize="sm">
          {item.name}
        </Text>
        <Text as="span" fontSize="xs" color="muted">
          {item.count}
        </Text>
      </StructuredListCell>
      <StructuredListCell
        display="flex"
        gap="2"
        opacity="0"
        _groupHover={{ opacity: 1 }}
      >
        <IconButton
          size="xs"
          aria-label="edit"
          variant="ghost"
          onClick={() => onEdit()}
        >
          <LuPencil />
        </IconButton>
        <IconButton
          size="xs"
          aria-label="Delete"
          variant="ghost"
          onClick={() => onDeleteProp?.()}
        >
          <LuTrash />
        </IconButton>
      </StructuredListCell>
    </StructuredListItem>
  )
}

interface TagListAddItemProps {
  colors?: string[]
  isOpen?: boolean
  onCancel?: () => void
  onSave?: (tag: Pick<Tag, 'color' | 'name'>) => Promise<void>
}

const TagListAddItem: React.FC<TagListAddItemProps> = (props) => {
  const { colors, isOpen, onCancel: onCancelProp, onSave: onSaveProp } = props

  const inputRef = React.useRef<HTMLInputElement>(null)

  const disclosure = useDisclosure({
    isOpen,
    onClose: () => {
      setValues({
        color: 'gray',
        name: '',
      })
    },
  })

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      })
    }
  }, [isOpen])

  const [error, setError] = React.useState('')
  const [isLoading, setLoading] = React.useState(false)

  const [values, setValues] = useState({
    color: 'gray',
    name: '',
  })

  const onCancel = () => {
    setError('')
    disclosure.onClose()
    onCancelProp?.()
  }

  const onSave = async () => {
    try {
      setError('')
      setLoading(true)

      await onSaveProp?.(values)

      disclosure.onClose()
    } catch (e: any) {
      setError(e.message)
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Collapse in={disclosure.isOpen}>
      <HStack
        role="group"
        py="2"
        bg="gray.100"
        px="2"
        borderWidth="1px"
        borderRadius="md"
        _dark={{ bg: 'whiteAlpha.100' }}
      >
        <Box>
          <ColorControl
            value={values.color}
            colors={colors ?? []}
            onChange={(color) =>
              setValues((values) => ({
                ...values,
                color,
              }))
            }
          />
        </Box>
        <HStack display="flex" alignItems="center" flex="1" gap="2" px="0">
          <FormControl isInvalid={!!error}>
            <FormLabel display="none">Name</FormLabel>
            <Input
              ref={inputRef}
              type="text"
              name="tag"
              placeholder="Tag name"
              value={values.name}
              size="sm"
              px="2"
              bg="chakra-body-bg"
              onChange={(e) => setValues({ ...values, name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  // prevent modal from closing
                  e.preventDefault()
                  e.stopPropagation()

                  // cancel editing
                } else if (e.key === 'Enter') {
                  // save changes
                  onSave()
                }
              }}
            />
          </FormControl>
        </HStack>
        <HStack gap="2">
          <Button
            variant="secondary"
            bg="chakra-body-bg"
            onClick={() => onCancel()}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            isLoading={isLoading}
            onClick={() => onSave()}
          >
            Save
          </Button>
        </HStack>
      </HStack>
    </Collapse>
  )
}

interface ManageTagsProps {
  items: Tag[]
  colors?: string[]
  onSave: (tag: Tag) => Promise<void>
  onCreate: (tag: Pick<Tag, 'color' | 'name'>) => Promise<void>
  onDelete: (id: Tag['id']) => Promise<void>
}

export const ManageTags = (props: ManageTagsProps) => {
  const { items, colors = [], onSave, onCreate, onDelete } = props

  const addTag = useDisclosure()
  const [editId, setEditId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)

  const filteredItems = useMemo(() => {
    if (!searchTerm) {
      return items
    }

    return items.filter((item) => {
      return item.name.toLowerCase().includes(searchTerm.toLowerCase())
    })
  }, [items, searchTerm])

  const noResults = searchTerm && filteredItems.length === 0 && (
    <StructuredListItem>
      <StructuredListCell py="2" px="4" textAlign="center">
        No results for &quot;{searchTerm}&quot;
      </StructuredListCell>
    </StructuredListItem>
  )

  return (
    <Box>
      <Stack
        align="left"
        justify="space-between"
        dir="column"
        spacing="1"
        mb="2"
      >
        <Text color="muted" mb={2}>
          Use tags to help organize contacts in your workspace. Tags created
          here are available to all users in the workspace.
        </Text>
        <HStack spacing="2" justifyContent="space-between">
          <Box>
            <SearchInput
              ref={inputRef}
              size="sm"
              placeholder="Filter by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onReset={() => setSearchTerm('')}
              onKeyDown={(e) => {
                // prevent modal from closing
                if (e.key === 'Escape') {
                  e.preventDefault()
                  e.stopPropagation()
                }
              }}
            />
          </Box>
          <Button
            variant="primary"
            onClick={() => {
              setEditId(null)
              addTag.onOpen()
            }}
          >
            New tag
          </Button>
        </HStack>
      </Stack>

      <TagListAddItem
        {...addTag}
        colors={colors}
        onSave={async (tag) => {
          const result = await onCreate(tag)
          addTag.onClose()
          return result
        }}
        onCancel={() => addTag.onClose()}
      />
      <StructuredList>
        {noResults}
        {filteredItems.map((item) => (
          <TagListItem
            key={item.id}
            colors={colors}
            item={item}
            onEdit={() => {
              setEditId(item.id)
              addTag.onClose()
            }}
            onCancel={() => setEditId(null)}
            onSave={async (tag) => {
              const result = await onSave(tag)
              setEditId(null)
              return result
            }}
            onDelete={() => onDelete(item.id)}
            isEditing={editId === item.id}
          />
        ))}
      </StructuredList>
    </Box>
  )
}
