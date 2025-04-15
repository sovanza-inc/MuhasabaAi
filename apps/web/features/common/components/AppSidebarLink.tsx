import { Link, NavItem } from '@saas-ui/react'
import { Badge, HStack, Text, Tooltip } from '@chakra-ui/react'
import { usePathname } from 'next/navigation'
import { useBankConnection } from '#features/bank-integrations/context/bank-connection-context'

interface AppSidebarLinkProps {
  href: string
  label: string
  icon: React.ComponentType
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
  const { hasBankConnection, initialCheckDone, isLoading } = useBankConnection()
  
  // Don't disable anything while loading
  if (isLoading) {
    return (
      <Link href={href}>
        <NavItem
          icon={<Icon />}
          isActive={isActive ?? pathname === href}
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
      </Link>
    )
  }

  const isOnBankIntegrationsPage = pathname?.includes('/bank-integrations')
  const shouldDisable = initialCheckDone && !isOnBankIntegrationsPage && 
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