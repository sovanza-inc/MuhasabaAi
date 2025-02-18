import { TabPanel, TabPanelProps } from '@chakra-ui/react'
import { ErrorBoundary } from '@saas-ui/react'

export const ContactTabPanel: React.FC<TabPanelProps> = (props) => {
  return (
    <TabPanel px="8" minH="full" {...props}>
      <ErrorBoundary>{props.children}</ErrorBoundary>
    </TabPanel>
  )
}
