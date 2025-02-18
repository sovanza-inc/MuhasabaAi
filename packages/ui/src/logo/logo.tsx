import { Box, FlexProps, HTMLChakraProps } from '@chakra-ui/react'
import { SaasUIIcon, SaasUILogo } from '@saas-ui/assets'

export const Logo = (props: FlexProps) => {
  return <Box as={SaasUILogo} width="160px" {...props} />
}

export const LogoIcon = (props: HTMLChakraProps<'svg'>) => {
  return <Box as={SaasUIIcon} color="primary.500" {...props} />
}
