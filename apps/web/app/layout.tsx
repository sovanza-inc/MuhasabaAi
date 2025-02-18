import * as React from 'react'

import '@fontsource-variable/inter'
import { Metadata } from 'next'
import { cookies } from 'next/headers'

import { UserSettings } from '#lib/user-settings/user-settings'

import { Provider } from './provider'
import { Script } from './script'

export const metadata: Metadata = {
  title: {
    template: '%s | Saas UI',
    default: 'Saas UI',
  },
  icons: {
    icon: '/favicons/favicon-32x32.png',
    apple: '/favicons/apple-touch-icon.png',
  },
}

export default async function AppRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()

  const colorMode = (cookieStore.get('chakra-ui-color-mode')?.value ??
    'dark') as 'light' | 'dark'

  return (
    <html data-theme={colorMode} style={{ colorScheme: colorMode }}>
      <body className={`chakra-ui-${colorMode}`}>
        <Script colorMode={colorMode} />
        <Provider initialColorMode={colorMode}>{children}</Provider>

        <UserSettings />
      </body>
    </html>
  )
}
