import * as React from 'react'

import {
  Box,
  Button,
  Collapse,
  MenuItem,
  Stack,
  useDisclosure,
} from '@chakra-ui/react'
import { Aside, AsideHeader, AsideProps } from '@saas-ui-pro/react'
import { Persona, Property, PropertyList } from '@saas-ui/react'
import { LuChevronDown, LuChevronUp } from 'react-icons/lu'

import { ContactDTO } from '@acme/api/types'
import { DateTime } from '@acme/i18n'
import { OverflowMenu } from '@acme/ui/menu'

import { ContactStatus } from '../common/contact-status'
import { ContactType } from '../common/contact-type'
import { ContactTags } from './contact-tags'

export interface ContactSidebarProps extends AsideProps {
  contact?: ContactDTO | null
}

export const ContactSidebar: React.FC<ContactSidebarProps> = (props) => {
  const { contact, ...rest } = props

  return (
    <Aside
      defaultWidth={300}
      minWidth="200px"
      maxWidth={{ base: '80%', lg: '500px' }}
      position={{ base: 'absolute', lg: 'static' }}
      top="0"
      bottom="0"
      right="0"
      zIndex="docked"
      boxShadow="md"
      bg="white"
      _dark={{ bg: 'gray.800' }}
      borderLeftWidth="1px"
      isResizable
      size="lg"
      {...rest}
    >
      {contact ? (
        <>
          <AsideHeader flexDirection="column" alignItems="flex-start" gap="4">
            <Stack direction="row" w="full">
              <Persona
                flex="1"
                name={contact?.name || ''}
                size="sm"
                secondaryLabel={contact?.email}
              />
              <OverflowMenu>
                <MenuItem>Delete</MenuItem>
              </OverflowMenu>
            </Stack>
            <ContactType type={contact?.type} />
          </AsideHeader>
          <ContactDetails contact={contact} />
        </>
      ) : null}
    </Aside>
  )
}

const ContactDetails: React.FC<{ contact: ContactDTO }> = ({ contact }) => {
  const { isOpen, onToggle } = useDisclosure({
    defaultIsOpen: true,
  })

  return (
    <Box p="6" borderBottomWidth="1px">
      <Button
        variant="ghost"
        size="xs"
        fontSize="sm"
        onClick={onToggle}
        rightIcon={isOpen ? <LuChevronDown /> : <LuChevronUp />}
        color="muted"
        fontWeight="medium"
        ms="-2"
        mb="3"
      >
        Details
      </Button>
      <Collapse in={isOpen}>
        <PropertyList>
          <Property
            label="Status"
            value={<ContactStatus status={contact.status || 'new'} />}
          />
          {contact.createdAt && (
            <Property
              label="Signed up"
              value={<DateTime date={contact.createdAt} />}
            />
          )}
          <Property
            label="Tags"
            value={<ContactTags contact={contact} />}
            alignItems="flex-start"
            flexDirection="column"
            orientation="vertical"
          />
        </PropertyList>
      </Collapse>
    </Box>
  )
}
