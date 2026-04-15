import { useCallback, useEffect, useState } from 'react'

export function useApiResource(fetcher, initialData) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetcher()
      setData(response)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [fetcher])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, refetch: load }
}
