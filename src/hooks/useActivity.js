import { useCallback } from 'react'
import { api } from '../lib/api.js'
import { useApiResource } from './useApiResource.js'

export function useActivity() {
  const fetcher = useCallback(() => api.get('/activity'), [])
  return useApiResource(fetcher, [])
}
