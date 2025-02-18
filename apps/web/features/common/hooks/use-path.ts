import React from 'react'

import { Route } from 'next'

import { useWorkspace } from './use-workspace'

/**
 * Returns the path including the app base path and workspace.
 * @param path
 * @returns string The router path
 */
export const usePath = <Path extends string>(path: Path) => {
  const workspace = useWorkspace()
  return React.useMemo(
    () => `/${workspace}/${path}`.replace(/\/\//, '/').replace(/\/$/, ''),
    [path, workspace],
  ) as Route<`${string}/${Path}`>
}
