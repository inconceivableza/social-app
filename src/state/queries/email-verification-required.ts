import {useQuery} from '@tanstack/react-query'

import {PUBLIC_APPVIEW} from '#/lib/constants'

interface ServiceConfig {
  checkEmailConfirmed: boolean
}

export function useServiceConfigQuery() {
  return useQuery({
    queryKey: ['service-config'],
    queryFn: async () => {
      const res = await fetch(
        `${PUBLIC_APPVIEW}/xrpc/app.bsky.unspecced.getConfig`,
      )
      if (!res.ok) {
        return {
          checkEmailConfirmed: false,
        }
      }

      const json = await res.json()
      return json as ServiceConfig
    },
    staleTime: 5 * 60 * 1000,
  })
}
