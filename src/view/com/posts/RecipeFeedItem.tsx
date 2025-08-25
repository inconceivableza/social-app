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

    return <div>
        <div>{post.author.handle}</div>
        <div>{post.title}</div>
        <div>{post.text}</div>
        <View
            style={[
                [a.flex_1, a.align_start, { marginLeft: -6 }],
                //replyDisabled ? { opacity: 0.5 } : undefined,
            ]}>
            <PostControlButton
                testID="replyBtn"
                onPress={
                    () => requireAuth(() => onPressReply())
                }
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
    </div>
}