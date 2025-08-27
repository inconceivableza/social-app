import { useFeedFeedbackContext } from "#/state/feed-feedback";
import { AppFoodiosFeedDefs } from "@atproto/api";
import { View } from "react-native";
import { atoms as a, useBreakpoints } from '#/alf'
import { useOpenComposer } from "#/lib/hooks/useOpenComposer";
import { PostControlButton, PostControlButtonIcon, PostControlButtonText } from "#/components/PostControls/PostControlButton";
import { useRequireAuth } from "#/state/session";
import { msg, plural } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { Bubble_Stroke2_Corner2_Rounded as Bubble } from '#/components/icons/Bubble'
import { formatCount } from "../util/numeric/format";
import { AnimatedLikeIcon } from "#/lib/custom-animations/LikeIcon";
import { useState } from "react";
import { CountWheel } from "#/lib/custom-animations/CountWheel";
import { useHaptics } from "#/lib/haptics";
import { usePostLikeMutationQueue, usePostRepostMutationQueue } from "#/state/queries/post";
import { ProgressGuideAction, useProgressGuideControls } from "#/state/shell/progress-guide";
import { POST_TOMBSTONE, usePostShadow } from "#/state/cache/post-shadow";
import { RepostButton } from "#/components/PostControls/RepostButton";


interface RecipeFeedItemProps {
    post: AppFoodiosFeedDefs.RecipePostView
    feedContext: string | undefined,
    reqId: string | undefined
}

export function RecipeFeedItem(props: RecipeFeedItemProps) {
    const { post, feedContext, reqId } = props

    const { sendInteraction, feedDescriptor } = useFeedFeedbackContext()
    const { openComposer } = useOpenComposer()
    const requireAuth = useRequireAuth()
    const { _, i18n } = useLingui()
    const shadowedPost = usePostShadow(post) // TODO: check if tombstone

    const onPressReply = () => {
        sendInteraction({
            item: post.uri,
            event: 'app.bsky.feed.defs#interactionReply',
            feedContext,
            reqId,
        })
        openComposer({
            type: "post",
            replyTo: {
                uri: post.uri,
                cid: post.cid,
                text: post.text || '',
                author: post.author,
            },
        })
    }

    const [hasLikeIconBeenToggled, setHasLikeIconBeenToggled] = useState(false)

    const playHaptic = useHaptics()
    const { captureAction } = useProgressGuideControls()
    if (shadowedPost === POST_TOMBSTONE) {
        // TODO: refactor so that this isn't performed before other hooks - use inner component
        return null
    }
    const [queueLike, queueUnlike] = usePostLikeMutationQueue(
        shadowedPost,
        undefined, // TODO: fix
        feedDescriptor,
        "FeedItem", // TODO: fix
    )

    const onPressToggleLike = async () => {
        // if (isBlocked) {
        //   Toast.show(
        //     _(msg`Cannot interact with a blocked user`),
        //     'exclamation-circle',
        //   )
        //   return
        // }

        try {
            console.log('!')
            setHasLikeIconBeenToggled(true)
            if (!post.viewer?.like) {
                playHaptic('Light')
                sendInteraction({
                    item: post.uri,
                    event: 'app.bsky.feed.defs#interactionLike',
                    feedContext,
                    reqId,
                })
                captureAction(ProgressGuideAction.Like)
                await queueLike()
            } else {
                await queueUnlike()
            }
        } catch (e: any) {
            if (e?.name !== 'AbortError') {
                throw e
            }
        }
    }

    const big = false



    const [queueRepost, queueUnrepost] = usePostRepostMutationQueue(
        shadowedPost,
        undefined, // TODO: fix
        feedDescriptor,
        "FeedItem", // TODO:fix
    )

    const onReply = () => requireAuth(() => onPressReply())

    const onRepost = async () => {
        // if (isBlocked) {
        //   Toast.show(
        //     _(msg`Cannot interact with a blocked user`),
        //     'exclamation-circle',
        //   )
        //   return
        // }

        try {
            if (!post.viewer?.repost) {
                sendInteraction({
                    item: post.uri,
                    event: 'app.bsky.feed.defs#interactionRepost',
                    feedContext,
                    reqId,
                })
                await queueRepost()
            } else {
                await queueUnrepost()
            }
        } catch (e: any) {
            if (e?.name !== 'AbortError') {
                throw e
            }
        }
    }

    const onQuote = () => {
        // if (isBlocked) {
        //   Toast.show(
        //     _(msg`Cannot interact with a blocked user`),
        //     'exclamation-circle',
        //   )
        //   return
        // }

        sendInteraction({
            item: post.uri,
            event: 'app.bsky.feed.defs#interactionQuote',
            feedContext,
            reqId,
        })
        openComposer({
            type: "post",
            quote: post,
            onPost: onReply,
        })
    }
    // TODO: repost immediate feedback
    return <div>
        <div>{post.author.handle}</div>
        <div>{post.title}</div>
        <div>{post.text}</div>
        <View
            style={[
                a.flex_row,
                a.justify_between,
                a.align_center,
                !big && a.pt_2xs,
                //  style,
            ]}>
            <View
                style={[
                [a.flex_1, a.align_start, { marginLeft: -6 }],
                //replyDisabled ? { opacity: 0.5 } : undefined,
            ]}>
            <PostControlButton
                testID="replyBtn"
                    onPress={onReply}
                label={_(
                    msg({
                        message: `Reply (${plural(42, {
                            one: '# reply',
                            other: '# replies',
                        })})`,
                        comment:
                            'Accessibility label for the reply button, verb form followed by number of replies and noun form',
                    }),
                )}
                big={false}>
                <PostControlButtonIcon icon={Bubble} />
                {typeof post.replyCount !== 'undefined' && post.replyCount > 0 && (
                    <PostControlButtonText>
                        {formatCount(i18n, post.replyCount)}
                    </PostControlButtonText>
                )}
            </PostControlButton>


            </View>
            <View style={big ? a.align_center : [a.flex_1, a.align_start]}>
                <RepostButton
                    isReposted={!!post.viewer?.repost}
                    repostCount={(post.repostCount ?? 0) + (post.quoteCount ?? 0)}
                    onRepost={onRepost}
                    onQuote={onQuote}
                    big={big}
                    embeddingDisabled={Boolean(post.viewer?.embeddingDisabled)}
                />
            </View>
            <View style={[a.flex_1, a.align_start]}>
                <PostControlButton
                    testID="likeBtn"
                    big={false}
                    onPress={() => requireAuth(() => onPressToggleLike())}
                    label={
                        post.viewer?.like
                            ? _(
                                msg({
                                    message: `Unlike (${plural(post.likeCount || 0, {
                                        one: '# like',
                                        other: '# likes',
                                    })})`,
                                    comment:
                                        'Accessibility label for the like button when the post has been liked, verb followed by number of likes and noun',
                                }),
                            )
                            :
                            _(
                                msg({
                                    message: `Like (${plural(post.likeCount || 0, {
                                        one: '# like',
                                        other: '# likes',
                                    })})`,
                                    comment:
                                        'Accessibility label for the like button when the post has not been liked, verb form followed by number of likes and noun form',
                                }),
                            )
                    }>
                    <AnimatedLikeIcon
                        isLiked={Boolean(post.viewer?.like)}
                        big={false}
                        hasBeenToggled={hasLikeIconBeenToggled}
                    />
                    <CountWheel
                        likeCount={post.likeCount ?? 0}
                        big={false}
                        isLiked={Boolean(post.viewer?.like)}
                        hasBeenToggled={hasLikeIconBeenToggled}
                    />
                </PostControlButton>
            </View>
        </View>
    </div>
}