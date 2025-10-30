import {type AppBskyFeedDefs} from '@atproto/api'

import {type ThreadItemPostValue} from '../queries/usePostThread'

// This isn't a real property, but it prevents T being compatible with Shadow<T>.
declare const shadowTag: unique symbol
export type Shadow<T> = T & {[shadowTag]: true}

export function castAsShadow<T>(value: T): Shadow<T> {
  return value as any as Shadow<T>
}

export type AnyPostView = AppBskyFeedDefs.PostView | ThreadItemPostValue['post']
