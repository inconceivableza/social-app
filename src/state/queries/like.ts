import {type ComAtprotoRepoStrongRef} from '@atproto/api'
import {useMutation} from '@tanstack/react-query'

import {useAgent} from '#/state/session'

export function useLikeMutation() {
  const agent = useAgent()
  return useMutation({
    mutationFn: async (subject: ComAtprotoRepoStrongRef.Main) => {
      const res = await agent.like(subject)
      return {uri: res.uri}
    },
  })
}

export function useUnlikeMutation() {
  const agent = useAgent()
  return useMutation({
    mutationFn: async ({uri}: {uri: string}) => {
      await agent.deleteLike(uri)
    },
  })
}
