import { Badge, BadgeProps, HStack, Text } from '@chakra-ui/react'
import { useSplitPage } from '@saas-ui-pro/react'
import {
  PersonaAvatar,
  StructuredList,
  StructuredListButton,
  StructuredListCell,
  StructuredListItem,
  StructuredListItemProps,
  StructuredListProps,
} from '@saas-ui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { NotificationDTO } from '@acme/api/types'
import { useActivePath } from '@acme/next'
import { DateTimeSince } from '@acme/ui/date-time'

import { usePath } from '#features/common/hooks/use-path'
import { api } from '#lib/trpc/react'

const UnreadBadge: React.FC<BadgeProps> = (props) => {
  return (
    <Badge
      boxSize="2"
      borderRadius="full"
      bg={`${props.colorScheme ?? 'primary'}.500`}
      p="0"
      {...props}
    />
  )
}

export interface InboxListProps extends StructuredListProps {
  items: any[]
}

export const InboxList: React.FC<InboxListProps> = (props) => {
  const { items = [], ...rest } = props
  return (
    <StructuredList variant="rounded" {...rest}>
      {items.map((item: any, i) => (
        <InboxListItem key={i} item={item} />
      ))}
    </StructuredList>
  )
}

interface InboxListItemProps extends StructuredListItemProps {
  item: NotificationDTO
}

const InboxListItem: React.FC<InboxListItemProps> = (props) => {
  const { item, ...rest } = props
  const path = usePath(`inbox/${item.id}`)
  const { push } = useRouter()
  const { onOpen } = useSplitPage()

  const color = !item.readAt ? 'app-text' : 'muted'

  const isActive = useActivePath(path)

  return (
    <StructuredListItem p="0" {...rest}>
      <StructuredListButton
        as={Link}
        href={path}
        onClick={() => {
          push(path)
          onOpen()
        }}
        data-active={isActive === true ? '' : undefined}
      >
        <StructuredListCell width="2" alignSelf="start">
          {!item.readAt ? <UnreadBadge mt="-3px" /> : null}
        </StructuredListCell>
        <StructuredListCell
          flex="1"
          color={color}
          display="flex"
          flexDirection="column"
          gap="2"
        >
          <HStack alignItems="center">
            <Text noOfLines={1} flex="1">
              {item.subject?.name}
            </Text>
            <DateTimeSince
              date={new Date(item.createdAt)}
              format="short"
              color="muted"
              fontSize="sm"
              flexShrink="0"
            />
          </HStack>
          <HStack>
            <ActorAvatar item={item} /> <Message item={item} />
          </HStack>
        </StructuredListCell>
      </StructuredListButton>
    </StructuredListItem>
  )
}

const ActorAvatar = ({ item }: { item: NotificationDTO }) => {
  const actor = useActor(item.actorId)

  return actor ? (
    <PersonaAvatar
      name={actor?.name ?? undefined}
      src={actor?.avatar ?? undefined}
      size="2xs"
    />
  ) : null
}

const useActor = (id: string | null) => {
  const utils = api.useUtils()

  if (!id) {
    return null
  }

  return utils.workspaces.bySlug.getData()?.members.find((m) => m.id === id)
}

/**
 * @important dangerouslySetInnerHTML is used here to render the comment,
 * this is because the comment can contain HTML tags.
 *
 * You should make sure to sanitize the HTML before rendering it.
 *
 * @see https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml
 */
const Message = ({ item }: { item: NotificationDTO }) => {
  let message = ''
  const tags = Array.isArray(item.metadata?.tags) ? item.metadata?.tags : []

  const actor = useActor(item.actorId)

  if (item.type === 'comment' && item.metadata?.comment) {
    return (
      <Text fontSize="sm" noOfLines={2}>
        <Text as="span" color="inherit">
          {actor?.name}
        </Text>{' '}
        —{' '}
        <Text
          as="span"
          color="muted"
          wordBreak="break-all"
          dangerouslySetInnerHTML={{ __html: item.metadata.comment }}
        />
      </Text>
    )
  }

  switch (item.type) {
    case 'action':
      switch (item.metadata?.action) {
        case 'created-contact':
          message = 'created contact'
      }
      break
    case 'update':
      message = `updated ${item.metadata?.field} to ${item.metadata?.value}`
      break
    case 'comment':
      message = 'left a comment'
      break
    case 'tags':
      message = 'updated tags to ' + tags?.join(', ')
      break
    case 'type':
      message = `changed type to ${item.metadata?.type}`
      break
    case 'status':
      message = `changed status to ${item.metadata?.status}`
  }

  return (
    <Text fontSize="sm" color="muted" noOfLines={2}>
      <Text as="span">{actor?.name}</Text> {message}
    </Text>
  )
}
