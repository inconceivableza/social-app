import {memo, type ReactNode, useCallback, useMemo, useState} from 'react'
import {View} from 'react-native'
import {
  type AppBskyFeedDefs,
  type AppBskyFeedThreadgate,
  AppFoodiosFeedReviewRating,
  AtUri,
  RichText as RichTextAPI,
} from '@atproto/api'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useActorStatus} from '#/lib/actor-status'
import {
  dangerousIsPostRecord,
  dangerousIsRecipeView,
  isRecipePostView,
  isReviewRatingView,
  postHref,
  recipePostSummaryRichText,
} from '#/lib/api/feed/utils'
import {MAX_POST_LINES} from '#/lib/constants'
import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {countLines} from '#/lib/strings/helpers'
import {
  POST_TOMBSTONE,
  type Shadow,
  usePostShadow,
} from '#/state/cache/post-shadow'
import {useModalControls} from '#/state/modals'
import {type ThreadItem} from '#/state/queries/usePostThread/types'
import {useSession} from '#/state/session'
import {type OnPostSuccessData} from '#/state/shell/composer'
import {useMergedThreadgateHiddenReplies} from '#/state/threadgate-hidden-replies'
import {PostMeta} from '#/view/com/util/PostMeta'
import {PreviewableUserAvatar} from '#/view/com/util/UserAvatar'
import {
  LINEAR_AVI_WIDTH,
  OUTER_SPACE,
  REPLY_LINE_WIDTH,
} from '#/screens/PostThread/const'
import {atoms as a, useTheme, web} from '#/alf'
import {Button, ButtonIcon} from '#/components/Button'
import {useInteractionState} from '#/components/hooks/useInteractionState'
import {OutdatedIcon} from '#/components/icons/Outdated'
import {Trash_Stroke2_Corner0_Rounded as TrashIcon} from '#/components/icons/Trash'
import {LabelsOnMyPost} from '#/components/moderation/LabelsOnMe'
import {PostAlerts} from '#/components/moderation/PostAlerts'
import {PostHider} from '#/components/moderation/PostHider'
import {type AppModerationCause} from '#/components/Pills'
import {Embed, PostEmbedViewContext} from '#/components/Post/Embed'
import {ShowMoreTextButton} from '#/components/Post/ShowMoreTextButton'
import {PostControls} from '#/components/PostControls'
import {RichText} from '#/components/RichText'
import * as Skele from '#/components/Skeleton'
import {SubtleWebHover} from '#/components/SubtleWebHover'
import {Text} from '#/components/Typography'

export type ThreadItemPostProps = {
  item: Extract<ThreadItem, {type: 'threadPost'}>
  overrides?: {
    moderation?: boolean
    topBorder?: boolean
  }
  onPostSuccess?: (data: OnPostSuccessData) => void
  threadgateRecord?: AppBskyFeedThreadgate.Record
  anchor?: Extract<ThreadItem, {type: 'threadPost'}>
}

export function ThreadItemPost({
  item,
  overrides,
  onPostSuccess,
  onReviewRateSuccess,
  threadgateRecord,
  anchor,
}: ThreadItemPostProps) {
  const postShadow = usePostShadow(item.value.post)

  if (postShadow === POST_TOMBSTONE) {
    return <ThreadItemPostDeleted item={item} overrides={overrides} />
  }

  return (
    <ThreadItemPostInner
      item={item}
      postShadow={postShadow}
      threadgateRecord={threadgateRecord}
      overrides={overrides}
      onPostSuccess={onPostSuccess}
      onReviewRateSuccess={onReviewRateSuccess}
      anchor={anchor}
    />
  )
}

function ThreadItemPostDeleted({
  item,
  overrides,
}: Pick<ThreadItemPostProps, 'item' | 'overrides'>) {
  const t = useTheme()

  return (
    <ThreadItemPostOuterWrapper item={item} overrides={overrides}>
      <ThreadItemPostParentReplyLine item={item} />

      <View
        style={[
          a.flex_row,
          a.align_center,
          a.py_md,
          a.rounded_sm,
          t.atoms.bg_contrast_25,
        ]}>
        <View
          style={[
            a.flex_row,
            a.align_center,
            a.justify_center,
            {
              width: LINEAR_AVI_WIDTH,
            },
          ]}>
          <TrashIcon style={[t.atoms.text_contrast_medium]} />
        </View>
        <Text style={[a.text_md, a.font_bold, t.atoms.text_contrast_medium]}>
          <Trans>Post has been deleted</Trans>
        </Text>
      </View>

      <View style={[{height: 4}]} />
    </ThreadItemPostOuterWrapper>
  )
}

const ThreadItemPostOuterWrapper = memo(function ThreadItemPostOuterWrapper({
  item,
  overrides,
  children,
}: Pick<ThreadItemPostProps, 'item' | 'overrides'> & {
  children: ReactNode
}) {
  const t = useTheme()
  const showTopBorder =
    !item.ui.showParentReplyLine && overrides?.topBorder !== true

  return (
    <View
      style={[
        showTopBorder && [a.border_t, t.atoms.border_contrast_low],
        {
          paddingHorizontal: OUTER_SPACE,
        },
        // If there's no next child, add a little padding to bottom
        !item.ui.showChildReplyLine &&
          !item.ui.precedesChildReadMore && {
            paddingBottom: OUTER_SPACE / 2,
          },
      ]}>
      {children}
    </View>
  )
})

/**
 * Provides some space between posts as well as contains the reply line
 */
const ThreadItemPostParentReplyLine = memo(
  function ThreadItemPostParentReplyLine({
    item,
  }: Pick<ThreadItemPostProps, 'item'>) {
    const t = useTheme()
    return (
      <View style={[a.flex_row, {height: 12}]}>
        <View style={{width: LINEAR_AVI_WIDTH}}>
          {item.ui.showParentReplyLine && (
            <View
              style={[
                a.mx_auto,
                a.flex_1,
                a.mb_xs,
                {
                  width: REPLY_LINE_WIDTH,
                  backgroundColor: t.atoms.border_contrast_low.borderColor,
                },
              ]}
            />
          )}
        </View>
      </View>
    )
  },
)

const ThreadItemPostInner = memo(function ThreadItemPostInner({
  item,
  postShadow,
  overrides,
  onPostSuccess,
  onReviewRateSuccess,
  threadgateRecord,
  anchor,
}: ThreadItemPostProps & {
  postShadow: Shadow<AppBskyFeedDefs.PostView>
}) {
  const t = useTheme()
  const {openComposer} = useOpenComposer()
  const {currentAccount} = useSession()

  const post = item.value.post
  const record = item.value.post.record
  const moderation = item.moderation
  const richText = useMemo(
    () =>
      isRecipePostView(post)
        ? new RichTextAPI({
            text: recipePostSummaryRichText(post.record.revisionContent),
          })
        : isReviewRatingView(post)
          ? new RichTextAPI({
              text: post.record.reviewBody ?? '',
            })
          : new RichTextAPI({
              text: record.text,
              facets: record.facets,
            }),
    [record, post],
  )
  const [limitLines, setLimitLines] = useState(
    () => countLines(richText?.text) >= MAX_POST_LINES,
  )

  const threadRootUri = record.reply?.root?.uri || post.uri
  const href = useMemo(() => {
    return postHref(post.author, post.uri)
  }, [post.uri, post.author])
  const threadgateHiddenReplies = useMergedThreadgateHiddenReplies({
    threadgateRecord,
  })
  const additionalPostAlerts: AppModerationCause[] = useMemo(() => {
    const isPostHiddenByThreadgate = threadgateHiddenReplies.has(post.uri)
    const isControlledByViewer =
      new AtUri(threadRootUri).host === currentAccount?.did
    return isControlledByViewer && isPostHiddenByThreadgate
      ? [
          {
            type: 'reply-hidden',
            source: {type: 'user', did: currentAccount?.did},
            priority: 6,
          },
        ]
      : []
  }, [post, currentAccount?.did, threadgateHiddenReplies, threadRootUri])

  const onPressReply = useCallback(() => {
    openComposer({
      type: 'post',
      replyTo: {
        uri: post.uri,
        cid: post.cid,
        text: record.text,
        author: post.author,
        embed: post.embed,
        moderation,
        langs: post.record.langs,
      },
      onPostSuccess: onPostSuccess,
    })
  }, [openComposer, post, record, onPostSuccess, moderation])

  const onPressReviewRate = useCallback(() => {
    if (dangerousIsRecipeView(post)) {
      openComposer({
        type: 'post',
        replyTo: {
          uri: post.uri,
          cid: post.cid,
          text: record.text,
          author: post.author,
          embed: post.embed,
          moderation,
        },
        onPostSuccess: onReviewRateSuccess,
      })
    }
  }, [openComposer, post, record, onReviewRateSuccess, moderation])

  const onPressShowMore = useCallback(() => {
    setLimitLines(false)
  }, [setLimitLines])

  const {isActive: live} = useActorStatus(post.author)
  const {openModal} = useModalControls()
  // recipe revisions don't have a reply so they are the root
  const rootReplyRef = AppFoodiosFeedReviewRating.isRecord(record)
    ? record.subject
    : dangerousIsPostRecord(record)
      ? record.reply?.root
      : null
  const anchorRevision = anchor?.value.post.record.selectedRevisionUri
  const revisionMismatch =
    anchorRevision &&
    rootReplyRef &&
    rootReplyRef.revisionUri &&
    anchorRevision !== rootReplyRef.revisionUri
  const {_} = useLingui()
  const constitutesRating =
    AppFoodiosFeedReviewRating.isRecord(record) &&
    typeof record.reviewRating !== 'undefined'
  const constitutesReview =
    AppFoodiosFeedReviewRating.isRecord(record) && record.reviewBody
  return (
    <SubtleHover>
      <ThreadItemPostOuterWrapper item={item} overrides={overrides}>
        <PostHider
          testID={`postThreadItem-by-${post.author.handle}`}
          href={href}
          disabled={overrides?.moderation === true}
          modui={moderation.ui('contentList')}
          iconSize={LINEAR_AVI_WIDTH}
          iconStyles={{marginLeft: 2, marginRight: 2}}
          profile={post.author}
          interpretFilterAsBlur>
          <ThreadItemPostParentReplyLine item={item} />

          <View style={[a.flex_row, a.gap_md]}>
            <View>
              <PreviewableUserAvatar
                size={LINEAR_AVI_WIDTH}
                profile={post.author}
                moderation={moderation.ui('avatar')}
                type={post.author.associated?.labeler ? 'labeler' : 'user'}
                live={live}
              />

              {(item.ui.showChildReplyLine ||
                item.ui.precedesChildReadMore) && (
                <View
                  style={[
                    a.mx_auto,
                    a.mt_xs,
                    a.flex_1,
                    {
                      width: REPLY_LINE_WIDTH,
                      backgroundColor: t.atoms.border_contrast_low.borderColor,
                    },
                  ]}
                />
              )}
            </View>

            <View style={[a.flex_1]}>
              <PostMeta
                author={post.author}
                moderation={moderation}
                timestamp={post.indexedAt}
                postHref={href}
                style={[a.pb_xs]}>
                {revisionMismatch && (
                  <Button
                    style={[a.pr_sm]}
                    label={_(msg`Show original version`)}
                    onPress={() => {
                      // TODO: add api method for retrieving revision and remove all query param logic from getPosts
                      openModal({
                        name: 'recipe-revision-view',
                        uri: `${anchor.uri}?revision=${new AtUri(rootReplyRef.revisionUri).rkey}`,
                      })
                    }}>
                    <ButtonIcon size="sm" icon={OutdatedIcon} />
                  </Button>
                )}
                {(constitutesRating || constitutesReview) && (
                  <Text
                    style={[
                      a.pl_xs,
                      a.italic,
                      a.text_md,
                      a.leading_tight,
                      a.flex_grow,
                      a.text_right,
                      t.atoms.text_contrast_medium,
                      web({
                        whiteSpace: 'nowrap',
                      }),
                    ]}>
                    {constitutesRating ? ' rated this' : ' reviewed this'}
                  </Text>
                )}
              </PostMeta>
              <LabelsOnMyPost post={post} style={[a.pb_xs]} />
              <PostAlerts
                modui={moderation.ui('contentList')}
                style={[a.pb_2xs]}
                additionalCauses={additionalPostAlerts}
              />

              {richText?.text ? (
                <>
                  <RichText
                    enableTags
                    value={richText}
                    style={[a.flex_1, a.text_md]}
                    numberOfLines={limitLines ? MAX_POST_LINES : undefined}
                    authorHandle={post.author.handle}
                    shouldProxyLinks={true}
                  />
                  {limitLines && (
                    <ShowMoreTextButton
                      style={[a.text_md]}
                      onPress={onPressShowMore}
                    />
                  )}
                </>
              ) : undefined}
              {post.embed && (
                <View style={[a.pb_xs]}>
                  <Embed
                    embed={post.embed}
                    moderation={moderation}
                    viewContext={PostEmbedViewContext.Feed}
                  />
                </View>
              )}
              <PostControls
                post={postShadow}
                record={record}
                richText={richText}
                onPressReply={onPressReply}
                onPressReviewRate={onPressReviewRate}
                onPostChanged={onPostSuccess}
                logContext="PostThreadItem"
                threadgateRecord={threadgateRecord}
              />
            </View>
          </View>
        </PostHider>
      </ThreadItemPostOuterWrapper>
    </SubtleHover>
  )
})

function SubtleHover({children}: {children: ReactNode}) {
  const {
    state: hover,
    onIn: onHoverIn,
    onOut: onHoverOut,
  } = useInteractionState()
  return (
    <View
      onPointerEnter={onHoverIn}
      onPointerLeave={onHoverOut}
      style={a.pointer}>
      <SubtleWebHover hover={hover} />
      {children}
    </View>
  )
}

export function ThreadItemPostSkeleton({index}: {index: number}) {
  const even = index % 2 === 0
  return (
    <View
      style={[
        {paddingHorizontal: OUTER_SPACE, paddingVertical: OUTER_SPACE / 1.5},
        a.gap_md,
      ]}>
      <Skele.Row style={[a.align_start, a.gap_md]}>
        <Skele.Circle size={LINEAR_AVI_WIDTH} />

        <Skele.Col style={[a.gap_xs]}>
          <Skele.Row style={[a.gap_sm]}>
            <Skele.Text style={[a.text_md, {width: '20%'}]} />
            <Skele.Text blend style={[a.text_md, {width: '30%'}]} />
          </Skele.Row>

          <Skele.Col>
            {even ? (
              <>
                <Skele.Text blend style={[a.text_md, {width: '100%'}]} />
                <Skele.Text blend style={[a.text_md, {width: '60%'}]} />
              </>
            ) : (
              <Skele.Text blend style={[a.text_md, {width: '60%'}]} />
            )}
          </Skele.Col>

          <Skele.Row style={[a.justify_between, a.pt_xs]}>
            <Skele.Pill blend size={16} />
            <Skele.Pill blend size={16} />
            <Skele.Pill blend size={16} />
            <Skele.Circle blend size={16} />
            <View />
          </Skele.Row>
        </Skele.Col>
      </Skele.Row>
    </View>
  )
}
