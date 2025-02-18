'use client'

import { ErrorPage } from '@saas-ui-pro/react'
import { LuFolderSearch } from 'react-icons/lu'

import { FullscreenLayout } from '#features/common/layouts/fullscreen-layout'

export function WorkspaceNotFound() {
  return (
    <FullscreenLayout>
      <ErrorPage
        title="This workspace does not exist"
        icon={LuFolderSearch}
        h="$100vh"
      />
    </FullscreenLayout>
  )
}
