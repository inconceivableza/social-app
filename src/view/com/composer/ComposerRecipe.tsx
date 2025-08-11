import { KeyboardAvoidingView } from "react-native";
import { View } from "react-native";
import { atoms as a } from '#/alf'
import { isIOS } from '#/platform/detection'
import { useKeyboardVerticalOffset } from "./Composer";

import { useRecipePostReducer } from "./state/composerRecipe";
import * as apilib from '#/lib/api/index'
import { useAgent } from "#/state/session";
import { Button, ButtonText, ButtonIcon } from '#/components/Button'
import { msg } from "@lingui/macro";
import { Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";

const msgs = {
    button_add_ingredient: msg({
        message: 'Add ingredient',
        comment:
            'Accessibility label for adding an ingredient to a recipe',
    }),
    button_add_step: msg({
        message: 'Add step',
        comment:
            'Accessibility label for adding a step to a recipe',
    }),
    button_post_recipe: msg({
        message: 'Publish post',
        comment:
            'Accessibility label for button to publish a single post',
    })
}

export function ComposerRecipe() {
    const keyboardVerticalOffset = useKeyboardVerticalOffset()
    const [state, dispatch] = useRecipePostReducer()
    const agent = useAgent()
    const { _ } = useLingui()
    async function onPressPublish() {
        // TODO: validation
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
            <fieldset>
                <legend><Trans context="recipe">Ingredients</Trans></legend>
                <ul>
                    {state.ingredients.map(({ name, quantity, unit }, i) => <div key={i}>
                        <label><Trans context="recipe">Item</Trans>
                            <input value={name} onChange={ev => {
                                dispatch({ type: "edit_ingredient", prop: "name", value: ev.target.value, index: i })
                            }} />
                        </label>
                        <label><Trans context="recipe">Quantity</Trans>
                            <input value={quantity} onChange={ev => {
                                dispatch({ type: "edit_ingredient", prop: "quantity", value: ev.target.value, index: i })
                            }} />
                        </label>
                        <label><Trans context="recipe">Unit</Trans>
                            <input value={unit} onChange={ev => {
                                dispatch({ type: "edit_ingredient", prop: "unit", value: ev.target.value, index: i })
                            }} />
                        </label>
                    </div>)}
                </ul>
                <Button onPress={() => {
                    dispatch({ type: "add_ingredient" })
                }} label={_(msgs.button_add_ingredient)}>
                    <ButtonText><Trans context="action">Add ingredient</Trans></ButtonText>
                </Button>
            </fieldset>

            <fieldset>
                <legend><Trans context="recipe">Steps</Trans></legend>
                {/* TODO: use different key if steps can be reordered */}
                <ol>
                    {state.steps.map((step, i) => <div key={i}>
                        <label><Trans context="recipe">Step</Trans>
                            <input value={step.text}
                                onChange={ev => dispatch({ type: "edit_step_text", index: i, value: ev.target.value })} />
                        </label>
                    </div>)}
                </ol>
                <Button onPress={() => {
                    dispatch({ type: "add_step" })
                }} label={_(msgs.button_add_step)}>
                    <ButtonText><Trans context="action">Add step</Trans></ButtonText>
                </Button>
            </fieldset>
            <label>
                <Trans context="recipe">Post to feed</Trans>
                <input onChange={() => dispatch({ type: "toggle_post_to_feed" })} type="checkbox" />
            </label>

            <Button onPress={onPressPublish} label={_(msgs.button_post_recipe)}>
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