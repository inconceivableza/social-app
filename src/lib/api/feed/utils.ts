import { AppBskyFeedDefs, AppFoodiosFeedRecipeRevision, AtUri } from '@atproto/api'

import {BSKY_FEED_OWNER_DIDS} from '#/lib/constants'
import {isWeb} from '#/platform/detection'
import {UsePreferencesQueryResponse} from '#/state/queries/preferences'
import { makeProfileLink } from '#/lib/routes/links'

let debugTopics = ''
if (isWeb && typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search)
  debugTopics = params.get('debug_topics') ?? ''
}

export function createBskyTopicsHeader(userInterests?: string) {
  return {
    'X-Bsky-Topics': debugTopics || userInterests || '',
  }
}

export function aggregateUserInterests(
  preferences?: UsePreferencesQueryResponse,
) {
  return preferences?.interests?.tags?.join(',') || ''
}

export function isBlueskyOwnedFeed(feedUri: string) {
  const uri = new AtUri(feedUri)
  return BSKY_FEED_OWNER_DIDS.includes(uri.host)
}

export type RecipePostView = AppBskyFeedDefs.PostView & { record: AppFoodiosFeedRecipeRevision.Record }

export function isRecipePostView(v: unknown): v is RecipePostView {
  return AppBskyFeedDefs.isPostView(v) && AppFoodiosFeedRecipeRevision.isRecord(v.record)
}

export function recipePostSummaryRichText(record: AppFoodiosFeedRecipeRevision.Record) {
  return `${record.title}\n${record.text}`
}

export function postHref(author: { did: string, handle: string }, uri: string, ...pathSegments: string[]) {
  const urip = new AtUri(uri)
  const postType = urip.collection.split(".").at(-1) ?? ""
  return makeProfileLink(author, postType, urip.rkey, ...pathSegments)
}
