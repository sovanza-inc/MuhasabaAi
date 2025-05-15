'use client'

import React from 'react'
import { QuestionnaireFlow } from './QuestionnaireFlow'

interface QuestionnaireContainerProps {
  children?: React.ReactNode
}

export function QuestionnaireContainer({ children }: QuestionnaireContainerProps) {
  React.useEffect(() => {
    console.log('QuestionnaireContainer mounted')
  }, [])
  
  return (
    <QuestionnaireFlow>
      {children || <div />}
    </QuestionnaireFlow>
  )
} 