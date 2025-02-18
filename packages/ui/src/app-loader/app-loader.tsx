'use client'

import { keyframes } from '@emotion/react'
import { LoadingOverlay, LoadingOverlayProps } from '@saas-ui/react'

import { LogoIcon } from '../logo/logo'

const scale = keyframes`
  0% {
    scale: 1;
  }
  100% {
    scale: 1.3;
  }
`

/**
 * Show a fullscreen loading animation while the app is loading.
 */
export const AppLoader: React.FC<LoadingOverlayProps> = (props) => {
  return (
    <LoadingOverlay {...props} variant="fullscreen">
      <LogoIcon boxSize="6" animation={`5s ease-out ${scale}`} opacity="0.8" />
    </LoadingOverlay>
  )
}
