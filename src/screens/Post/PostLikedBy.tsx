import React from 'react'
import {lexiconIds as ids} from '@atproto/api'
import {Plural, Trans} from '@lingui/macro'
import {useFocusEffect} from '@react-navigation/native'

import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {makeRecordUri} from '#/lib/strings/url-helpers'
import {usePostQuery} from '#/state/queries/post'
import {useSetMinimalShellMode} from '#/state/shell'
import {PostLikedBy as PostLikedByComponent} from '#/view/com/post-thread/PostLikedBy'
import * as Layout from '#/components/Layout'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'PostLikedBy'>
export const PostLikedByScreen = ({route}: Props) => {
  const setMinimalShellMode = useSetMinimalShellMode()
  const {name, rkey, postType} = route.params
  const collection =
    postType === 'recipePost'
      ? ids.AppFoodiosFeedRecipePost
      : ids.AppBskyFeedPost
  const uri = makeRecordUri(name, collection, rkey)
  const {data: post} = usePostQuery(uri)

  let likeCount
  if (post) {
    likeCount = post.likeCount
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
                <Trans>Liked By</Trans>
              </Layout.Header.TitleText>
              <Layout.Header.SubtitleText>
                <Plural value={likeCount ?? 0} one="# like" other="# likes" />
              </Layout.Header.SubtitleText>
            </>
          )}
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <PostLikedByComponent
        uri={uri}
        revisionUri={
          post?.thread.type === 'recipe'
            ? post.thread.record.selectedRevisionUri
            : undefined
        }
      />
    </Layout.Screen>
  )
}
