import { KeyboardAvoidingView } from "react-native";
import { View } from "react-native";
import { atoms as a } from '#/alf'
import { isIOS } from '#/platform/detection'
import { useKeyboardVerticalOffset } from "./Composer";

import { useRecipePostReducer } from "./state/composerRecipe";
import * as apilib from '#/lib/api/index'
import { useAgent } from "#/state/session";
import { Button, ButtonText } from '#/components/Button'
import { msg } from "@lingui/macro";
import { Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";

export function ComposerRecipe() {
    const keyboardVerticalOffset = useKeyboardVerticalOffset()
    const [state, dispatch] = useRecipePostReducer()
    const agent = useAgent()
    const { _ } = useLingui()
    async function onPressPublish() {
        const postUri = await apilib.postRecipe(agent, {
            post: state
        })
        alert(postUri)
    }

    return <View>
        <KeyboardAvoidingView
            testID="composePostView"
            behavior={isIOS ? 'padding' : 'height'}
            keyboardVerticalOffset={keyboardVerticalOffset}
            style={a.flex_1}>
            <label>Title
                <input onChange={ev => {
                    dispatch({ type: "update_title", value: ev.target.value })
                }} value={state.title} />
            </label>
            <label>
                Description
                <input onChange={ev => {
                    dispatch({ type: "update_main_text", value: ev.target.value })
                }} value={state.text} />
            </label>
            <Button onPress={onPressPublish} label={_(
                msg({
                    message: 'Publish post',
                    comment:
                        'Accessibility label for button to publish a single post',
                }))}>
                <ButtonText>
                    <Trans context="action">Post</Trans>
                </ButtonText>

            </Button>


            {/* <TextInput

                style={[a.pt_xs]}
                richtext={richtext}
                placeholder={"Title"}
                autoFocus
                webForceMinHeight={forceMinHeight}
                // To avoid overlap with the close button:
                hasRightPadding={isPartOfThread}
                isActive={isActive}
                setRichText={rt => {
                    dispatchPost({ type: 'update_richtext', richtext: rt })
                }}
                onFocus={() => {
                    dispatch({
                        type: 'focus_post',
                        postId: post.id,
                    })
                }}
                onPhotoPasted={onPhotoPasted}
                onNewLink={onNewLink}
                onError={onError}
                onPressPublish={onPublish}
                accessible={true}
                accessibilityLabel={_(msg`Write post`)}
                accessibilityHint={_(
                    msg`Compose posts up to ${plural(MAX_GRAPHEME_LENGTH || 0, {
                        other: '# characters',
                    })} in length`,
                )}
            /> */}
        </KeyboardAvoidingView>
    </View>
}