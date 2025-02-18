import * as React from 'react'

import { forwardRef } from '@chakra-ui/react'
import {
  SearchInput as BaseSearchInput,
  SearchInputProps,
} from '@saas-ui/react'
import { LuSearch, LuX } from 'react-icons/lu'

export type { SearchInputProps }

/**
 * SearchInput with Feather icons.
 */
export const SearchInput = forwardRef<SearchInputProps, 'input'>(
  (props, ref) => {
    return (
      <BaseSearchInput
        ref={ref}
        icon={<LuSearch size="1.2em" />}
        resetIcon={<LuX size="1.6em" />}
        {...props}
      />
    )
  },
)
