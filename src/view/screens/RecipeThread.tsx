import { CommonNavigatorParams } from "#/lib/routes/types";
import { makeRecordUri } from "#/lib/strings/url-helpers";
import { useSetMinimalShellMode } from "#/state/shell";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import * as Layout from '#/components/Layout'
import { ids } from "@atproto/api/client/lexicons";
import { PostThread as PostThreadComponent } from '#/view/com/post-thread/PostThread'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'RecipeThread'>
export function RecipeThreadScreen({ route }: Props) {
    const setMinimalShellMode = useSetMinimalShellMode()

    const { name, rkey } = route.params
    const uri = makeRecordUri(name, ids.AppFoodiosFeedRecipePost, rkey)

    useFocusEffect(
        useCallback(() => {
            setMinimalShellMode(false)
        }, [setMinimalShellMode]),
    )

    // TODO: consider using V2 thread component
    return (
        <Layout.Screen testID="recipeThreadScreen">
            <PostThreadComponent uri={uri} />
        </Layout.Screen>
    )
}

