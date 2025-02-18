import { StackDivider, SystemProps, VStack } from '@chakra-ui/react'
import {
  Page,
  PageBody,
  PageHeader,
  PageHeaderProps,
  PageProps,
} from '@saas-ui-pro/react'

interface SettingsPageProps
  extends PageProps,
    Pick<PageHeaderProps, 'title' | 'description' | 'toolbar'> {
  children: React.ReactNode
  contentWidth?: SystemProps['width']
}

/**
 * SettingsPage
 *
 * Use this component as a base for your settings pages.
 */
export const SettingsPage = (props: SettingsPageProps) => {
  const { children, title, description, toolbar, contentWidth, ...rest } = props

  return (
    <Page
      variant="settings"
      mt={[14, null, 0]}
      bg="page-body-bg-subtle"
      {...rest}
    >
      <PageHeader
        title={title}
        description={description}
        toolbar={toolbar}
        maxW={contentWidth}
        margin="0 auto"
        width="full"
      />
      <PageBody contentWidth={contentWidth}>
        <VStack divider={<StackDivider />} align="stretch" spacing={8} pb="16">
          {children}
        </VStack>
      </PageBody>
    </Page>
  )
}
