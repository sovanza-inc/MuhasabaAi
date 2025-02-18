import React from 'react'

import { Card, CardBody, HStack, Heading, Stack, Text } from '@chakra-ui/react'
import { PersonaAvatar } from '@saas-ui/react'
import Link from 'next/link'

import { ContactDTO } from '@acme/api/types'
import { useDataBoardContext } from '@acme/ui/data-board'

import { usePath } from '#features/common/hooks/use-path'

import { ContactStatus } from '../common/contact-status'
import { ContactTag } from '../common/contact-tag'
import { ContactType } from '../common/contact-type'

export const ContactCard = ({ contact }: { contact: ContactDTO }) => {
  const path = usePath(`/contacts/view/${contact.id}`)

  const grid = useDataBoardContext()

  const state = grid.getState()
  const columns = state.columnVisibility
  const groupBy = state.grouping[0]

  const renderColumn = React.useCallback(
    (column: string, component: React.ReactNode) => {
      if (columns[column] && groupBy != column) {
        return component
      }
      return null
    },
    [columns, groupBy],
  )

  const tags = typeof contact.tags === 'string' ? [contact.tags] : contact.tags

  return (
    <Card
      as={Link}
      prefetch={
        false
      } /* This is a performance optimization to make sure Next.js doesn't start prefetching 100s of contacts */
      href={path}
      position="relative"
      w="full"
      userSelect="none"
      _hover={{
        textDecoration: 'none',
        bg: 'gray.50',
        _dark: {
          bg: 'whiteAlpha.100',
        },
      }}
      sx={{
        WebkitUserDrag: 'none',
      }}
    >
      <CardBody as={Stack} spacing="4" position="relative">
        <Stack justifyContent="flex-start" spacing="2">
          <Stack spacing="1">
            <HStack>
              {renderColumn(
                'status',
                <ContactStatus
                  status={contact.status}
                  hideLabel
                  position="absolute"
                  top="4"
                  right="4"
                />,
              )}
              <PersonaAvatar
                name={contact.name ?? undefined}
                src={contact.avatar ?? undefined}
                size="2xs"
              />
              <Heading as="h4" size="2xs" fontWeight="medium">
                {contact.name}
              </Heading>
            </HStack>
            {renderColumn(
              'email',
              <Text color="muted" noOfLines={1}>
                {contact.email}
              </Text>,
            )}
          </Stack>
        </Stack>
        <HStack>
          {renderColumn('type', <ContactType type={contact.type} size="sm" />)}
          {renderColumn(
            'tags',
            tags?.map((tag) => <ContactTag key={tag} tag={tag} size="sm" />),
          )}
        </HStack>
      </CardBody>
    </Card>
  )
}
