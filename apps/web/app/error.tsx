'use client'

import { Button } from '@chakra-ui/react'
import { ErrorPage } from '@saas-ui-pro/react'
import { useRouter } from 'next/navigation'
import { LuFrown } from 'react-icons/lu'

export default function Error() {
  const router = useRouter()

  return (
    <ErrorPage
      title="Oops something went wrong"
      description="It's not you, it's us. Please try again later."
      icon={LuFrown}
      h="$100vh"
      actions={
        <>
          <Button colorScheme="primary" onClick={() => router.back()}>
            Go back
          </Button>
          <Button onClick={() => router.push('/app')}>Home</Button>
        </>
      }
    />
  )
}
