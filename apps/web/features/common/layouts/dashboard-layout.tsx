'use client'

import { AppSidebar } from '../components/sidebar'
import { AppLayout, AppLayoutProps } from './app-layout'

/**
 * Default dashboard layout.
 */
export const DashboardLayout: React.FC<AppLayoutProps> = ({
  children,
  ...rest
}) => {
  return (
    <AppLayout sidebar={<AppSidebar />} {...rest}>
      {children}
    </AppLayout>
  )
}
