'use client'

import React from 'react'

import { useHotkeys } from '@saas-ui/react'
import { ReactQueryDevtools as Devtools } from '@tanstack/react-query-devtools'

export const ReactQueryDevtools = () => {
  const [showDevtools, setShowDevtools] = React.useState(true)

  /**
   * Toggle React Query devtools
   */
  useHotkeys('ctrl+shift+d', () => {
    setShowDevtools((prev) => !prev)
  })

  return showDevtools && <Devtools position="right" />
}
