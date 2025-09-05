import { KeyboardAvoidingView } from "react-native";
import { View } from "react-native";
import { atoms as a, useTheme } from '#/alf'
import { isIOS, isWeb } from '#/platform/detection'
import { ComposerEmbeds, ToolbarWrapper, VideoUploadToolbar, useKeyboardVerticalOffset } from "./Composer";
import { SelectPhotoBtn } from '#/view/com/composer/photos/SelectPhotoBtn'
import { RecipePostDraft, useRecipePostReducer } from "./state/composerRecipe";
import * as apilib from '#/lib/api/index'
import { useAgent, useSession } from "#/state/session";
import { Button, ButtonText, ButtonIcon } from '#/components/Button'
import { msg } from "@lingui/macro";
import { Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useComposerControls } from "#/state/shell/composer";
import { SelectGifBtn } from "./photos/SelectGifBtn";
import { OpenCameraBtn } from "./photos/OpenCameraBtn";
import { SelectVideoBtn } from "./videos/SelectVideoBtn";
import { LayoutAnimationConfig } from "react-native-reanimated";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useWebMediaQueries } from "#/lib/hooks/useWebMediaQueries";
import { ImagePickerAsset } from "expo-image-picker";
import { EmbedAction, MAX_IMAGES } from "./state/composer";
import { ComposerImage } from "#/state/gallery";
import { Gif } from "#/state/queries/tenor";
import { EmojiArc_Stroke2_Corner0_Rounded as EmojiSmile } from '#/components/icons/Emoji'
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { SelectLangBtn } from "./select-language/SelectLangBtn";
import { useQueryClient } from "@tanstack/react-query";
import { uploadVideoDirect } from "./state/video";
import {
    EmojiPicker,
    type EmojiPickerPosition,
    type EmojiPickerState,
} from '#/view/com/composer/text-input/web/EmojiPicker'
import { DismissableLayer, FocusGuards, FocusScope } from "radix-ui/internal";
import { TextInputRef, TextInput } from "./text-input/TextInput";
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

// TODO: NB fix description being focused first

export function ComposerRecipe() {
    const keyboardVerticalOffset = useKeyboardVerticalOffset()
    const { closeComposer } = useComposerControls()

    const [state, dispatch] = useRecipePostReducer()
    const agent = useAgent()
    const queryClient = useQueryClient()
    const [pickerState, setPickerState] = React.useState<EmojiPickerState>({
        isOpen: false,
        pos: { top: 0, left: 0, right: 0, bottom: 0, nextFocusRef: null },
    })
    const { _ } = useLingui()
    async function onPressPublish() {
        // TODO: validation
        const postUri = await apilib.postRecipe(agent, queryClient, {
            post: state
        })
        closeComposer()
    }
    const { currentAccount } = useSession()
    const currentDid = currentAccount!.did

    const selectVideo = React.useCallback(
        (postId: string, asset: ImagePickerAsset) => {
            const abortController = new AbortController()
            dispatch({

                type: 'embed_add_video',
                asset,
                abortController,

            })
            uploadVideoDirect(asset,
                videoAction => {
                    dispatch({

                        type: 'embed_update_video',
                        videoAction,

                    })
                },
                agent,
                currentDid,
                abortController.signal,
                _,
            )
        },
        [_, agent, currentDid, dispatch],
    )

    FocusGuards.useFocusGuards()
    const titleInputRef = useRef<TextInputRef>(null)
    const descriptionInputRef = useRef<TextInputRef>(null)
    const currentRef = useRef<TextInputRef>()
    const [focused, setFocused] = useState<"title" | "description" | undefined>("title")
    const onOpenPicker = React.useCallback(
        (pos: EmojiPickerPosition | undefined) => {
            if (!pos) return
            setPickerState({
                isOpen: true,
                pos,
            })
        },
        [],
    )

    const onClosePicker = React.useCallback(() => {
        setPickerState(prev => ({
            ...prev,
            isOpen: false,
        }))
    }, [])

    const onEmojiButtonPress = useCallback(() => {
        const rect = currentRef.current?.getCursorPosition()
        if (rect) {
            onOpenPicker({
                ...rect,
                nextFocusRef:
                    currentRef as unknown as React.MutableRefObject<HTMLElement>,
            })
        }
    }, [onOpenPicker, focused])

    const isTextOnly = !state.embed.link && !state.embed.quote && !state.embed.media
    const forceMinHeight = isWeb && isTextOnly

    return <View>
        <KeyboardAvoidingView
            testID="composePostView"
            behavior={isIOS ? 'padding' : 'height'}
            keyboardVerticalOffset={keyboardVerticalOffset}
            style={a.flex_1}>
            <FocusScope.FocusScope loop trapped asChild>

                <DismissableLayer.DismissableLayer>
                    <View>
                        <fieldset>
                            <legend>
                                {/* todo: localize */}
                                Title
                            </legend>
                            <TextInput
                                ref={titleInputRef}
                                style={[a.pt_xs]}
                                richtext={state.title}
                                placeholder={''}
                                autoFocus
                                webForceMinHeight={false}
                                isActive={focused === "title"} // TODO: fix
                                setRichText={rt => {
                                    dispatch({ type: 'update_title', value: rt })
                                }}
                                onFocus={() => {

                                    setFocused("title")
                                    currentRef.current = titleInputRef.current ?? undefined
                                }}



                                onPhotoPasted={() => { }}
                                onNewLink={() => { }}
                                onError={() => { }}
                                onPressPublish={() => { }}
                                accessible={true}
                                accessibilityLabel={_(msg`Write post`)}
                                hasRightPadding={false}
                            // accessibilityHint={_(
                            //     msg`Compose posts up to ${plural(MAX_GRAPHEME_LENGTH || 0, {
                            //         other: '# characters',
                            //     })} in length`,
                            // )}
                            />

                        </fieldset>
                        <fieldset>
                            <legend>Description</legend>
                            <TextInput

                                ref={descriptionInputRef}
                                style={[a.pt_xs, { height: 2 }]}
                                richtext={state.text}
                                placeholder={''} // TODO: localize
                                autoFocus={false}
                                webForceMinHeight={forceMinHeight}
                                isActive={focused === "description"} // TODO: fix
                                setRichText={rt => {
                                    dispatch({ type: 'update_main_text', value: rt })
                                }}

                                onFocus={() => {

                                    setFocused("description")
                                    currentRef.current = descriptionInputRef.current ?? undefined
                                }}

                                onPhotoPasted={() => { }}
                                onNewLink={() => { }}
                                onError={() => { }}
                                onPressPublish={() => { }}
                                accessible={true}
                                accessibilityLabel={_(msg`Write post`)}
                                hasRightPadding={false}
                            // accessibilityHint={_(
                            //     msg`Compose posts up to ${plural(MAX_GRAPHEME_LENGTH || 0, {
                            //         other: '# characters',
                            //     })} in length`,
                            // )}
                            />
                        </fieldset>
            <fieldset>
                <legend><Trans context="recipe">Ingredients</Trans></legend>
                <ul>
                    {state.ingredients.map(({ name, quantity, unit }, i) => <div key={i}>
                        <label><Trans context="recipe">Item</Trans>
                            <input onFocus={() => {
                                setFocused(undefined)
                            }} value={name} onChange={ev => {
                                dispatch({ type: "edit_ingredient", prop: "name", value: ev.target.value, index: i })
                            }} />
                        </label>
                        <label><Trans context="recipe">Quantity</Trans>
                            <input onFocus={() => {
                                setFocused(undefined)
                            }} value={quantity} onChange={ev => {
                                dispatch({ type: "edit_ingredient", prop: "quantity", value: ev.target.value, index: i })
                            }} />
                        </label>
                        <label><Trans context="recipe">Unit</Trans>
                            <input onFocus={() => {
                                setFocused(undefined)
                            }} value={unit} onChange={ev => {
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
                            <input onFocus={() => {
                                setFocused(undefined)
                            }} value={step.text}
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
            <View>
                <ComposerEmbeds
                    canRemoveQuote={true} // TODO: check this
                    embed={state.embed}
                    dispatch={dispatch}
                    clearVideo={() => { }}
                    isActivePost={true}
                />
            </View>
            <Button onPress={onPressPublish} label={_(msgs.button_post_recipe)}>
                <ButtonText>
                    <Trans context="action">Post</Trans>
                </ButtonText>

            </Button>
            <ComposerFooter
                            emojiEnabled={focused === "description" || focused === "title"}
                post={state}
                dispatch={dispatch}
                // TODO: the rest of these
                            onEmojiButtonPress={onEmojiButtonPress}
                onError={() => { }}
                onSelectVideo={selectVideo}
            />
                        <EmojiPicker state={pickerState} close={onClosePicker} />
                    </View>
                </DismissableLayer.DismissableLayer>
            </FocusScope.FocusScope>  

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


function ComposerFooter({
    post,
    dispatch,
    onEmojiButtonPress,
    onError,
    onSelectVideo,
    emojiEnabled
}: {
    post: RecipePostDraft,
    dispatch: (action: EmbedAction) => void
    onEmojiButtonPress: () => void
    onError: (error: string) => void
        emojiEnabled: boolean
    onSelectVideo: (postId: string, asset: ImagePickerAsset) => void
}) {

    const t = useTheme()
    const { _ } = useLingui()
    const { isMobile } = useWebMediaQueries()

    const media = post.embed?.media
    const images = media?.type === 'images' ? media.images : []
    const video = media?.type === 'video' ? media.video : null
    const isMaxImages = images.length >= MAX_IMAGES

    const onImageAdd = useCallback(
        (next: ComposerImage[]) => {
            dispatch({
                type: 'embed_add_images',
                images: next,
            })
        },
        [dispatch],
    )

    const onSelectGif = useCallback(
        (gif: Gif) => {
            dispatch({ type: 'embed_add_gif', gif })
        },
        [dispatch],
    )

    return (
        <View
            style={[
                a.flex_row,
                a.py_xs,
                { paddingLeft: 7, paddingRight: 16 },
                a.align_center,
                a.border_t,
                t.atoms.bg,
                t.atoms.border_contrast_medium,
                a.justify_between,
            ]}>
            <View style={[a.flex_row, a.align_center]}>
                <LayoutAnimationConfig skipEntering skipExiting>
                    {video && video.status !== 'done' ? (
                        <VideoUploadToolbar state={video} />
                    ) : (
                        <ToolbarWrapper style={[a.flex_row, a.align_center, a.gap_xs]}>
                            <SelectPhotoBtn
                                size={images.length}
                                disabled={media?.type === 'images' ? isMaxImages : !!media}
                                onAdd={onImageAdd}
                            />
                            <SelectVideoBtn
                                onSelectVideo={asset => onSelectVideo(post.id, asset)}
                                disabled={!!media}
                                setError={onError}
                            />
                            <OpenCameraBtn
                                disabled={media?.type === 'images' ? isMaxImages : !!media}
                                onAdd={onImageAdd}
                            />
                            <SelectGifBtn onSelectGif={onSelectGif} disabled={!!media} />
                            {!isMobile ? (
                                <Button
                                    onPress={onEmojiButtonPress}
                                    style={a.p_sm}
                                        disabled={!emojiEnabled}
                                    label={_(msg`Open emoji picker`)}
                                    accessibilityHint={_(msg`Opens emoji picker`)}
                                    variant="ghost"
                                    shape="round"
                                    color="primary">
                                    <EmojiSmile size="lg" />
                                </Button>
                            ) : null}
                        </ToolbarWrapper>
                    )}
                </LayoutAnimationConfig>
            </View>
            <View style={[a.flex_row, a.align_center, a.justify_between]}>
                <SelectLangBtn />
            </View>
        </View>
    )
}