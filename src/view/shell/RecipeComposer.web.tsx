import { useA11y } from "#/state/a11y"
import { useModals } from "#/state/modals"
import { RecipeComposerOpts, useComposerState } from "#/state/shell/composer"
import { DismissableLayer, FocusGuards, FocusScope } from "radix-ui/internal"
import { useComposerCancelRef } from "../com/composer/Composer"
import { StyleSheet, View } from 'react-native'
import { atoms as a, flatten, useBreakpoints, useTheme } from '#/alf'
import { ComposerRecipe } from "../com/composer/ComposerRecipe"
import { RemoveScrollBar } from "react-remove-scroll-bar"

export function RecipeComposer({ }: { winHeight: number }) {
    const state = useComposerState()
    const isActive = !!(state?.type === "recipe")

    if (!isActive) {
        return null
    }

    return (
        <>
            <RemoveScrollBar />
            <Inner state={state} />
        </>
    )
}


function Inner({ state }: { state: RecipeComposerOpts }) {
    const ref = useComposerCancelRef()
    const { isModalActive } = useModals()
    const t = useTheme()
    const { gtMobile } = useBreakpoints()
    const { reduceMotionEnabled } = useA11y()

    FocusGuards.useFocusGuards()

    return (
        <FocusScope.FocusScope loop trapped asChild>
            <DismissableLayer.DismissableLayer
                role="dialog"
                aria-modal
                style={flatten([
                    { position: 'fixed' },
                    a.inset_0,
                    { backgroundColor: '#000c' },
                    a.flex,
                    a.flex_col,
                    a.align_center,
                    !reduceMotionEnabled && a.fade_in,
                ])}
                onFocusOutside={evt => evt.preventDefault()}
                onInteractOutside={evt => evt.preventDefault()}
                onDismiss={() => {
                    // TEMP: remove when all modals are ALF'd -sfn
                    if (!isModalActive) {
                        ref.current?.onPressCancel()
                    }
                }}>
                <View
                    style={[
                        styles.container,
                        !gtMobile && styles.containerMobile,
                        t.atoms.bg,
                        t.atoms.border_contrast_medium,
                        !reduceMotionEnabled && [
                            a.zoom_fade_in,
                            { animationDelay: 0.1 },
                            { animationFillMode: 'backwards' },
                        ],
                    ]}>
                    <ComposerRecipe edit={state.edit} />
                </View>
            </DismissableLayer.DismissableLayer>
        </FocusScope.FocusScope>
    )
}
const BOTTOM_BAR_HEIGHT = 61
const styles = StyleSheet.create({
    container: {
        marginTop: 50,
        maxWidth: 600,
        width: '100%',
        paddingVertical: 0,
        borderRadius: 8,
        marginBottom: 0,
        borderWidth: 1,
        // @ts-expect-error web only
        maxHeight: 'calc(100% - (40px * 2))',
        overflow: 'hidden',
    },
    containerMobile: {
        borderRadius: 0,
        marginBottom: BOTTOM_BAR_HEIGHT,
        // @ts-expect-error web only
        maxHeight: `calc(100% - ${BOTTOM_BAR_HEIGHT}px)`,
    },
})


