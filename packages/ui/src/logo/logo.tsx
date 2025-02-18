import { FlexProps, Image, ImageProps, useColorMode } from '@chakra-ui/react'

export const Logo = (props: FlexProps) => {
  const { colorMode } = useColorMode()
  const logoSrc = colorMode === 'dark' ? '/img/onboarding/logo.svg' : '/img/onboarding/logo.svg'
  return <Image src={logoSrc} alt="Muhasaba AI" width="160px" {...props} />
}

export const LogoIcon = (props: ImageProps) => {
  const { colorMode } = useColorMode()
  const logoSrc = colorMode === 'dark' ? '/img/onboarding/logo.svg' : '/img/onboarding/logo.svg'
  return <Image src={logoSrc} alt="Muhasaba AI" {...props} />
}
