import { useCallback } from 'react'
import { api } from '../lib/api.js'
import { useApiResource } from './useApiResource.js'

export function useInsurance() {
  const fetcher = useCallback(() => api.get('/insurance'), [])
  return useApiResource(fetcher, [])
}
