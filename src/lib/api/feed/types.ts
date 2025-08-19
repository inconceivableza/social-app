import { AppFoodiosFeedDefs } from '@atproto/api'

export interface FeedAPIResponse {
  cursor?: string
  feed: AppFoodiosFeedDefs.FeedViewPost[]
}

export interface FeedAPI {
  peekLatest(): Promise<AppFoodiosFeedDefs.FeedViewPost>
  fetch({
    cursor,
    limit,
  }: {
    cursor: string | undefined
    limit: number
  }): Promise<FeedAPIResponse>
}

export interface ReasonFeedSource {
  $type: 'reasonFeedSource'
  uri: string
  href: string
}

export function isReasonFeedSource(v: unknown): v is ReasonFeedSource {
  return (
    !!v &&
    typeof v === 'object' &&
    '$type' in v &&
    v.$type === 'reasonFeedSource'
  )
}
