import React from 'react'

import { useLocalStorageValue } from '@react-hookz/web'
import { useParams } from 'next/navigation'

/**
 * Get the current workspace from localStorage if available.
 * The value is synced with the query params.
 *
 * @returns {string} The current workspace
 */
export const useWorkspace = () => {
  const params = useParams()

  const workspace = params.workspace?.toString() || ''

  const activeWorkspace = useLocalStorageValue('app.workspace', {
    defaultValue: workspace,
    initializeWithValue: false,
  })

  React.useEffect(() => {
    if (workspace && workspace !== activeWorkspace.value) {
      activeWorkspace.set(workspace)
    }
  }, [workspace, activeWorkspace])

  return activeWorkspace.value ?? workspace
}
