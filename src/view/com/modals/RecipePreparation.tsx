import { useTheme, atoms as a } from "#/alf";
import { H1, H2, H3, Text } from "#/components/Typography";
import { RichText as RichTextAPI } from "@atproto/api";
import { Trans, msg } from "@lingui/macro";
import { View } from "react-native";
import * as Toggle from '#/components/forms/Toggle'

import { usePreparationState } from "../recipe-preparation/recipePreparation";
import { useLingui } from "@lingui/react";
import { useEffect, useMemo, useState } from "react";
import { padStart } from "lodash"
import { Button, ButtonIcon, ButtonText } from "#/components/Button";

import * as TextField from '#/components/forms/TextField'
import { RichText } from "#/components/RichText";
import { ShowMoreTextButton } from "#/components/Post/ShowMoreTextButton";
import { countLines } from "#/lib/strings/helpers";
import { Clock_Stroke2_Corner0_Rounded as ClockIcon } from "#/components/icons/Clock"
import { RecipePostView } from "#/lib/api/feed/utils";
import { Trash_Stroke2_Corner0_Rounded as TrashIcon } from "#/components/icons/Trash"
import { Play_Filled_Corner0_Rounded as PlayIcon } from "#/components/icons/Play"


export const snapPoints = ['fullscreen']

const COLLAPSED_LINE_LIMIT = 3
// Note: local storage is tied to the revision ID, so if the recipe is edited, progress inaccessible
// TODO: handle scrolling
export function Component({ recipePost, onReviewRecipe }: {
    recipePost: RecipePostView,
    onReviewRecipe: () => void
}) {
    const revision = recipePost.record
    const revisionContent = revision.revisionContent
    const t = useTheme()
    const { _ } = useLingui()
    const [state, dispatch] = usePreparationState(revision)
    const richText = useMemo(() => new RichTextAPI({
        text: revisionContent.text,
        facets: revisionContent.facets
    }),
        [revisionContent])
    const [limitLines, setLimitLines] = useState(() => countLines(richText.text) >= COLLAPSED_LINE_LIMIT)
    const [timers, setTimers] = useState({} as Record<`${number}-${number}`, boolean>)

    return <View style={[a.gap_sm]}>
        <View>
            <H1 style={[a.text_lg, a.font_bold]}>{revisionContent.name}</H1>
        </View>
        <View>
            <RichText value={richText} numberOfLines={limitLines ? COLLAPSED_LINE_LIMIT : undefined} />
            {limitLines && (
                <ShowMoreTextButton style={[a.text_md]} onPress={() => setLimitLines(false)} />
            )}
        </View>
        <View >
            <H2 style={[a.text_lg, t.atoms.text_contrast_medium]}>
                <Trans context="recipe">Ingredients</Trans>
            </H2>
        </View>
        <View style={[a.ml_sm]}>
            {revisionContent.ingredients.map((ingredient, i) => {
                return <View key={i} >
                    <Toggle.Item type="checkbox" label={_(msg`Toggle ingredient`)}
                        name={`toggle_ingredient_${i}`}
                        onChange={() => dispatch({ type: 'toggle_ingredient', idx: i })}
                        value={state.ingredients[i]?.checked}
                    >
                        <Toggle.Checkbox />
                        <Toggle.LabelText style={[a.text_md]}>
                            {`${ingredient.quantity} ${ingredient.unit} ${ingredient.name}`}
                        </Toggle.LabelText>
                    </Toggle.Item>
                </View>
            })}

        </View>
        <View >
            <H2 style={[a.text_lg, t.atoms.text_contrast_medium]}>
                <Trans context="recipe">Instructions</Trans>
            </H2>
        </View>
        <View>
            {revisionContent.instructionSections.map(({ name, instructions }, sectionIdx) => {
                return <View key={sectionIdx} style={[a.gap_sm]}>
                    {name && <H3 style={[a.font_bold]}>{name}</H3>}
                    <View style={[a.ml_sm]}>

                        {instructions.map((instruction, instructionIdx) => {
                            const instructionKey = `${sectionIdx}-${instructionIdx}` as const
                            const hasTimer = timers[instructionKey]
                            return <View
                                style={[a.flex_row, a.gap_md]} key={instructionIdx}>
                            <Toggle.Item type="checkbox" label={_(msg`Toggle instruction`)}
                                name={`toggle_ingredient_${instructionIdx}`}
                                onChange={() => dispatch({ type: 'toggle_instruction', sectionIdx, instructionIdx })}
                                value={state.instructionSections[sectionIdx]?.[instructionIdx]?.checked}
                            >
                                <Toggle.Checkbox />
                                <Toggle.LabelText style={[a.text_md]}>
                                        {`${instructionIdx + 1}. ${instruction.text}`}
                                </Toggle.LabelText>
                            </Toggle.Item>
                                {hasTimer ?
                                    <InstructionTimer onDelete={() => setTimers(ts => {
                                        delete ts[instructionKey]
                                        return { ...ts }
                                    })} /> :
                                    <Button label={_(msg`Create timer`)} color="primary" variant="outline" shape="round"
                                        style={{ borderColor: 'transparent' }} onPress={() =>
                                            setTimers(ts => ({ ...ts, [instructionKey]: true }))
                                        }>
                                        <ButtonIcon icon={ClockIcon} />
                                        <ButtonText>+</ButtonText>
                                    </Button>}
                            </View>
                        })}
                    </View>
                </View>
            })}
        </View>
        <View style={[a.align_center, { marginTop: 4 }]}>
            <Button style={{ width: "30%" }} size="large" variant="solid" color="primary" label={_(msg`Review recipe`)} onPress={onReviewRecipe}>
                <ButtonText><Trans>Review recipe</Trans></ButtonText>
            </Button>
        </View>
    </View>
}

// Displays a duration in {hours}:{minutes}:{seconds} format
function displayTime(seconds: number) {
    let value = seconds
    const parts = [0, 0, 0]
    for (let i = parts.length - 1; i >= 0; i--) {
        parts[i] = Math.trunc(value % 60)
        value /= 60
    }
    return parts.map(v => {
        return padStart(v + "", 2, "0")
    }).join(":")
}

// TODO: play sound when time's up
// TODO: replace buttons with icons
function InstructionTimer({ onDelete }: { onDelete: () => void }) {
    const [seconds, setSeconds] = useState(0)
    const [timingState, setTimingState] = useState<"inactive" | "active" | "complete">("inactive")
    const [duration, setDuration] = useState({ hours: 0, minutes: 0, seconds: 0 })  // Duration in seconds
    const { _ } = useLingui()
    const t = useTheme()

    const durationSeconds = duration.hours * 60 * 60 + duration.minutes * 60 + duration.seconds

    // TODO: ensure hours <= 24, minutes < 60, seconds < 60
    function durationCallback(field: keyof typeof duration) {
        return function (text: string) {
            const value = Number(text)
            if (Number.isNaN(value)) return;

            setDuration(d => ({ ...d, [field]: value }))
        }
    }

    useEffect(() => {
        if (timingState !== "active") return;

        const durationSeconds = duration.hours * 60 * 60 + duration.minutes * 60 + duration.seconds
        const endTime = Date.now() + durationSeconds * 1000

        const id = setInterval(() => {
            const diff = endTime - Date.now()
            // TODO: handle this during validation
            if (diff > 1000 * 60 * 60 * 24) {
                clearInterval(id)
            }

            if (diff <= 0) {
                clearInterval(id)
                setSeconds(0)
                setTimingState("complete")
                // TODO: play sound - there's already /assets/dm.mp3, vibrate, visual indicator
                // and test that alert occurs when in background
                return
            }
            setSeconds(Math.round(diff / 1000))
        }, 1000)
        return () => clearInterval(id)
    }, [timingState, duration])
    // TODO: used controlled inputs (prevents non numerical values)
    return timingState === "inactive" ?
        <View style={[a.flex_row, { width: "30%" }, a.gap_xs, a.mb_sm]}>
            <View style={[{ width: "33%" }]}>
                <TextField.Root>
                    <TextField.Input style={{ height: 24 }} selectTextOnFocus onChangeText={durationCallback("hours")}
                        inputMode="decimal" label={_(msg`Hours`)} defaultValue="00" />
                </TextField.Root>
            </View>
            <View style={[a.justify_center]}><Text>:</Text></View>
            <View style={[{ width: "33%" }]}>
                <TextField.Root>
                    <TextField.Input style={{ height: 24 }} selectTextOnFocus onChangeText={durationCallback("minutes")}
                        inputMode="decimal" label={_(msg`Minutes`)} defaultValue="00" />
                </TextField.Root>
            </View>
            <View style={[a.justify_center]}><Text>:</Text></View>
            <View style={[{ width: "33%" }]}>
                <TextField.Root>
                    <TextField.Input style={{ height: 24 }} selectTextOnFocus onChangeText={durationCallback("seconds")}
                        inputMode="decimal" label={_(msg`Seconds`)} defaultValue="00" />
                </TextField.Root>
            </View>
            <View style={{ maxHeight: 24 }}>
                <Button disabled={durationSeconds <= 0} label={_(msg`Start timing`)} style={{ height: 28 }}
                    variant="solid" color="primary" size="small" shape="round" onPress={() => {
                    if (durationSeconds <= 0) return;
                        setSeconds(durationSeconds)
                    setTimingState("active")
                }}>
                    <ButtonIcon icon={PlayIcon} />
            </Button>
            </View>
        </View> : <View style={[a.flex_row, a.align_center, a.gap_sm, a.p_sm,
        { borderWidth: 1, borderRadius: 4, borderColor: t.palette.primary_400 }]}>
            <View>
                <Text style={[a.font_bold,
                a.leading_tight,
                timingState === "complete" ? { color: t.palette.negative_300 } : {}]}>
                    {displayTime(seconds)}
                </Text>

            </View>
            <Button label={_(msg`Stop timer`)} onPress={onDelete}>
                <ButtonIcon icon={TrashIcon} />
            </Button>
        </View>
}


