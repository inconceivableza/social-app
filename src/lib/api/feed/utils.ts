import {
  AppBskyFeedDefs,
  AppFoodiosFeedDefs,
  type AppFoodiosFeedRecipeRevision,
  AtUri,
} from '@atproto/api'

import {BSKY_FEED_OWNER_DIDS} from '#/lib/constants'
import {makeProfileLink} from '#/lib/routes/links'
import {isWeb} from '#/platform/detection'
import {type UsePreferencesQueryResponse} from '#/state/queries/preferences'

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
export type RecipePostView = Omit<AppBskyFeedDefs.PostView, 'record'> & {
  record: AppFoodiosFeedDefs.RecipeRevisionView
}

export function isRecipePostView(v: unknown): v is RecipePostView {
  return (
    AppBskyFeedDefs.isPostView(v) &&
    AppFoodiosFeedDefs.isRecipeRevisionView(v.record)
  )
}

export function recordText(post: AppBskyFeedDefs.PostView): string {
  return isRecipePostView(post)
    ? recipePostSummaryRichText(post.record.revisionContent)
    : (post.record?.text ?? '')
}

export function recipePostSummaryRichText(
  record: AppFoodiosFeedRecipeRevision.Record,
): string {
  return `${record.name}\n${record.text}`
}

export function postHref(
  author: {did: string; handle: string},
  uri: string,
  ...pathSegments: string[]
) {
  const urip = new AtUri(uri)
  const postType = urip.collection.split('.').at(-1) ?? ''
  return makeProfileLink(author, postType, urip.rkey, ...pathSegments)
}

export type RevisionState = 'unedited' | 'outdated' | 'edited'

export function postRevisionState(
  post: AppBskyFeedDefs.PostView,
): RevisionState {
  if (!isRecipePostView(post) || post.record.revisionRefs.length === 1) {
    return 'unedited'
  }
  if (
    post.record.selectedRevisionUri === post.record.revisionRefs.at(-1)?.uri
  ) {
    return 'edited'
  }
  return 'outdated'
}
