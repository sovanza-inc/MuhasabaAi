import * as React from 'react'

import { Page, PageBody } from '@saas-ui-pro/react'

import { FullscreenLayout } from '#features/common/layouts/fullscreen-layout'

export interface OnboardingLayoutProps {
  isLoading?: boolean
  children: React.ReactNode
}

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = (props) => {
  const { children, ...pageProps } = props

  return (
    <FullscreenLayout>
      <Page {...pageProps} bg="page-body-bg-subtle">
        <PageBody contentWidth="full" position="relative">
          {children}
        </PageBody>
      </Page>
    </FullscreenLayout>
  )
}
