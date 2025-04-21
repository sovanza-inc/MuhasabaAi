'use client'

import React from 'react'
import { QuestionnaireFlow } from './QuestionnaireFlow'

export function QuestionnaireContainer() {
  React.useEffect(() => {
    console.log('QuestionnaireContainer mounted')
  }, [])
  
  return <QuestionnaireFlow />
} 