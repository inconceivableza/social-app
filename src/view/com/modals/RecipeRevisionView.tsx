import {useEffect, useMemo, useState} from 'react'
import {View} from 'react-native'
import {ModerationDecision} from '@atproto/api'

import {
  isRecipePostView,
  postHref,
  type RecipePostView,
} from '#/lib/api/feed/utils'
import {useGetPost} from '#/state/queries/post'
import {LINEAR_AVI_WIDTH} from '#/screens/PostThread/const'
import {atoms as a} from '#/alf'
import { Embed, PostEmbedViewContext } from '#/components/Post/Embed'
import {PostMeta} from '../util/PostMeta'
import {PreviewableUserAvatar} from '../util/UserAvatar'
import { ExpandedRecipePost } from '../posts/ExpandableRecipePost'

export const snapPoints = ['fullscreen']

export function Component({uri}: {uri: string}) {
  const getPost = useGetPost()
  const [post, setPost] = useState<RecipePostView>()
  useEffect(() => {
    let cancelled = false
    getPost({uri}).then(
        result => !cancelled && isRecipePostView(result) && setPost(result),
    )
    return () => {
      cancelled = true
    }
  }, [uri, getPost])

  const href = useMemo(() => {
    return post
      ? postHref(post.author, post.record.revisionContent.recipePostRef.uri)
      : ''
  }, [post])

  const moderation = new ModerationDecision() // TODO: fix

  if (!isRecipePostView(post)) return null

  return (
    <View style={[a.flex_row, a.gap_md]}>
      <View>
        <PreviewableUserAvatar
          size={LINEAR_AVI_WIDTH}
          profile={post.author}
          type={post.author.associated?.labeler ? 'labeler' : 'user'}
        />
      </View>

      <View style={[a.flex_1]}>
        <PostMeta
          author={post.author}
          moderation={moderation}
          timestamp={post.indexedAt}
          postHref={href}
          style={[a.pb_xs]}
        />

        <ExpandedRecipePost expanded revision={post.record} />

        {post.embed && (
          <View style={[a.pb_xs]}>
            <Embed
              embed={post.embed}
              moderation={moderation}
              viewContext={PostEmbedViewContext.Feed}
            />
          </View>
        )}
      </View>
    </View>
  )
}
