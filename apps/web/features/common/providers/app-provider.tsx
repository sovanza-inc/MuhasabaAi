'use client'

import * as React from 'react'

import { ColorMode, localStorageManager } from '@chakra-ui/react'
import { FeaturesProvider } from '@saas-ui-pro/feature-flags'
import { SaasProvider } from '@saas-ui/react'
import { getCookie, setCookie } from 'cookies-next'
import { IconContext } from 'react-icons'

import { segments } from '@acme/config'
import { Link } from '@acme/next'
import { theme } from '@acme/theme'
import { ModalsProvider } from '@acme/ui/modals'

import { appHotkeys } from '#config/hotkeys.config'

import { Hotkeys } from '../components/hotkeys'

/**
 * We use a custom color mode manager to sync the color mode
 * value with the cookie value. This will prevent any flash
 * of color mode mismatch when the page loads.
 */
type StorageManager = typeof localStorageManager
const colorModeManager: StorageManager = {
  type: 'cookie',
  ssr: true,
  get: (initialColorMode?: ColorMode): ColorMode | undefined => {
    const storedColorMode = getCookie('chakra-ui-color-mode') as
      | ColorMode
      | undefined

    return storedColorMode ? storedColorMode : initialColorMode
  },
  set: (value: string) => {
    setCookie('chakra-ui-color-mode', value, {
      maxAge: 31536000,
      path: '/',
    })
  },
}

export interface AppProviderProps {
  onError?: (error: Error, info: any) => void
  initialColorMode?: ColorMode
  children: React.ReactNode
}

export const AppProvider: React.FC<AppProviderProps> = (props) => {
  const { onError, initialColorMode, children } = props

  return (
    <IconContext.Provider value={{ className: 'react-icon', size: '1.1em' }}>
      <SaasProvider
        linkComponent={Link}
        onError={onError}
        theme={{
          ...theme,
          config: {
            ...theme.config,
            initialColorMode,
          },
        }}
        colorModeManager={colorModeManager}
        toastOptions={{
          defaultOptions: {
            position: 'bottom-right',
          },
        }}
      >
        <FeaturesProvider value={segments}>
          <Hotkeys hotkeys={appHotkeys}>
            <ModalsProvider>{children}</ModalsProvider>
          </Hotkeys>
        </FeaturesProvider>
      </SaasProvider>
    </IconContext.Provider>
  )
}
