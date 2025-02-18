import { SettingsLayout } from '#features/settings/common/settings-layout'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SettingsLayout>{children}</SettingsLayout>
}
