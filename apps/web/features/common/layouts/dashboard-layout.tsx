'use client'

import { AppSidebar } from '../components/sidebar'
import { RestrictedLayout } from './restricted-layout'
import type { AppLayoutProps } from './app-layout'

/**
 * Default dashboard layout.
 */
export const DashboardLayout: React.FC<AppLayoutProps> = ({
  children,
  ...rest
}) => {
  return (
    <RestrictedLayout sidebar={<AppSidebar />} {...rest}>
      {children}
    </RestrictedLayout>
  )
}
