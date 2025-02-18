import React, { useMemo } from 'react'

import { Text, useControllableState } from '@chakra-ui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'

import type { TagDTO } from '@acme/api/types'
import { SortableNavGroup, SortableNavItem } from '@acme/ui/sortable-nav-group'
import { TagColor } from '@acme/ui/tags-list'

import { usePath } from '../hooks/use-path'
import { useTags } from '../hooks/use-tags'

export const AppSidebarTags = () => {
  const queryClient = useQueryClient()
  const query = useParams()

  // @TODO implement this
  const userTags: Array<string> = useMemo(() => [], [])

  const tags = useTags()

  const mutation = useMutation({
    mutationFn: async (tags: Array<string>) => {
      /**
       * This just updates the local cache, you should also update the server.
       */
      queryClient.setQueryData<any>(
        ['CurrentUser'],
        (data: { currentUser: any }) => ({
          currentUser: {
            ...data.currentUser,
            workspace: {
              ...data?.currentUser?.workspace,
              tags,
            },
          },
        }),
      )
    },
  })

  const getSortedTags = React.useCallback(
    (tags: TagDTO[]) => {
      return userTags
        .map((id) => tags.find((tag) => tag.id === id))
        .filter(Boolean) as TagDTO[]
    },
    [userTags],
  )

  const [sortedTags, setTags] = useControllableState<TagDTO[]>({
    defaultValue: getSortedTags(tags || []),
    onChange(tags) {
      if (sortedTags.length) {
        mutation.mutate(tags.map(({ id }) => id))
      }
    },
  })

  const basePath = usePath(`/tag/`)

  if (!sortedTags.length) {
    return null
  }

  return (
    <SortableNavGroup
      title="Tags"
      isCollapsible
      items={sortedTags}
      onSorted={setTags}
    >
      {sortedTags.map((tag) => (
        <SortableNavItem
          key={tag.id}
          id={tag.id}
          my="0"
          href={`${basePath}/${tag.id}`}
          isActive={query.tag === tag.id}
          icon={<TagColor color={tag.color ?? undefined} />}
        >
          <Text>{tag.name}</Text>
        </SortableNavItem>
      ))}
    </SortableNavGroup>
  )
}
