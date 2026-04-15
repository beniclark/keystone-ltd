import { useCallback } from 'react'
import { api } from '../lib/api.js'
import { useApiResource } from './useApiResource.js'

const initialProfile = {
  netWorth: 0,
  netWorthDelta: 0,
  advisor: { name: '', title: '', nextReview: '' },
  netWorthSeries: [],
  allocation: [],
}

export function useProfile() {
  const fetcher = useCallback(() => api.get('/profile'), [])
  return useApiResource(fetcher, initialProfile)
}
