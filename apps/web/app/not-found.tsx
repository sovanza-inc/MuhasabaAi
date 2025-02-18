'use client'

import { Button } from '@chakra-ui/react'
import { ErrorPage } from '@saas-ui-pro/react'
import { useRouter } from 'next/navigation'
import { LuFrown } from 'react-icons/lu'

export default function NotFound() {
  const router = useRouter()

  return (
    <ErrorPage
      title="Page not found"
      description="Where do you want to go?"
      icon={LuFrown}
      h="$100vh"
      actions={
        <>
          <Button colorScheme="primary" onClick={() => router.back()}>
            Go back
          </Button>
          <Button onClick={() => router.push('/')}>Home</Button>
        </>
      }
    />
  )
}
