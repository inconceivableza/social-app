import {type AppBskyFeedDefs, type BskyAgent} from '@atproto/api'

import {type FeedAPI, type FeedAPIResponse} from './types'

export class FollowingFeedAPI implements FeedAPI {

  constructor(private params: { agent: BskyAgent, filter?: string }) {
  }

  async peekLatest(): Promise<AppBskyFeedDefs.FeedViewPost> {
    const res = await this.params.agent.getFollowingFeed({
      limit: 1,
      filter: this.params.filter
    })
    return res.data.feed[0]
  }

  async fetch({
    cursor,
    limit,
  }: {
    cursor: string | undefined
    limit: number
  }): Promise<FeedAPIResponse> {
    const res = await this.params.agent.getFollowingFeed({
      filter: this.params.filter,
      cursor,
      limit,
    })
    if (res.success) {
      return {
        cursor: res.data.cursor,
        feed: res.data.feed,
      }
    }
    return {
      feed: [],
    }
  }
}
