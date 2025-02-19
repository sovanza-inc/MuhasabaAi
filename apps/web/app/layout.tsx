import * as React from 'react'

import '@fontsource/lato/100.css'
import '@fontsource/lato/300.css'
import '@fontsource/lato/400.css'
import '@fontsource/lato/700.css'
import '@fontsource/lato/900.css'

import { Metadata } from 'next'
import { cookies } from 'next/headers'

import { UserSettings } from '#lib/user-settings/user-settings'

import { Provider } from './provider'
import { Script } from './script'

// Exporting

export const metadata: Metadata = {
  title: {
    template: "%s | Muhasaba AI",
    default: "Muhasaba AI",
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
    'light') as 'light' | 'dark'

  return (
    <html data-theme={colorMode} style={{ colorScheme: colorMode, fontFamily: 'Lato, sans-serif' }}>
      <body className={`chakra-ui-${colorMode}`}>
        <Script colorMode={colorMode} />
        <Provider initialColorMode={colorMode}>{children}</Provider>

        <UserSettings />
      </body>
    </html>
  )
}
