import { I18nProvider } from '@acme/i18n'

import { AuthProvider } from '#features/auth/auth-provider'
import { AppProvider } from '#features/common/providers/app-provider'
import { TRPCProvider } from '#lib/trpc/trpc-provider'

/**
 * This is the root context provider for the application.
 * You can add context providers here that should be available to all pages.
 */
export function Provider({
  children,
  initialColorMode,
}: {
  children: React.ReactNode
  initialColorMode: 'light' | 'dark'
}) {
  return (
    <I18nProvider>
      <TRPCProvider>
        <AuthProvider>
          <AppProvider initialColorMode={initialColorMode}>
            {children}
          </AppProvider>
        </AuthProvider>
      </TRPCProvider>
    </I18nProvider>
  )
}
