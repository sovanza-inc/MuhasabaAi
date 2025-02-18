import * as React from 'react'

import { Route } from 'next'
import { useParams, useRouter } from 'next/navigation'

import { SegmentedControl } from '@acme/ui/segmented-control'

import { usePath } from '#features/common/hooks/use-path'

const types = [
  {
    id: 'all',
    label: 'All',
    href: '/',
  },
  {
    id: 'leads',
    label: 'Leads',
    href: '/leads',
  },
  {
    id: 'customers',
    label: 'Customers',
    href: '/customers',
  },
]

const segments = types.map((type) => ({ id: type.id, label: type.label }))

export const ContactTypes = () => {
  const { push } = useRouter()
  const params = useParams()

  const basePath = usePath('/contacts')

  const type = params?.type?.toString() || 'all'

  const [value, setValue] = React.useState(type)

  React.useEffect(() => {
    setValue(type)
  }, [type])

  const getType = (id?: string) => {
    const type = types.find((type) => type.id === id)
    return type || types[0]
  }

  const setType = (id: string) => {
    const type = getType(id)

    if (!type) return

    push((basePath + type.href) as Route)
    setValue(type.id)
  }

  return (
    <SegmentedControl
      segments={segments}
      value={value}
      onChange={setType}
      size="xs"
    />
  )
}
