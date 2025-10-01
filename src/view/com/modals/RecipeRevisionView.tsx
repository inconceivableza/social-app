import { RecipePostView, isRecipePostView, postHref, recipePostSummaryRichText } from "#/lib/api/feed/utils";
import { useGetPost } from "#/state/queries/post";
import { AtUri, ModerationDecision } from "@atproto/api";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { atoms as a, useTheme } from '#/alf'
import { PreviewableUserAvatar } from "../util/UserAvatar";
import { LINEAR_AVI_WIDTH } from "#/screens/PostThread/const";
import { PostMeta } from "../util/PostMeta";
import { Embed, PostEmbedViewContext } from '#/components/Post/Embed'
import { RichText } from "#/components/RichText";


export const snapPoints = ['fullscreen']

export function Component({ uri }: { uri: string }) {
    const getPost = useGetPost()
    const [post, setPost] = useState<RecipePostView>()
    useEffect(() => {
        let cancelled = false
        getPost({ uri })
            .then(post => !cancelled && isRecipePostView(post) && setPost(post))
        return () => { cancelled = true }
    }, [uri])

    const href = useMemo(() => {
        return post ? postHref(post.author, post.record.revisionContent.recipePostRef.uri) : ""
    }, [post?.uri, post?.author])

    const moderation = new ModerationDecision() // TODO: fix

    if (!isRecipePostView(post)) return null

    return <View style={[a.flex_row, a.gap_md]}>
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

            <RichText
                enableTags
                value={recipePostSummaryRichText(post.record.revisionContent)}
                style={[a.flex_1, a.text_md]}
                authorHandle={post.author.handle}
                shouldProxyLinks={true}
            />

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
}