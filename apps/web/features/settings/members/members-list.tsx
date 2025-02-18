import * as React from 'react'

import {
  Box,
  Button,
  Card,
  CardHeader,
  CardProps,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Tag,
  Text,
  useDisclosure,
} from '@chakra-ui/react'
import { useSearchQuery } from '@saas-ui-pro/react'
import { EmptyState, Field, FormLayout, Option } from '@saas-ui/react'
import {
  PersonaAvatar,
  StructuredList,
  StructuredListCell,
  StructuredListIcon,
  StructuredListItem,
} from '@saas-ui/react'
import without from 'lodash/without'
import { LuEllipsisVertical } from 'react-icons/lu'
import { z } from 'zod'

import {
  InviteData,
  InviteDialog,
  defaultMemberRoles,
} from '@acme/ui/invite-dialog'
import { useModals } from '@acme/ui/modals'
import { SearchInput } from '@acme/ui/search-input'

export interface Member {
  id: string
  email: string
  name?: string
  status?: 'invited' | 'active' | 'suspended'
  roles?: string | string[]
  presence?: string
}

const Roles = ({ roles }: { roles?: string | string[] }) => {
  if (!roles || !roles.length) {
    return null
  }

  if (typeof roles === 'string') {
    return <Tag size="sm">{roles}</Tag>
  }

  return (
    <>
      {roles?.map((role) => (
        <Tag key={role} size="sm">
          {role}
        </Tag>
      ))}
    </>
  )
}

interface MemberListItemProps<M> {
  member: M
  onRemove(member: M): void
  onResendInvite(member: M): void
  onCancelInvite(member: M): void
  onChangeRole(member: M): void
}
function MembersListItem<M extends Member = Member>({
  member,
  onRemove,
  onResendInvite,
  onCancelInvite,
  onChangeRole,
}: MemberListItemProps<M>) {
  let actions

  const isInvite = member.status === 'invited'
  const isOwner = member.roles?.includes('owner')

  if (isInvite) {
    actions = (
      <>
        <MenuItem onClick={() => onResendInvite?.(member)}>
          Resend invitation
        </MenuItem>
        <MenuItem onClick={() => onCancelInvite?.(member)}>
          Cancel invitation
        </MenuItem>
      </>
    )
  } else {
    actions = (
      <>
        <MenuItem onClick={() => onChangeRole?.(member)}>Change role</MenuItem>
        <MenuItem onClick={() => onRemove?.(member)}>Remove member</MenuItem>
      </>
    )
  }

  return (
    <StructuredListItem
      py="4"
      borderBottomWidth="1px"
      sx={{ '&:last-of-type': { borderWidth: 0 } }}
    >
      <StructuredListIcon>
        <PersonaAvatar
          name={member.name}
          presence={member.presence}
          size="xs"
        />
      </StructuredListIcon>
      <StructuredListCell flex="1">
        <Text size="sm" fontWeight="medium">
          {member.name || member.email}
        </Text>
        <Text color="muted" size="sm">
          {member.name ? member.email : null}
        </Text>
      </StructuredListCell>
      <StructuredListCell>
        <HStack>
          {isInvite ? (
            <Tag size="sm">{member.status}</Tag>
          ) : (
            <Roles roles={member.roles} />
          )}
        </HStack>
      </StructuredListCell>
      <StructuredListCell>
        <Box>
          <Menu>
            <MenuButton
              as={IconButton}
              icon={<LuEllipsisVertical />}
              size="xs"
              variant="ghost"
              isDisabled={isOwner}
            />
            <MenuList>{actions}</MenuList>
          </Menu>
        </Box>
      </StructuredListCell>
    </StructuredListItem>
  )
}

export interface MembersListProps<M> extends Omit<CardProps, 'children'> {
  allowInvite?: boolean
  inviteLabel?: string
  searchLabel?: string
  noResults?: string
  members: M[]
  roles?: Option[]
  isMultiRoles?: boolean
  onRemove(member: M): void
  onInvite(data: InviteData): Promise<any>
  onCancelInvite(member: M): Promise<any>
  onUpdateRoles(member: M, roles: string[]): Promise<any>
}

export function MembersList<M extends Member = Member>({
  allowInvite = true,
  inviteLabel = 'Invite people',
  searchLabel = 'Filter by name or email',
  noResults = 'No people found',
  members,
  roles = defaultMemberRoles,
  isMultiRoles = false,
  onRemove,
  onInvite,
  onCancelInvite,
  onUpdateRoles,
  ...cardProps
}: MembersListProps<M>) {
  const modals = useModals()
  const invite = useDisclosure()

  const { results, ...searchProps } = useSearchQuery<M>({
    items: members,
    fields: ['name', 'email'],
  })

  const onChangeRole = React.useCallback(
    (member: M) => {
      modals.form?.({
        title: 'Update roles',
        schema: z.object({
          roles: isMultiRoles ? z.array(z.string()) : z.string(),
        }),
        onSubmit: async ({ roles }) => {
          if (typeof roles === 'string') {
            roles = [roles]
          }

          await onUpdateRoles?.(member, roles)

          modals.closeAll()
        },
        defaultValues: {
          roles: isMultiRoles
            ? member.roles
            : without(member.roles, 'owner')?.[0],
        },
        fields: {
          submit: {
            children: 'Update',
          },
        },
        children: (
          <FormLayout>
            <Field name="roles" type="radio" options={defaultMemberRoles} />
          </FormLayout>
        ),
      })
    },
    [modals, isMultiRoles, onUpdateRoles],
  )

  return (
    <Card {...cardProps}>
      <CardHeader display="flex">
        <SearchInput
          placeholder={searchLabel}
          size="sm"
          {...searchProps}
          mr="2"
        />
        <Button
          onClick={invite.onOpen}
          isDisabled={!allowInvite}
          colorScheme="primary"
          variant="solid"
          flexShrink="0"
        >
          {inviteLabel}
        </Button>
      </CardHeader>
      {results?.length ? (
        <StructuredList py="0">
          {results.map((member, i) => (
            <MembersListItem<M>
              key={i}
              member={member}
              onRemove={onRemove}
              onResendInvite={({ email, roles }) =>
                onInvite({ emails: [email], role: roles?.[0] })
              }
              onCancelInvite={onCancelInvite}
              onChangeRole={onChangeRole}
            />
          ))}
        </StructuredList>
      ) : (
        <EmptyState title={noResults} size="sm" p="4" />
      )}
      <InviteDialog
        title={inviteLabel}
        onInvite={onInvite}
        isOpen={invite.isOpen}
        onClose={invite.onClose}
        roles={roles}
      />
    </Card>
  )
}
