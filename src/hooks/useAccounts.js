import { useCallback } from 'react'
import { api } from '../lib/api.js'
import { useApiResource } from './useApiResource.js'

export function useAccounts() {
  const fetcher = useCallback(() => api.get('/accounts'), [])
  return useApiResource(fetcher, [])
}
