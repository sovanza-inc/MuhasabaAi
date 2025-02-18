import 'server-only'

import { cache } from 'react'

import { cookies } from 'next/headers'

export const USER_SETTINGS_COOKIE = 'user-settings'

export const getUserSettings = cache(async function getUserSettings() {
  const cookieStore = await cookies()

  const userSettingsCookie = cookieStore.get(USER_SETTINGS_COOKIE)

  if (!userSettingsCookie) {
    return null
  }

  return JSON.parse(userSettingsCookie.value)
})
