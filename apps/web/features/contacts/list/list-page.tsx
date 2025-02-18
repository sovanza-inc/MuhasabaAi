'use client'

import * as React from 'react'

import {
  Box,
  Button,
  HStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Portal,
  Spacer,
  Text,
} from '@chakra-ui/react'
import {
  Command,
  DataGridCell,
  Filter,
  MenuProperty,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  ToolbarButton,
  getDataGridFilter,
  useColumns,
} from '@saas-ui-pro/react'
import {
  EmptyState,
  Link,
  PersonaAvatar,
  Select,
  SelectButton,
  SelectList,
  SelectOption,
  useHotkeysShortcut,
  useSnackbar,
} from '@saas-ui/react'
import { format } from 'date-fns'
import {
  LuGrid2X2,
  LuList,
  LuSlidersHorizontal,
  LuSquareUser,
} from 'react-icons/lu'
import { z } from 'zod'

import { ContactDTO } from '@acme/api/types'
import { InlineSearch } from '@acme/ui/inline-search'
import { ListPage, ListPageProps } from '@acme/ui/list-page'
import { OverflowMenu } from '@acme/ui/menu'
import { useModals } from '@acme/ui/modals'

import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import { usePath } from '#features/common/hooks/use-path'
import { WorkspacePageProps } from '#lib/create-page'
import { api } from '#lib/trpc/react'
import { useUserSettings } from '#lib/user-settings/use-user-settings'

import { ContactStatus } from '../common/contact-status'
import { ContactTag } from '../common/contact-tag'
import { ContactType } from '../common/contact-type'
import { ContactBoardHeader } from './contact-board-header'
import { bulkActions } from './contact-bulk-actions'
import { ContactCard } from './contact-card'
import { AddFilterButton, useContactFilters } from './contact-filters'
import { ContactTypes } from './contact-types'

const DateCell = ({ date }: { date?: string | Date | null }) => {
  return <>{date ? format(new Date(date), 'PP') : null}</>
}

const ActionCell: DataGridCell<ContactDTO> = (cell) => {
  return (
    <Box onClick={(e) => e.stopPropagation()}>
      <OverflowMenu>
        <MenuItem onClick={() => console.log(cell.row.id)}>Delete</MenuItem>
      </OverflowMenu>
    </Box>
  )
}

const getType = (type?: 'leads' | 'customers') => {
  switch (type) {
    case 'leads':
      return 'lead'
    case 'customers':
      return 'customer'
  }
}

export const paramsSchema = z.object({
  workspace: z.string(),
  type: z.enum(['leads', 'customers']).optional(),
  tag: z.string().optional(),
})

const schema = z.object({
  name: z
    .string()
    .min(2, 'Please enter a name')
    .max(255, 'Name can be at most 255 characters long')
    .describe('Full name'),
  email: z.string().email().describe('Email'),
})

export function ContactsListPage({
  params,
}: WorkspacePageProps<z.infer<typeof paramsSchema>>) {
  const modals = useModals()
  const snackbar = useSnackbar()

  const basePath = usePath('/')

  const [searchQuery, setSearchQuery] = React.useState('')

  const type = getType(params.type)

  const utils = api.useUtils()

  const [workspace] = useCurrentWorkspace()

  const [userSettings, setUserSettings] = useUserSettings()

  const { data, isLoading } = api.contacts.listByType.useQuery({
    workspaceId: workspace.id,
    type,
  })

  const createContactMutation = api.contacts.create.useMutation({
    onSettled: () => {
      utils.contacts.listByType.invalidate({ workspaceId: workspace.id })
    },
  })

  const updateContactMutation = api.contacts.update.useMutation()

  const filters = useContactFilters()

  const columns = useColumns<ContactDTO>(
    (helper) => [
      helper.accessor('name', {
        header: 'Name',
        size: 200,
        enableHiding: false,
        cell: (cell) => (
          <HStack spacing="4">
            <PersonaAvatar
              name={cell.getValue() ?? undefined}
              src={cell.row.original.avatar ?? undefined}
              size="xs"
            />
            <Link href={`${basePath}/contacts/view/${cell.row.id}`}>
              {cell.getValue()}
            </Link>
          </HStack>
        ),
      }),
      helper.accessor('email', {
        header: 'Email',
        size: 300,
        cell: (cell) => <Text color="muted">{cell.getValue()}</Text>,
      }),
      helper.accessor('createdAt', {
        header: 'Created at',
        cell: (cell) => <DateCell date={cell.getValue()} />,
        filterFn: getDataGridFilter('date'),
        enableGlobalFilter: false,
      }),
      helper.accessor('updatedAt', {
        header: 'Updated at',
        cell: (cell) => <DateCell date={cell.getValue()} />,
        filterFn: getDataGridFilter('date'),
        enableGlobalFilter: false,
      }),
      helper.accessor('type', {
        header: 'Type',
        cell: (cell) => <ContactType type={cell.getValue()} />,
        filterFn: getDataGridFilter('string'),
        enableGlobalFilter: false,
      }),
      helper.accessor('tags', {
        header: 'Tags',
        cell: (cell) => (
          <HStack>
            {cell.getValue()?.map((tag) => <ContactTag key={tag} tag={tag} />)}
          </HStack>
        ),
        filterFn: getDataGridFilter('string'),
        enableGlobalFilter: false,
      }),
      helper.accessor('status', {
        header: 'Status',
        cell: (cell) => (
          <ContactStatus status={cell.getValue()} color="muted" />
        ),
        filterFn: getDataGridFilter('string'),
        enableGlobalFilter: false,
      }),
      helper.display({
        id: 'action',
        header: '',
        cell: ActionCell,
        size: 60,
        enableGlobalFilter: false,
        enableHiding: false,
        enableSorting: false,
        enableGrouping: false,
        enableResizing: false,
      }),
    ],
    [],
  )

  const addPerson = () => {
    modals.form({
      title: 'Add person',
      defaultValues: {
        name: '',
        email: '',
      },
      schema,
      fields: {
        submit: {
          children: 'Save',
        },
      },
      onSubmit: async (contact) => {
        try {
          await createContactMutation.mutateAsync({
            workspaceId: workspace.id,
            ...contact,
            type: type ?? 'lead',
            status: 'new',
          })
          modals.closeAll()
        } catch {
          snackbar.error({
            title: 'Could not create contact',
          })
        }
      },
    })
  }

  const addCommand = useHotkeysShortcut('contacts.add', addPerson)

  const visibleColumns = userSettings.contactsColumns ?? [
    'name',
    'email',
    'createdAt',
    'type',
    'status',
  ]

  const displayProperties = (
    <ToggleButtonGroup
      type="checkbox"
      isAttached={false}
      size="xs"
      spacing="0"
      flexWrap="wrap"
      value={visibleColumns}
      onChange={(value) => setUserSettings('contactsColumns', value)}
    >
      {columns.map((col) => {
        if ('accessorKey' in col && col.enableHiding !== false) {
          const id = col.id || col.accessorKey
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
        }
        return null
      })}
    </ToggleButtonGroup>
  )

  const groupBySelect = (
    <Select
      name="groupBy"
      value={userSettings.contactsGroupBy}
      onChange={(value) => setUserSettings('contactsGroupBy', value)}
      size="xs"
    >
      <SelectButton>Status</SelectButton>
      <Portal>
        <SelectList zIndex="dropdown">
          <SelectOption value="status">Status</SelectOption>
          <SelectOption value="type">Type</SelectOption>
          <SelectOption value="tags">Tag</SelectOption>
        </SelectList>
      </Portal>
    </Select>
  )

  const primaryAction = (
    <ToolbarButton
      label="Add person"
      variant="primary"
      onClick={addPerson}
      tooltipProps={{
        label: (
          <>
            Add a person <Command>{addCommand}</Command>
          </>
        ),
      }}
    />
  )

  const toolbar = (
    <Toolbar size="sm">
      <InlineSearch
        placeholder="Search by name or email..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onReset={() => setSearchQuery('')}
      />
      {primaryAction}
    </Toolbar>
  )

  const tabbar = (
    <Toolbar>
      <ContactTypes />
      <AddFilterButton />
      <Spacer />
      <ToggleButtonGroup
        value={userSettings.contactsView}
        onChange={(value) => setUserSettings('contactsView', value)}
        type="radio"
        size="xs"
        width="auto"
      >
        <ToggleButton value="list">
          <LuList />
        </ToggleButton>
        <ToggleButton value="board">
          <LuGrid2X2 />
        </ToggleButton>
      </ToggleButtonGroup>
      <Menu isLazy>
        <MenuButton
          as={ToolbarButton}
          leftIcon={<LuSlidersHorizontal />}
          label="Display"
          size="xs"
          variant="secondary"
        />

        <MenuList maxW="260px" zIndex="dropdown">
          {
            /* not supported by DataGrid */ userSettings.contactsView ===
            'board' ? (
              <MenuProperty label="Group by" value={groupBySelect} />
            ) : null
          }
          <MenuProperty
            label="Display properties"
            value={displayProperties}
            orientation="vertical"
          />
        </MenuList>
      </Menu>
    </Toolbar>
  )

  let defaultFilters: Filter[] = []

  if (params?.tag) {
    defaultFilters = [{ id: 'tags', operator: 'contains', value: params.tag }]
  }

  const emptyState = (
    <EmptyState
      title="No people added yet"
      description="Add a person or import data to get started."
      colorScheme="primary"
      icon={LuSquareUser}
      actions={
        <>
          <Button colorScheme="primary" variant="solid" onClick={addPerson}>
            Add a person
          </Button>
          <Button>Import data</Button>
        </>
      }
    />
  )

  const board: ListPageProps<ContactDTO>['board'] = {
    header: (header) => <ContactBoardHeader {...header} />,
    card: (row) => <ContactCard contact={row.original} />,
    groupBy: userSettings.contactsGroupBy,
    onCardDragEnd: ({ items, to, from }) => {
      // This is a bare minimum example, you likely need more logic for updating the sort order and changing tags.

      // Get the contact data
      const contact = data?.contacts.find(
        ({ id }) => id === items[to.columnId]?.[to.index],
      )

      const [field, toValue] = (to.columnId as string).split(':') as [
        keyof ContactDTO,
        string,
      ]
      const [, prevValue] = (from.columnId as string).split(':')

      if (!contact) {
        throw new Error('Contact not found')
      }

      const prevId = items[to.columnId]?.[to.index - 1]
      let prevContact = data?.contacts.find(({ id }) => id === prevId)

      const nextId = items[to.columnId]?.[to.index + 1]
      let nextContact = data?.contacts.find(({ id }) => id === nextId)

      if (prevContact && !nextContact) {
        // last in the column
        nextContact =
          data?.contacts[
            data?.contacts.findIndex(({ id }) => id === prevId) + 1
          ]
      } else if (!prevContact && !nextContact) {
        // first in the column
        prevContact =
          data?.contacts[
            data?.contacts.findIndex(({ id }) => id === prevId) - 1
          ]
      }

      const prevSortOrder = prevContact?.sortOrder || 0
      const nextSortOrder = nextContact?.sortOrder || data?.contacts.length || 0

      const sortOrder = (prevSortOrder + nextSortOrder) / 2 || to.index

      let value: string | string[] = toValue
      // if the field is an array, we replace the old value
      if (Array.isArray(contact[field])) {
        value = (value !== '' ? [value] : []).concat(
          (contact[field] as string[]).filter((v) => v !== prevValue),
        )
      }

      updateContactMutation.mutateAsync({
        workspaceId: workspace.id,
        id: contact.id,
        [field]: value,
        sortOrder,
      })
    },
  }

  return (
    <ListPage<ContactDTO>
      title="Contacts"
      toolbar={toolbar}
      tabbar={tabbar}
      bulkActions={bulkActions}
      filters={filters}
      defaultFilters={defaultFilters}
      searchQuery={searchQuery}
      emptyState={emptyState}
      columns={columns}
      visibleColumns={visibleColumns}
      data={data?.contacts ?? []}
      isLoading={isLoading}
      view={userSettings.contactsView}
      board={board}
      initialState={{
        pagination: {
          pageSize: 20,
        },
        columnPinning: {
          left: ['selection', 'name'],
          right: ['action'],
        },
      }}
    />
  )
}
