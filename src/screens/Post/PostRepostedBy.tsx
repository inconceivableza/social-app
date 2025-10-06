import React from 'react'
import {Plural, Trans} from '@lingui/macro'
import {useFocusEffect} from '@react-navigation/native'

import {CommonNavigatorParams, NativeStackScreenProps} from '#/lib/routes/types'
import {makeRecordUri} from '#/lib/strings/url-helpers'
import {usePostThreadQuery} from '#/state/queries/post-thread'
import {useSetMinimalShellMode} from '#/state/shell'
import {PostRepostedBy as PostRepostedByComponent} from '#/view/com/post-thread/PostRepostedBy'
import * as Layout from '#/components/Layout'
import { ids } from '@atproto/api/client/lexicons'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'PostRepostedBy'>
export const PostRepostedByScreen = ({route}: Props) => {
  const { name, rkey, postType } = route.params
  const collection = postType === "recipePost" ? ids.AppFoodiosFeedRecipePost : ids.AppBskyFeedPost
  const uri = makeRecordUri(name, collection, rkey)
  const setMinimalShellMode = useSetMinimalShellMode()
  const {data: post} = usePostThreadQuery(uri)

  let quoteCount
  const threadType = post?.thread.type
  if (threadType === "post" || threadType === "recipe") {
    quoteCount = post?.thread.post.repostCount
  }

  useFocusEffect(
    React.useCallback(() => {
      setMinimalShellMode(false)
    }, [setMinimalShellMode]),
  )

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          {post && (
            <>
              <Layout.Header.TitleText>
                <Trans>Reposted By</Trans>
              </Layout.Header.TitleText>
              <Layout.Header.SubtitleText>
                <Plural
                  value={quoteCount ?? 0}
                  one="# repost"
                  other="# reposts"
                />
              </Layout.Header.SubtitleText>
            </>
          )}
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <PostRepostedByComponent uri={uri} revisionUri={post?.thread.type === "recipe" ? post.thread.record.selectedRevisionUri : undefined} />
    </Layout.Screen>
  )
}
