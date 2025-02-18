'use client'

import React from 'react'

import { AuthProvider as BaseAuthProvider } from '@saas-ui/auth-provider'

import { authService } from './auth-service'

export function AuthProvider(props: { children: React.ReactNode }) {
  return <BaseAuthProvider {...authService}>{props.children}</BaseAuthProvider>
}
