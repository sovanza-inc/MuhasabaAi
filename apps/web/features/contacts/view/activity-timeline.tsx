import * as React from 'react'

import * as z from 'zod'
import {
  Box,
  ButtonGroup,
  Card,
  CardBody,
  HStack,
  Icon,
  MenuItem,
  Spacer,
  Text,
  TextProps,
  Tooltip,
  forwardRef,
  useClipboard,
} from '@chakra-ui/react'
import { Command, Toolbar, ToolbarButton } from '@saas-ui-pro/react'
import { User } from '@saas-ui/auth-provider'
import {
  FormLayout,
  Link,
  LinkProps,
  PersonaAvatar,
  SubmitButton,
  SubmitHandler,
  Timeline,
  TimelineContent,
  TimelineDot,
  TimelineIcon,
  TimelineItem,
  TimelineSeparator,
  TimelineTrack,
  UseFormReturn,
  useSnackbar,
} from '@saas-ui/react'
import { AnimatePresence, motion } from 'framer-motion'
import { LuPaperclip, LuTag } from 'react-icons/lu'

import { ActivityLogTypes } from '@acme/api/types'
import { DateTime, RelativeTime } from '@acme/i18n'
import { EditorField } from '@acme/ui/editor'
import { Form } from '@acme/ui/form'
import { LogoIcon } from '@acme/ui/logo'
import { OverflowMenu } from '@acme/ui/menu'
import { useModals } from '@acme/ui/modals'
import { StatusBadge } from '@acme/ui/status-badge'

type BaseActivity<
  Type,
  TData extends object = object,
  TUser = Partial<User>,
> = {
  id: string
  user?: TUser
  type: Type
  data: TData
  date: Date
}

type ActivityAction = BaseActivity<ActivityLogTypes.CONTACT_CREATED>
type ActivityUpdate = BaseActivity<
  ActivityLogTypes.CONTACT_UPDATED,
  { field: string; oldValue?: string; value?: string }
>
type ActivityComment = BaseActivity<
  ActivityLogTypes.COMMENT_ADDED,
  { comment: string }
>
type ActivityTags = BaseActivity<
  ActivityLogTypes.TAGS_UPDATED,
  { added?: string[]; removed?: string[] }
>

export type Activity =
  | ActivityAction
  | ActivityComment
  | ActivityUpdate
  | ActivityTags
export type Activities = Array<Activity>

export interface ActivityTimelineProps {
  activities: Activities
  currentUser: User
  onAddComment: SubmitHandler<Comment>
  onDeleteComment?(id: string | number): Promise<void>
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = (props) => {
  const { currentUser, activities, onAddComment, onDeleteComment } = props

  return (
    <Timeline maxW="container.xl" margin="0 auto">
      <AnimatePresence initial={false}>
        {activities?.map((activity) => {
          switch (activity.type) {
            case ActivityLogTypes.COMMENT_ADDED:
              return (
                <ActivityTimelineComment
                  key={activity.id}
                  {...activity}
                  onDelete={onDeleteComment}
                />
              )
            case ActivityLogTypes.CONTACT_UPDATED:
              return <ActivityTimelineUpdate key={activity.id} {...activity} />
            case ActivityLogTypes.TAGS_UPDATED:
              return <ActivityTimelineTags key={activity.id} {...activity} />
            case ActivityLogTypes.CONTACT_CREATED:
            default:
              return <ActivityTimelineAction key={activity.id} {...activity} />
          }
        })}

        <ActivityTimelineAddComment
          user={currentUser}
          onSubmit={onAddComment}
        />
      </AnimatePresence>
    </Timeline>
  )
}

interface ActivityTimelineItem {
  id?: string
  icon: React.ReactNode
  contentOffset?: string
  children: React.ReactNode
}

const ActivityTimelineItem: React.FC<ActivityTimelineItem> = (props) => {
  const { id, icon, contentOffset = '0', children } = props
  return (
    <TimelineItem
      as={motion.div}
      id={id}
      overflow="hidden"
      initial={{ opacity: 0, height: 0, minHeight: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0, minHeight: 0 }}
      role="group"
      sx={{
        '&:first-of-type .sui-timeline__track:first-of-type': { opacity: 0 },
      }}
    >
      <TimelineSeparator>
        <TimelineTrack flex="0" />
        <TimelineIcon>{icon}</TimelineIcon>
        <TimelineTrack />
      </TimelineSeparator>
      <TimelineContent ps="4" pt={contentOffset} gridColumnEnd={4}>
        {children}
      </TimelineContent>
    </TimelineItem>
  )
}

interface ActivityTimelineDate {
  date: Date
}

const ActivityTimelineDate: React.FC<ActivityTimelineDate> = (props) => {
  return (
    <Tooltip label={<DateTime date={props.date} />}>
      <ActivityText>
        <RelativeTime date={props.date} />
      </ActivityText>
    </Tooltip>
  )
}

const ActivityText = forwardRef<TextProps, 'span'>((props, ref) => {
  return <Text ref={ref} as="span" color="muted" {...props} />
})

const ActivityLink: React.FC<LinkProps> = (props) => {
  const snackbar = useSnackbar()

  const { onCopy } = useClipboard(props.href || '')
  return (
    <Link
      {...props}
      onClick={() => {
        onCopy()
        snackbar.info('Link copied to clipboard')
      }}
    />
  )
}

const ActivityUser: React.FC<TextProps & { user: Partial<User> }> = (props) => {
  const { user, ...rest } = props
  return (
    <ActivityText fontWeight="medium" color="app-text" {...rest}>
      {user.name || user.email || user.id}
    </ActivityText>
  )
}

const ActivitySystem = () => {
  return (
    <ActivityText color="app-text" fontWeight="medium">
      ACME
    </ActivityText>
  )
}

const ActivityActor = (props: { user?: Partial<User> }) => {
  return props.user ? <ActivityUser user={props.user} /> : <ActivitySystem />
}

const ActivityTimelineAction: React.FC<ActivityAction> = (props) => {
  const { id, user, date } = props

  const status = user?.status === 'active' ? 'online' : user?.status

  const avatar = user ? (
    <PersonaAvatar
      src={user.avatar}
      name={user.name}
      size="2xs"
      presence={status}
    />
  ) : (
    <LogoIcon boxSize="4" />
  )

  return (
    <ActivityTimelineItem id={`action-${id}`} icon={avatar}>
      <ActivityText>
        <ActivityActor user={user} /> created the contact.
      </ActivityText>{' '}
      <ActivityLink href={`#action-${id}`} color="muted">
        <ActivityTimelineDate date={date} />
      </ActivityLink>
    </ActivityTimelineItem>
  )
}

const ActivityTimelineTags: React.FC<ActivityTags> = (props) => {
  const { id, user, date, data } = props

  const added = data.added?.length ? (
    <>
      added tag <strong>{data.added.join(', ')}</strong>
    </>
  ) : null
  const removed = data.removed?.length ? (
    <>
      removed tag <strong>{data.removed.join(', ')}</strong>
    </>
  ) : null

  const messages =
    added && removed ? (
      <>
        {added} and {removed}
      </>
    ) : (
      added || removed
    )

  return (
    <ActivityTimelineItem id={`action-${id}`} icon={<Icon as={LuTag} />}>
      <ActivityText>
        <ActivityActor user={user} /> {messages}.
      </ActivityText>{' '}
      <ActivityLink href={`#action-${id}`} color="muted">
        <ActivityTimelineDate date={date} />
      </ActivityLink>
    </ActivityTimelineItem>
  )
}

interface UpdateIconProps {
  field: string
  value?: string
}

const UpdateIcon: React.FC<UpdateIconProps> = (props) => {
  switch (props.field) {
    case 'status':
      return <StatusBadge color={props.value} />
    default:
      return <TimelineDot />
  }
}

const ActivityTimelineUpdate: React.FC<ActivityUpdate> = (props) => {
  const { id, user, data, date } = props

  return (
    <ActivityTimelineItem id={`update-${id}`} icon={<UpdateIcon {...data} />}>
      <ActivityText>
        <ActivityActor user={user} /> changed {data.field} to {data.value}
        {data.oldValue && ` from ${data.oldValue}`}.
      </ActivityText>{' '}
      <ActivityLink href={`#update-${id}`} color="muted">
        <ActivityTimelineDate date={date} />
      </ActivityLink>
    </ActivityTimelineItem>
  )
}

interface ActivityTimelineCommentProps extends ActivityComment {
  onDelete?(id: string | number): Promise<void>
}

const ActivityTimelineComment: React.FC<ActivityTimelineCommentProps> = (
  props,
) => {
  const { id, user, data, date, onDelete } = props
  const modals = useModals()

  return (
    <ActivityTimelineItem
      id={`comment-${id}`}
      contentOffset="2"
      icon={
        <PersonaAvatar
          src={user?.avatar}
          name={user?.name}
          size="xs"
          presence={user?.presence}
        />
      }
    >
      <Card mb="4">
        <CardBody py="2" minWidth="320px">
          <HStack mb="4">
            <ActivityActor user={user} />
            <ActivityLink href={`#action-${id}`} color="muted">
              <ActivityTimelineDate date={date} />
            </ActivityLink>
            <ButtonGroup
              position="absolute"
              top="2"
              right="2"
              opacity="0"
              transition="all .2s ease-in"
              _groupHover={{ opacity: 1 }}
            >
              <OverflowMenu size="xs">
                <MenuItem
                  onClick={() =>
                    modals.confirm({
                      title: 'Are you sure you want to delete this comment?',
                      body: 'This action cannot be undone.',
                      confirmProps: { colorScheme: 'red' },
                      onConfirm: () => onDelete?.(id),
                    })
                  }
                >
                  Delete
                </MenuItem>
              </OverflowMenu>
            </ButtonGroup>
          </HStack>

          <Box
            dangerouslySetInnerHTML={{ __html: data.comment }}
            wordBreak="break-all"
          />
        </CardBody>
      </Card>
    </ActivityTimelineItem>
  )
}

const commentSchema = z.object({
  comment: z.string().min(1),
})

interface Comment {
  files?: FileList
  comment: string
}

interface ActivityTimelineAddCommentProps {
  onSubmit: SubmitHandler<Comment>
  user: User
}

const ActivityTimelineAddComment: React.FC<ActivityTimelineAddCommentProps> = (
  props,
) => {
  const { onSubmit, user } = props

  const formRef = React.useRef<UseFormReturn<any>>(null)
  const submitRef = React.useRef<HTMLButtonElement>(null)

  const [isFocused, setIsFocused] = React.useState(false)

  return (
    <TimelineItem>
      <TimelineSeparator>
        <TimelineTrack flex="0" />
        <TimelineIcon>
          <PersonaAvatar
            src={user.avatar}
            name={user.name}
            size="xs"
            presence={user.presence}
          />
        </TimelineIcon>
      </TimelineSeparator>
      <TimelineContent ps="4" pt="1" w="full">
        <Card
          py="3"
          px="4"
          data-focus={isFocused ? true : undefined}
          _focus={{
            boxShadow: 'md',
            borderColor: 'border.focused',
          }}
        >
          <Form
            schema={commentSchema}
            formRef={formRef}
            onSubmit={async (data) => {
              await onSubmit(data)

              formRef.current?.reset({
                comment: '',
              })
            }}
            mode="onSubmit"
          >
            <FormLayout spacing="0">
              <EditorField
                name="comment"
                border="0"
                padding="0"
                placeholder="Write your comment..."
                bg="transparent"
                minHeight="2rem"
                _dark={{
                  bg: 'transparent',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.metaKey) {
                    submitRef.current?.click()
                  }
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
              <Toolbar variant="ghost">
                <Spacer />
                <ToolbarButton
                  icon={<LuPaperclip />}
                  color="muted"
                  label="Upload a file"
                />
                <Tooltip
                  label={
                    <>
                      Submit comment <Command>⌘ enter</Command>
                    </>
                  }
                >
                  <SubmitButton ref={submitRef}>Comment</SubmitButton>
                </Tooltip>
              </Toolbar>
            </FormLayout>
          </Form>
        </Card>
      </TimelineContent>
    </TimelineItem>
  )
}
