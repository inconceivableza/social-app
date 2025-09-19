import { RecipePostView, isRecipePostView } from "#/lib/api/feed/utils";
import { useGetPost } from "#/state/queries/post";
import { useEffect, useState } from "react";
import { View } from "react-native";

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

    return <View>
        <div>
            {post && JSON.stringify(post, undefined, "  ")}
        </div>
    </View>
}