import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

// Define query keys for different data types
export const CACHE_KEYS = {
  ACCOUNTS: 'accounts',
  IDENTITY: 'identity',
  TRANSACTIONS: 'transactions',
  CASHFLOW: 'cashflow',
} as const

export const useApiCache = () => {
  const queryClient = useQueryClient()

  // Function to prefetch and cache data
  const prefetchData = useCallback(async (
    key: string,
    fetchFn: () => Promise<any>
  ) => {
    try {
      // Check if data already exists in cache
      const existingData = queryClient.getQueryData([key])
      if (existingData) {
        return existingData
      }

      // Fetch and cache the data
      const data = await fetchFn()
      
      // Set the data with specific caching options for this query key
      queryClient.setQueryData([key], data, {
        updatedAt: Date.now()
      })

      // Set specific options for this query key
      queryClient.setQueryDefaults([key], {
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        retry: false
      })

      return data
    } catch (error) {
      console.error(`Error prefetching ${key}:`, error)
      throw error
    }
  }, [queryClient])

  // Function to clear all cached data (used during logout)
  const clearCache = useCallback(() => {
    Object.values(CACHE_KEYS).forEach((key) => {
      queryClient.removeQueries({ queryKey: [key] })
    })
  }, [queryClient])

  // Function to get cached data
  const getCachedData = useCallback((key: string) => {
    return queryClient.getQueryData([key])
  }, [queryClient])

  return {
    prefetchData,
    clearCache,
    getCachedData,
    CACHE_KEYS
  }
} 