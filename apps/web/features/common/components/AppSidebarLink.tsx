import { usePathname } from 'next/navigation'
import { useBankConnection } from '#features/bank-integrations/context/bank-connection-context'
import Link from 'next/link'
import { NavItem } from '@saas-ui/react'
import { HStack, Text, Badge, Tooltip } from '@chakra-ui/react'
import { IconType } from 'react-icons'

interface AppSidebarLinkProps {
  href: string
  label: string
  icon: IconType
  badge?: string | number
  isActive?: boolean
  hotkey?: string
}

export const AppSidebarLink = ({
  href,
  label,
  icon: Icon,
  badge,
  isActive,
  hotkey,
}: AppSidebarLinkProps) => {
  const pathname = usePathname()
  
  // Default to enabled state while loading
  let hasBankConnection = true
  let isLoading = true
  
  try {
    const bankConnectionData = useBankConnection()
    hasBankConnection = bankConnectionData.hasBankConnection
    isLoading = bankConnectionData.isLoading
  } catch (error) {
    console.error('Error accessing bank connection:', error)
    // If there's an error, we'll default to enabled state
    hasBankConnection = true
    isLoading = false
  }

  const isOnBankIntegrationsPage = pathname?.includes('/bank-integrations')
  const shouldDisable = !isLoading && !isOnBankIntegrationsPage && 
    (href.startsWith('/accounting') || href.startsWith('/reports')) && 
    !hasBankConnection

  const content = (
    <NavItem
      icon={<Icon />}
      isActive={isActive ?? pathname === href}
      opacity={shouldDisable ? 0.5 : 1}
      cursor={shouldDisable ? 'not-allowed' : 'pointer'}
      pointerEvents={shouldDisable ? 'none' : 'auto'}
    >
      <HStack spacing={2} flex={1}>
        <Text>{label}</Text>
        {badge && (
          <Badge colorScheme="blue" variant="solid" borderRadius="full">
            {badge}
          </Badge>
        )}
        {hotkey && (
          <Badge variant="outline" ml="auto">
            {hotkey}
          </Badge>
        )}
      </HStack>
    </NavItem>
  )

  return shouldDisable ? (
    <Tooltip label="Please connect a bank account first" placement="right">
      <span>{content}</span>
    </Tooltip>
  ) : (
    <Link href={href}>{content}</Link>
  )
} 