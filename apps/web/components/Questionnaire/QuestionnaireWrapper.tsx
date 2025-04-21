'use client'

import React from 'react'
import { QuestionnaireFlow } from './QuestionnaireFlow'

export function QuestionnaireWrapper() {
  React.useEffect(() => {
    console.log('QuestionnaireWrapper mounted')
  }, [])

  return (
    <div>
      <QuestionnaireFlow />
    </div>
  )
} 