import { type AppBskyFeedDefs, type BskyAgent } from '@atproto/api'

import { type FeedAPI, type FeedAPIResponse } from './types'

export class EverythingFeedAPI implements FeedAPI {

    constructor(private params: { agent: BskyAgent, filter?: string }) {}

    async peekLatest(): Promise<AppBskyFeedDefs.FeedViewPost> {
        const res = await this.params.agent.getEverythingFeed({
            filter: this.params.filter,
            limit: 1,
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
        const res = await this.params.agent.getEverythingFeed({
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