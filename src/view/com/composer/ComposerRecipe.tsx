import {
    ActivityIndicator, KeyboardAvoidingView, StyleProp, StyleSheet, TextInput as NativeTextInput, ViewStyle,
} from "react-native";
import { View } from "react-native";
import { atoms as a, native, useTheme, web, type Theme } from '#/alf'
import { isAndroid, isIOS } from '#/platform/detection'
import { ComposerEmbeds, ToolbarWrapper, VideoUploadToolbar, useKeyboardVerticalOffset, useScrollTracker } from "./Composer";
import { SelectPhotoBtn } from '#/view/com/composer/photos/SelectPhotoBtn'
import { RecipePostDraft, RecipeReducerOutput, useRecipePostReducer } from "./state/composerRecipe";
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
import Animated, { FadeIn, FadeOut, LayoutAnimationConfig, LinearTransition, useAnimatedRef } from "react-native-reanimated";
import React, { PropsWithChildren, useCallback, useMemo, useRef, useState } from "react";
import { useWebMediaQueries } from "#/lib/hooks/useWebMediaQueries";
import { ImagePickerAsset } from "expo-image-picker";
import { EmbedAction, MAX_IMAGES } from "./state/composer";
import { ComposerImage } from "#/state/gallery";
import { Gif } from "#/state/queries/tenor";
import { EmojiArc_Stroke2_Corner0_Rounded as EmojiSmile } from '#/components/icons/Emoji'
import { SelectLangBtn } from "./select-language/SelectLangBtn";
import { useQueryClient } from "@tanstack/react-query";
import { uploadVideoDirect } from "./state/video";
import {
    EmojiPicker,
    type EmojiPickerPosition,
    type EmojiPickerState,
} from '#/view/com/composer/text-input/web/EmojiPicker'
import { TextInputRef, TextInput } from "./text-input/TextInput";
import { colors } from "#/lib/styles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsKeyboardVisible } from "#/lib/hooks/useIsKeyboardVisible";
import { RecipePostView } from "#/lib/api/feed/utils";
import { retry } from "#/lib/async/retry";
import { emitPostCreated } from "#/state/events";
import { logger } from "#/logger";
import * as Toast from '#/view/com/util/Toast'
import * as TextField from "#/components/forms/TextField";
import { Trash_Stroke2_Corner0_Rounded as TrashIcon } from '#/components/icons/Trash'
import { H2, Text } from "#/components/Typography";
import { PlusSmall_Stroke2_Corner0_Rounded as PlusIcon } from "#/components/icons/Plus"
import * as Menu from '#/components/Menu'
import { HITSLOP_20 } from '#/lib/constants'
import { DotGrid_Stroke2_Corner0_Rounded as Ellipsis } from '#/components/icons/DotGrid'
import { BottomSheetPortalProvider } from '../../../../modules/bottom-sheet'
import { ComboBox } from "#/components/forms/ComboBox";
import { recipeCategories, recipeCuisines, recipeDiets } from "./state/dataRecipe";
import { RecipeAttribution } from "./recipe/RecipeAttribution";
import { Accordion } from "../../../components/Accordion";
import { NutritionElement, nutritionFields } from "../recipe/NutritionFields";
import { CircleInfo_Stroke2_Corner0_Rounded as CircleInfo } from '#/components/icons/CircleInfo'
import { TimesLarge_Stroke2_Corner0_Rounded as X } from '#/components/icons/Times'


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

function errorBorder(t: Theme, err: unknown) {

  return err ? {
    backgroundColor: t.palette.negative_25,
    borderColor: t.palette.negative_300,
  } : {}
}

// TODO: NB fix description being focused first

export function ComposerRecipe({ edit }: { edit?: RecipePostView }) {
    const keyboardVerticalOffset = useKeyboardVerticalOffset()
    const { closeComposer } = useComposerControls()

  const reducerResult = useRecipePostReducer({ edit })
  const { state, dispatch } = reducerResult
    const agent = useAgent()
    const queryClient = useQueryClient()
    const [pickerState, setPickerState] = React.useState<EmojiPickerState>({
        isOpen: false,
        pos: { top: 0, left: 0, right: 0, bottom: 0, nextFocusRef: null },
    })
    const { _ } = useLingui()
    const [isPublishing, setIsPublishing] = useState(false)

    async function onPressPublish() {
      if (reducerResult.errors) {
        setDisplayErrors(true)
        return
      }
        setIsPublishing(true)
      try {
        if (edit) {
            await apilib.postRecipeRevision(agent, queryClient, {
                post: state,
                parentRevisionPost: edit
            })
        } else {
            const postUri = await apilib.postRecipe(agent, queryClient, {
                post: state,
            })

            try {
                await retry(5, () => true,
                    async () => {
                        const { data } = await agent.app.bsky.feed.getPosts({ uris: [postUri] })
                        if (data.posts.length < 1) {
                            throw new Error(`composer: app view is not ready`)
                        }

                    },
                  1e3)
            } catch (e) {
              logger.info(`recipe composer: waiting for app view failed`, {
                    safeMessage: e,
                })
            }
          emitPostCreated()
          closeComposer()
          Toast.show(_(msg`Your recipe has been published`))
        }
      } catch (e) {
        logger.error(`recipe composer: error publishing recipe`, {
          safeMessage: e
        })
        Toast.show(_(msg`There was an error publishing your recipe`), 'xmark')

      } finally {
        setIsPublishing(false)
      }

    }
    const { currentAccount } = useSession()
    const currentDid = currentAccount!.did

  const [displayErrors, setDisplayErrors] = useState(false)
  const errors = useMemo(() => displayErrors ? reducerResult.errors : undefined, [
    reducerResult.errors, displayErrors
  ])

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

    const titleInputRef = useRef<NativeTextInput>(null)
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

    const scrollViewRef = useAnimatedRef<Animated.ScrollView>()

    const {
        scrollHandler,
        onScrollViewContentSizeChange,
        onScrollViewLayout,
        topBarAnimatedStyle,
        bottomBarAnimatedStyle,
    } = useScrollTracker({
        scrollViewRef,
        stickyBottom: false, // TODO: check
    })

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
    const insets = useSafeAreaInsets()
    const [isKeyboardVisible] = useIsKeyboardVisible({ iosUseWillEvents: true })

    const t = useTheme()

    const viewStyles = useMemo(
        () => ({
            paddingTop: isAndroid ? insets.top : 0,
            paddingBottom:
                // iOS - when keyboard is closed, keep the bottom bar in the safe area
                (isIOS && !isKeyboardVisible) ||
                    // Android - Android >=35 KeyboardAvoidingView adds double padding when
                    // keyboard is closed, so we subtract that in the offset and add it back
                    // here when the keyboard is open
                    (isAndroid && isKeyboardVisible)
                    ? insets.bottom
                    : 0,
        }),
        [insets, isKeyboardVisible],
    )
    const onPressCancel = useCallback(() => {
        closeComposer()
    }, [closeComposer])

    return <BottomSheetPortalProvider>
        <KeyboardAvoidingView
            testID="composePostView"
            behavior={isIOS ? 'padding' : 'height'}
            keyboardVerticalOffset={keyboardVerticalOffset}
            style={a.flex_1}>
            <View
                style={[a.flex_1, viewStyles]}
                aria-modal
                accessibilityViewIsModal>
                <ComposerTopBar onCancel={onPressCancel} onPublish={onPressPublish}
            isPublishing={isPublishing} topBarAnimatedStyle={topBarAnimatedStyle}
          ><ErrorBanner errors={errors} onClearError={() => setDisplayErrors(false)} /></ComposerTopBar>

                <Animated.ScrollView
                    ref={scrollViewRef}
                    layout={native(LinearTransition)}
                    onScroll={scrollHandler}
                    contentContainerStyle={[a.flex_grow, a.gap_sm]}
                    onContentSizeChange={onScrollViewContentSizeChange}
                    onLayout={onScrollViewLayout}
                    bounces={false}
                    keyboardShouldPersistTaps="always"
                    style={[a.flex_1, {
                        paddingHorizontal: 8,
                    }]}
                >
            <TextField.Root isInvalid={!!errors?.tree?.name} >
                        <TextField.Input defaultValue={ /* Populate the initial name when creating a revision */ state.name}
                style={[a.pt_xs]}

                        inputRef={titleInputRef}
                        onChangeText={value => dispatch({ type: 'update_name', value })}
                autoFocus
                label={_(msg`Name`)}
              />
            </TextField.Root>

            <View style={[a.flex_row, a.flex_wrap, a.gap_md, a.align_center]} >
              <View style={[a.flex_row, a.gap_xs, a.border, t.atoms.border_contrast_low, a.rounded_sm, a.p_sm,
              { width: "40%" }]}>
                <View style={[{ width: "65%" }]}>
                  <TextField.Root isInvalid={!!errors?.tree?.recipeYield?.quantity} >
                    <TextField.Input inputMode="numeric" label={_(msg`Yield`)} defaultValue={state.recipeYield?.quantity}
                      onChangeText={value => dispatch({ type: 'set_yield', field: 'quantity', value })} />
                  </TextField.Root>
                            </View>
                            <View style={[{ width: "35%" }]}>
                  <TextField.Root isInvalid={!!errors?.tree?.recipeYield?.unit}>
                                    <TextField.Input label={_(msg`Unit`)} defaultValue={state.recipeYield?.unit}
                                        onChangeText={value => dispatch({ type: 'set_yield', field: 'unit', value })}
                                    />
                  </TextField.Root>
                            </View>
                        </View>

              <View style={[{ width: "40%" }, errorBorder(t, errors?.tree?.categories)]}>
                            <ComboBox options={recipeCategories} label={_(msg`Categories`)}
                                selection={state.categories ?? []}
                                onRemove={(value) => dispatch({ type: 'remove_element', field: 'categories', value })}
                                onSelect={(value) => dispatch({ type: 'add_element', field: 'categories', value })}
                />
                        </View>
                    </View>
                    <View style={[a.flex_row, a.flex_wrap, a.gap_md]}>
              <View style={[{ width: "40%" }, errorBorder(t, errors?.tree?.suitableForDiet)]}>

                            <ComboBox options={recipeDiets} label={_(msg`Suitable diets`)}
                                selection={state.suitableForDiet ?? []}
                  onRemove={(value) => dispatch({ type: 'remove_element', field: 'suitableForDiet', value })}
                                onSelect={(value) => dispatch({ type: 'add_element', field: 'suitableForDiet', value })}
                            />
                        </View>
              <View style={[{ width: "40%" }, errorBorder(t, errors?.tree?.suitableForDiet)]}>
                            <ComboBox options={recipeCuisines} label={_(msg`Cuisine type`)}
                                selection={state.cuisines ?? []}
                                onRemove={(value) => dispatch({ type: 'remove_element', field: 'cuisines', value })}
                                onSelect={(value) => dispatch({ type: 'add_element', field: 'cuisines', value })}
                            />
                        </View>
            </View>

            <View style={[a.flex_row, a.gap_md]}>
                        <View style={{ flexBasis: "40%" }}>
                <TextField.Root isInvalid={!!errors?.tree?.prepTime}>
                  <TextField.Input inputMode="numeric" label={_(msg`Preparation time`)} defaultValue={state.prepTime}
                    onChangeText={value => dispatch({ type: 'set_prep_time', value })} />
                  <TextField.SuffixText label={_(msg`minutes`)}><Trans>minutes</Trans></TextField.SuffixText>
                </TextField.Root >
              </View>
                        <View style={[{ flexBasis: "40%" }]}>
                <TextField.Root isInvalid={!!errors?.tree?.cookTime}>
                  <TextField.Input inputMode="numeric" label={_(msg`Cooking time`)} defaultValue={state.cookTime}
                    onChangeText={value => dispatch({ type: 'set_cook_time', value })} />
                                <TextField.SuffixText label={_(msg`minutes`)}><Trans>minutes</Trans></TextField.SuffixText>
                </TextField.Root>
                        </View>
                    </View>

            <View style={[{ backgroundColor: t.palette.contrast_50, }, errorBorder(t, errors?.tree?.text)]}>

                        {/* TODO fix color, width */}
                        <TextInput

                            ref={descriptionInputRef}
                            style={[a.pt_xs, a.w_full, { flexBasis: '100%' }]}
                            richtext={state.text}
                            placeholder={_(msg`Description`)}
                            webForceMinHeight={false}
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
                            accessibilityLabel={_(msg`Write recipe description`)}
                            hasRightPadding={false}
                        />
                    </View>
                    {/* Ingredients */}
                    <View style={[a.gap_sm]}>
                        <View style={[a.align_center]}>
                            <H2 style={[a.text_lg]}><Trans context="recipe">Ingredients</Trans></H2>
                        </View>
              <RecipeIngredients state={state} dispatch={dispatch} errors={errors} />

                    </View>

                    {/* Instructions */}
                    <View style={[a.gap_sm]}>
                        <View style={[a.align_center]}>
                            <H2 style={[a.text_lg]}><Trans context="recipe">Instructions</Trans></H2>
                        </View>
              <RecipeInstructions state={state} dispatch={dispatch} errors={errors} />
                    </View>

                    <Accordion heading={_(msg`Nutritional Information`)}>
              <RecipeNutrition state={state} dispatch={dispatch} errors={errors} />
                    </Accordion>
            <View style={errorBorder(t, errors?.tree?.attribution)}>
                    <Accordion heading={_(msg`Attribution`)}>
                        <RecipeAttribution value={state.attribution}
                            onChange={(value) => dispatch({ type: 'update_attribution', value })} />
                    </Accordion>
            </View>


                    <View>
                        <ComposerEmbeds
                            canRemoveQuote={true} // TODO: check this
                            embed={state.embed}
                            dispatch={dispatch}
                            clearVideo={() => { }}
                            isActivePost={true}
                        />
                    </View>
                </Animated.ScrollView>
                <ComposerFooter
                    emojiEnabled={focused === "description"}
                    post={state}
                    dispatch={dispatch}

                    onEmojiButtonPress={onEmojiButtonPress}
                    onError={() => { // TODO: handle

                    }}
                    onSelectVideo={selectVideo}
                />
                <EmojiPicker state={pickerState} close={onClosePicker} />


            </View>
        </KeyboardAvoidingView>
    </BottomSheetPortalProvider>

}

function ErrorBanner({ errors, onClearError }: { errors: RecipeReducerOutput["errors"], onClearError: () => void }) {
  const t = useTheme()
  const { _ } = useLingui()
  if (!errors?.flat.length) {
    return null
  }
  return <Animated.View
    style={[a.px_lg, a.pb_sm]}
    entering={FadeIn}
    exiting={FadeOut}>
    <View
      style={[
        a.px_md,
        a.py_sm,
        a.gap_xs,
        a.rounded_sm,
        t.atoms.bg_contrast_25,
      ]}>

      <View style={[a.relative, a.flex_row, a.gap_sm, { paddingRight: 48 }]}>
        <View>
          {errors.flat.map(issue => <View style={[a.flex_row, a.gap_sm]}>
            <CircleInfo fill={t.palette.negative_400} />
            <Text key={issue.path.join('-')} style={[a.flex_1, a.leading_snug, { paddingTop: 1 }]}>{_(issue.message)}</Text>
          </View>)}
        </View>
        <Button
          label={_(msg`Dismiss error`)}
          size="tiny"
          color="secondary"
          variant="ghost"
          shape="round"
          style={[a.absolute, { top: 0, right: 0 }]}
          onPress={onClearError}>
          <ButtonIcon icon={X} />
        </Button>
      </View>

    </View>
  </Animated.View>
}

function NutritionField({ unit, state, dispatch, field, label, subFields, errors }:
  NutritionElement & RecipeReducerOutput) {
  const { _ } = useLingui()
    return <View style={[a.gap_xs]}>
      <TextField.Root isInvalid={!!errors?.tree?.nutrition?.[field]}>
        <TextField.Input inputMode="numeric" value={state.nutrition?.[field] ?? ""} label={_(label)}
          onChangeText={value => dispatch({ type: 'update_nutrition', field, value })} />
            <TextField.SuffixText label={_(unit)} >{_(unit)}</TextField.SuffixText>
      </TextField.Root>
        <View style={[a.pl_md]}>
        {subFields?.map(subField => <NutritionField key={subField.field} {...subField} state={state} dispatch={dispatch} errors={errors} />)}
      </View>
    </View>
}

function RecipeNutrition({ state, dispatch, errors }: RecipeReducerOutput) {
    const { _ } = useLingui()

  return <View style={[a.gap_xs]}>
    <View style={[a.flex_row, a.gap_xs, a.align_center]}>
      <View>
        <TextField.Root>
          <TextField.Input inputMode="numeric" label={_(msg`Serving size`)}
            value={state.nutrition?.servingSize.quantity ?? ""} isInvalid={!!errors?.tree?.nutrition?.servingSize?.quantity}
            onChangeText={value => dispatch({ type: 'set_nutrition_serving', field: 'quantity', value })}
          />
        </TextField.Root>
            </View>
      <View style={{ width: "25%", marginRight: 'auto' }} >
        <TextField.Root isInvalid={!!errors?.tree?.nutrition?.servingSize?.unit}>
          <TextField.Input label={_(msg`Unit`)} value={state.nutrition?.servingSize.unit ?? ""}
            onChangeText={value => dispatch({ type: 'set_nutrition_serving', field: 'unit', value })}
          />
        </TextField.Root>
      </View>
      <View>
        <Button
          label={_(msg`Clear nutrition`)}
          variant="outline"
          color="negative"
          size="small"
          onPress={() => dispatch({ type: "clear_nutrition" })}>
          <ButtonText>
            <Trans>Clear</Trans>
          </ButtonText>
        </Button>
        </View>
    </View>
    {nutritionFields.map(field => <NutritionField key={field.field} {...field} state={state} dispatch={dispatch} errors={errors} />)}
    </View>
}



function RecipeIngredients({ state, dispatch, errors }: RecipeReducerOutput) {
    const { _ } = useLingui()
    const t = useTheme()

    return <View style={[a.gap_sm, a.border, a.p_sm, t.atoms.border_contrast_low, a.rounded_sm]}><View style={[a.gap_xs]}>
      {state.ingredients.map(({ id, name, quantity, unit }, i) =>
                <View style={[a.flex_row, a.gap_sm, a.flex_wrap]} key={id}>
                    {/* TODO rather use labels instead of placeholders for small screens */}

                    <View style={{ flexGrow: 1, flexBasis: '50%' }}>
                        <TextField.Root>
              <TextField.Input isInvalid={!!errors?.tree?.ingredients?.[i]?.name} label={_(msg`Item`)} defaultValue={name} onChangeText={value => {
                            dispatch({ type: "edit_ingredient", prop: "name", value, id })
                        }} />
            </TextField.Root>
          </View>

          <View style={{ flexBasis: "17%" }}>
            <TextField.Root isInvalid={!!errors?.tree?.ingredients?.[i]?.quantity}>
              <TextField.Input inputMode="numeric" label={_(msg`Quantity`)} defaultValue={quantity} onChangeText={value => {
                            dispatch({ type: "edit_ingredient", prop: "quantity", value, id })
              }} />
            </TextField.Root>
                    </View>
                    <View style={{ flexBasis: "11%" }}>
                        <TextField.Root>
                            <TextField.Input label={_(msg`Unit`)} defaultValue={unit} onChangeText={value => {
                            dispatch({ type: "edit_ingredient", prop: "unit", value, id })
              }} isInvalid={!!errors?.tree?.ingredients?.[i]?.unit} />
                        </TextField.Root>
                    </View>
                    <View style={{ justifyContent: "center" }}>
                        <Button
                            label={_(msg`Remove ingredient`)}
                            size="small"
                            variant="outline"
                            color="negative"
                            shape="round"
                            onPress={() => dispatch({ type: "remove_ingredient", id })}
                        >
                            <ButtonIcon icon={TrashIcon} />
                        </Button>
                    </View>
                </View>)}
        </View>
        <View >
            <Button
                size="small"
                variant="outline"
                color="primary"
                shape="round" onPress={() => {
                    dispatch({ type: "add_ingredient" })
                }} label={_(msgs.button_add_ingredient)}>
                <ButtonIcon icon={PlusIcon} />

            </Button>
        </View>
    </View>

}

function RecipeInstructions({ state, dispatch, errors }: RecipeReducerOutput) {
    const { _ } = useLingui()
    const t = useTheme()
    const hasMultiSections = state.instructionSections.length > 1 || state.instructionSections.at(0)?.name
    return <View >
      {state.instructionSections.map((section, i) => <View style={[a.border, a.p_sm, a.flex_grow, t.atoms.border_contrast_low, a.rounded_sm]}
            key={section.id}>
            <View>
                <View style={[a.gap_sm,]}>
                    {hasMultiSections &&
                        <View style={[a.flex_row,]}>
                            <View style={[a.align_center, a.mr_auto, a.flex_row, {
                                width: '30%'
                                // TODO: check on small screen

                            }]}>
                                <TextField.Root>
                                    <TextField.Input defaultValue={section.name} onChangeText={value => {
                                    dispatch({ type: "edit_section_name", sectionId: section.id, value })
                                }} label={_(msg`Section title`)} />
                                </TextField.Root>
                            </View>
                            <Menu.Root>
                                <Menu.Trigger label={_(msg`Instruction section options`)}>
                                    {({ props }) => {
                                        return <Button
                                            {...props}
                                            testID="sectionOptionsDropdownBtn"
                                            label={_(msg`More options`)}
                                            hitSlop={HITSLOP_20}
                                            variant="solid"
                                            color="secondary"
                                            size="small"
                                            shape="round">
                                            <ButtonIcon icon={Ellipsis} size="sm" />
                                        </Button>
                                    }}
                                </Menu.Trigger>
                                <Menu.Outer>
                                    <Menu.Item
                                        testID="sectionOptionsDeleteSection"
                                        label={_(msg`Remove section`)}
                                        onPress={() => dispatch({ type: 'remove_instruction_section', sectionId: section.id })}>
                                        <Menu.ItemText>
                                            <Trans>Delete Section</Trans>
                                        </Menu.ItemText>
                                    </Menu.Item>

                                </Menu.Outer>
                            </Menu.Root>
                        </View>}
                    <View style={[a.gap_xs]}>
                        {section.instructions.map(instruction =>
                            <View style={[a.flex_row, a.gap_sm]} key={instruction.id}>
                                <View style={[a.flex_grow]}>
                                    <TextField.Root>
                                        <TextField.Input label={_(msg`Instruction`)}
                                        defaultValue={instruction.text}
                                        onChangeText={value => {
                                            dispatch({
                                                type: "edit_instruction_text",
                                                sectionId: section.id,
                                                instructionId: instruction.id,
                                                value
                                            })
                                        }}
                                    />
                                    </TextField.Root>

                                </View>
                                <View style={{ justifyContent: "center" }}>
                                    <Button
                                        label={_(msg`Remove instruction`)}
                                        size="small"
                                        variant="outline"
                                        color="negative"
                                        shape="round"
                                        onPress={() => dispatch({
                                            type: "remove_instruction",
                                            sectionId: section.id,
                                            instructionId: instruction.id
                                        })}
                                    >
                                        <ButtonIcon icon={TrashIcon} />
                                    </Button>
                                </View>
                            </View>
                        )}
                    </View>
                    <View style={[a.flex_row]}>
                        <View style={[a.mr_auto]}>
                            <Button
                                size="small"
                                variant="outline"
                                color="primary"
                                shape="round" onPress={() => {
                                    dispatch({ type: "add_instruction", sectionId: section.id })
                                }} label={_(msg`Add instruction`)}>
                                <ButtonIcon icon={PlusIcon} />
                            </Button>
                        </View>
                        <View>
                            <Button
                                size="small"
                                variant="outline"
                                color="primary"
                                onPress={() => {
                                    dispatch({ type: "add_instruction_section", prevSectionId: section.id })
                                }} label={_(msg`Add section`)}>
                                <ButtonText><Trans>Add Section</Trans></ButtonText>
                            </Button>
                        </View>
                    </View>
                </View>

            </View>

      </View>)}
    </View>
}

// TODO: remove unused
const styles = StyleSheet.create({
    topbarInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        height: 54,
        gap: 4,
    },
    postBtn: {
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 6,
        marginLeft: 12,
    },
    stickyFooterWeb: web({
        position: 'sticky',
        bottom: 0,
    }),
    errorLine: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.red1,
        borderRadius: 6,
        marginHorizontal: 16,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 8,
    },
    reminderLine: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 6,
        marginHorizontal: 16,
        paddingHorizontal: 8,
        paddingVertical: 6,
        marginBottom: 8,
    },
    errorIcon: {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.red4,
        color: colors.red4,
        borderRadius: 30,
        width: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 5,
    },
    inactivePost: {
        opacity: 0.5,
    },
    addExtLinkBtn: {
        borderWidth: 1,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 10,
        marginBottom: 4,
    },
})

// TODO: add error child
function ComposerTopBar({
  topBarAnimatedStyle,
    onCancel,
    isPublishing,
    onPublish,
  children
}: PropsWithChildren<{
    topBarAnimatedStyle: StyleProp<ViewStyle>
    onCancel: () => void
    isPublishing: boolean
    onPublish: () => void

}>) {
    const { _ } = useLingui()
    return (
        <Animated.View
            style={topBarAnimatedStyle}
            layout={native(LinearTransition)}>
            <View style={styles.topbarInner}>
                <Button
                    label={_(msg`Cancel`)}
                    variant="ghost"
                    color="primary"
                    shape="default"
                    size="small"
                    style={[a.rounded_full, a.py_sm, { paddingLeft: 7, paddingRight: 7 }]}
                    onPress={onCancel}
                    accessibilityHint={_(
                        msg`Closes post composer and discards post draft`,
                    )}>
                    <ButtonText style={[a.text_md]}>
                        <Trans>Cancel</Trans>
                    </ButtonText>
                </Button>
                <View style={a.flex_1} />
                {isPublishing ? (

            <View style={styles.postBtn}>
              <ActivityIndicator />
            </View>

          ) : 
                    <Button
                        testID="composerPublishBtn"
                        label={_(
                            msg({
                                message: 'Publish recipe',
                                comment:
                                    'Accessibility label for button to publish a recipe',
                            }),
                        )
                        }
                        variant="solid"
                        color="primary"
              shape="default"
                        size="small"
                        style={[a.rounded_full, a.py_sm]}
                        onPress={onPublish}
            >
              <ButtonText style={[a.text_md]}>
                            <Trans context="action">Post</Trans>
                        </ButtonText>
            </Button>}

            </View>
        {children}
        </Animated.View>
    )
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