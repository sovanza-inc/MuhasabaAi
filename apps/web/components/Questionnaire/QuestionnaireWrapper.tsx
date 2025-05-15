'use client'

import React from 'react'
import { QuestionnaireFlow } from './QuestionnaireFlow'

interface QuestionnaireWrapperProps {
  children: React.ReactNode
}

export function QuestionnaireWrapper({ children }: QuestionnaireWrapperProps) {
  React.useEffect(() => {
    console.log('QuestionnaireWrapper mounted')
  }, [])

  return (
    <div>
      <QuestionnaireFlow>{children}</QuestionnaireFlow>
    </div>
  )
} 