import * as React from 'react'
import {View} from 'react-native'
import {AppBskyFeedDefs, AtUri} from '@atproto/api'
import {Trans} from '@lingui/macro'

import {makeProfileLink} from '#/lib/routes/links'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {Link} from '../util/Link'
import {UserAvatar} from '../util/UserAvatar'
import { postHref } from '#/lib/api/feed/utils'

export function PostThreadLoadMore({post}: {post: AppBskyFeedDefs.PostView}) {
  const t = useTheme()

  const href = React.useMemo(() => {
    return postHref(post.author, post.uri)
  }, [post.uri, post.author])

  return (
    <Link
      href={href}
      style={[a.flex_row, a.align_center, a.py_md, {paddingHorizontal: 14}]}
      hoverStyle={[t.atoms.bg_contrast_25]}>
      <View style={[a.flex_row]}>
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: 18,
            backgroundColor: t.atoms.bg.backgroundColor,
            marginRight: -20,
          }}>
          <UserAvatar
            avatar={post.author.avatar}
            size={30}
            type={post.author.associated?.labeler ? 'labeler' : 'user'}
          />
        </View>
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: 18,
            backgroundColor: t.atoms.bg.backgroundColor,
          }}>
          <UserAvatar
            avatar={post.author.avatar}
            size={30}
            type={post.author.associated?.labeler ? 'labeler' : 'user'}
          />
        </View>
      </View>
      <View style={[a.px_sm]}>
        <Text style={[{color: t.palette.primary_500}, a.text_md]}>
          <Trans>Continue thread...</Trans>
        </Text>
      </View>
    </Link>
  )
}
