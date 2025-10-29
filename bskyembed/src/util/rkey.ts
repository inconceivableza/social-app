import { AppBskyFeedDefs, AtUri } from '@atproto/api'

export function postHref(post: AppBskyFeedDefs.PostView): string {
  const atUri = new AtUri(post.uri)
  const postType = atUri.collection.split(".").at(-1)
  return `/profile/${post.author.did}/${postType}/${atUri.rkey}`
}

export function getRkey({uri}: {uri: string}): string {
  const at = new AtUri(uri)
  return at.rkey
}
