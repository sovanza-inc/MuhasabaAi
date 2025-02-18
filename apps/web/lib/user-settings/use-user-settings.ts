import { useLocalStorageValue } from '@react-hookz/web'
import { setCookie } from 'cookies-next'
import { z } from 'zod'

declare let global: {
  __USER_SETTINGS__?: UserSettings
}

const settingsSchema = z.object({
  sidebarWidth: z.number().default(280),
  inboxListWidth: z.number().default(280),
  contactsView: z.enum(['list', 'board']).default('board'),
  contactsColumns: z
    .array(z.string())
    .default(['name', 'email', 'createdAt', 'type', 'status']),
  contactsGroupBy: z.string().default('status'),
})

type UserSettings = z.infer<typeof settingsSchema>

const defaultSettings: UserSettings = {
  sidebarWidth: 280,
  inboxListWidth: 280,
  contactsView: 'list',
  contactsColumns: ['name', 'email', 'createdAt', 'type', 'status'],
  contactsGroupBy: 'status',
}

type SetUserSettings = <Key extends keyof UserSettings>(
  key: keyof UserSettings,
  value: UserSettings[Key],
) => void

export const useUserSettings = () => {
  const defaultValue = global.__USER_SETTINGS__ ?? defaultSettings

  const { value, set } = useLocalStorageValue<UserSettings>('user-settings', {
    defaultValue,
    stringify(data) {
      const settings = JSON.stringify(data)
      setCookie('user-settings', settings, {
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
        sameSite: 'lax',
      })
      return settings
    },
  })

  const setUserSettings: SetUserSettings = (key, value) => {
    set((prev) => settingsSchema.parse({ ...prev, [key]: value }))
  }

  return [value ?? defaultValue, setUserSettings] as const
}
