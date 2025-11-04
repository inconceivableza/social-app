import {useEffect, useMemo, useState} from 'react'
import {ScrollView, View} from 'react-native'
import {UITextView} from 'react-native-uitextview'
import {RichText as RichTextAPI} from '@atproto/api'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {padStart} from 'lodash'

import {type RecipePostView} from '#/lib/api/feed/utils'
import {countLines} from '#/lib/strings/helpers'
import {isAndroid} from '#/platform/detection'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as TextField from '#/components/forms/TextField'
import * as Toggle from '#/components/forms/Toggle'
import {Clock_Stroke2_Corner0_Rounded as ClockIcon} from '#/components/icons/Clock'
import {Pause_Filled_Corner0_Rounded as PauseIcon} from '#/components/icons/Pause'
import {Play_Filled_Corner0_Rounded as PlayIcon} from '#/components/icons/Play'
import {Trash_Stroke2_Corner0_Rounded as TrashIcon} from '#/components/icons/Trash'
import {ShowMoreTextButton} from '#/components/Post/ShowMoreTextButton'
import {RichText} from '#/components/RichText'
import {Text} from '#/components/Typography'
import {usePreparationState} from '../recipe-preparation/recipePreparation'

export const snapPoints = [isAndroid ? 'fullscreen' : '90%']

const COLLAPSED_LINE_LIMIT = 3
// Note: local storage is tied to the revision ID, so if the recipe is edited, progress inaccessible
export function Component({
  recipePost,
  onReviewRecipe,
}: {
  recipePost: RecipePostView
  onReviewRecipe: () => void
}) {
  const revision = recipePost.record
  const revisionContent = revision.revisionContent
  const t = useTheme()
  const {_} = useLingui()
  const [state, dispatch] = usePreparationState(revision)
  const richText = useMemo(
    () =>
      new RichTextAPI({
        text: revisionContent.text,
        facets: revisionContent.facets,
      }),
    [revisionContent],
  )
  const [limitLines, setLimitLines] = useState(
    () => countLines(richText.text) >= COLLAPSED_LINE_LIMIT,
  )
  const [timers, setTimers] = useState(
    {} as Record<`${number}-${number}`, boolean>,
  )

  return (
    <ScrollView style={[a.gap_sm, a.m_md]}>
      <View style={[a.py_sm]}>
        <Text style={[a.text_xl, a.font_bold]}>{revisionContent.name}</Text>
      </View>
      <View style={[a.py_sm]}>
        <RichText
          style={[
            {
              fontSize: a.text_sm.fontSize,
              lineHeight: a.text_sm.fontSize * 1.4,
            },
          ]}
          value={richText}
          numberOfLines={limitLines ? COLLAPSED_LINE_LIMIT : undefined}
        />
        {limitLines && (
          <ShowMoreTextButton
            style={[a.text_md]}
            onPress={() => setLimitLines(false)}
          />
        )}
      </View>
      <View style={[a.py_sm]}>
        <Text style={[a.text_lg, t.atoms.text_contrast_medium]}>
          <Trans context="recipe">Ingredients</Trans>
        </Text>
      </View>
      <View style={[a.ml_sm, a.py_xs]}>
        {revisionContent.ingredients.map((ingredient, i) => {
          return (
            <View key={i} style={[a.py_2xs]}>
              <Toggle.Item
                type="checkbox"
                label={_(msg`Toggle ingredient`)}
                name={`toggle_ingredient_${i}`}
                onChange={() => dispatch({type: 'toggle_ingredient', idx: i})}
                value={state.ingredients[i]?.checked}>
                <Toggle.Checkbox />
                <Toggle.LabelText
                  style={[
                    a.text_md,
                    a.font_normal,
                    {lineHeight: a.text_md.fontSize * 1.4},
                  ]}>
                  {`${ingredient.quantity} ${ingredient.unit} ${ingredient.name}`}
                </Toggle.LabelText>
              </Toggle.Item>
            </View>
          )
        })}
      </View>
      <View style={[a.py_sm]}>
        <Text style={[a.text_lg, t.atoms.text_contrast_medium]}>
          <Trans context="recipe">Instructions</Trans>
        </Text>
      </View>
      <View>
        {revisionContent.instructionSections.map(
          ({name, instructions}, sectionIdx) => {
            return (
              <View key={sectionIdx} style={[a.gap_sm, a.py_xs]}>
                {name && <Text style={[a.font_bold, a.py_2xs]}>{name}</Text>}
                <View style={[a.ml_sm, a.py_xs]}>
                  {instructions.map((instruction, instructionIdx) => {
                    const instructionKey =
                      `${sectionIdx}-${instructionIdx}` as const
                    const hasTimer = timers[instructionKey]
                    return (
                      <View
                        style={[
                          a.flex_row,
                          a.flex_wrap,
                          a.gap_md,
                          a.py_2xs,
                          a.align_baseline,
                        ]}
                        key={instructionIdx}>
                        <Toggle.Item
                          type="checkbox"
                          label={_(msg`Toggle instruction`)}
                          name={`toggle_instruction_${instructionIdx}`}
                          onChange={() =>
                            dispatch({
                              type: 'toggle_instruction',
                              sectionIdx,
                              instructionIdx,
                            })
                          }
                          value={
                            state.instructionSections[sectionIdx]?.[
                              instructionIdx
                            ]?.checked
                          }
                          style={[a.align_start, a.flex_1]}>
                          <Toggle.Checkbox />
                          <Toggle.LabelText
                            style={[
                              a.text_md,
                              a.font_normal,
                              {lineHeight: a.text_md.fontSize * 1.4},
                            ]}>
                            {`${instructionIdx + 1}. ${instruction.text}`}
                          </Toggle.LabelText>
                        </Toggle.Item>
                        {hasTimer ? (
                          <InstructionTimer
                            onDelete={() =>
                              setTimers(ts => {
                                delete ts[instructionKey]
                                return {...ts}
                              })
                            }
                          />
                        ) : (
                          <Button
                            label={_(msg`Create timer`)}
                            color="secondary"
                            variant="solid"
                            shape="round"
                            style={[a.flex_grow_0, a.p_2xs]}
                            onPress={() =>
                              setTimers(ts => ({...ts, [instructionKey]: true}))
                            }>
                            <ButtonIcon icon={ClockIcon} />
                            <ButtonText>+</ButtonText>
                          </Button>
                        )}
                      </View>
                    )
                  })}
                </View>
              </View>
            )
          },
        )}
      </View>
      <View style={[a.align_center, {marginTop: 4}]}>
        <Button
          size="large"
          variant="solid"
          color="primary"
          label={_(msg`Review Recipe`)}
          onPress={onReviewRecipe}>
          <ButtonText>
            <Trans>Review Recipe</Trans>
          </ButtonText>
        </Button>
      </View>
    </ScrollView>
  )
}

// Displays a duration in {hours}:{minutes}:{seconds} format
function displayTime(seconds: number) {
  let value = seconds
  const parts = [0, 0, 0]
  for (let i = parts.length - 1; i >= 0; i--) {
    parts[i] = Math.trunc(value % 60)
    value /= 60
  }
  return parts
    .map(v => {
      return padStart(v + '', 2, '0')
    })
    .join(':')
}

// TODO: play sound when time's up
// TODO: replace buttons with icons
function InstructionTimer({onDelete}: {onDelete: () => void}) {
  const [seconds, setSeconds] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [timingState, setTimingState] = useState<
    'inactive' | 'active' | 'paused' | 'complete'
  >('inactive')
  const [duration, setDuration] = useState({hours: 0, minutes: 0, seconds: 0}) // Duration in seconds
  const {_} = useLingui()
  const t = useTheme()

  const durationSeconds =
    duration.hours * 60 * 60 + duration.minutes * 60 + duration.seconds

  // TODO: ensure hours <= 24, minutes < 60, seconds < 60
  function durationCallback(field: keyof typeof duration) {
    return function (text: string) {
      const value = Number(text)
      if (Number.isNaN(value)) return

      setDuration(d => ({...d, [field]: value}))
    }
  }

  useEffect(() => {
    if (timingState !== 'active') return

    const durationSeconds =
      duration.hours * 60 * 60 + duration.minutes * 60 + duration.seconds
    const endTime = startTime + durationSeconds * 1000

    const id = setInterval(() => {
      const diff = endTime - Date.now()
      // TODO: handle this during validation
      if (diff > 1000 * 60 * 60 * 24) {
        clearInterval(id)
      }

      if (diff <= 0) {
        clearInterval(id)
        setSeconds(0)
        setTimingState('complete')
        // TODO: play sound - there's already /assets/dm.mp3, vibrate, visual indicator
        // and test that alert occurs when in background
        return
      }
      setSeconds(Math.round(diff / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [timingState, startTime, duration])
  // TODO: used controlled inputs (prevents non numerical values)
  return timingState === 'inactive' ? (
    <View style={[a.flex_row, a.gap_2xs, a.mb_sm, a.align_baseline]}>
      <View style={[a.p_0, a.m_0, a.flex_col, a.flex_1, a.align_baseline]}>
        <TextField.Root>
          <TextField.Input
            style={[a.p_0, a.m_0, {height: 40}]}
            selectTextOnFocus
            onChangeText={durationCallback('hours')}
            inputMode="decimal"
            label={_(msg`Hours`)}
            defaultValue="00"
          />
          <TextField.SuffixText style={[a.p_0, a.m_0]} label={_(msg`h`)}>
            h
          </TextField.SuffixText>
        </TextField.Root>
      </View>
      <View style={[a.p_0, a.m_0, a.flex_col, a.flex_1]}>
        <TextField.Root>
          <TextField.Input
            style={[a.p_0, a.m_0, {height: 40}]}
            selectTextOnFocus
            onChangeText={durationCallback('minutes')}
            inputMode="decimal"
            label={_(msg`Minutes`)}
            defaultValue="00"
          />
          <TextField.SuffixText style={[a.p_0, a.m_0]} label={_(msg`m`)}>
            m
          </TextField.SuffixText>
        </TextField.Root>
      </View>
      <View style={[a.p_0, a.m_0, a.flex_col, a.flex_1]}>
        <TextField.Root>
          <TextField.Input
            style={[a.p_0, a.m_0, {height: 40}]}
            selectTextOnFocus
            onChangeText={durationCallback('seconds')}
            inputMode="decimal"
            label={_(msg`Seconds`)}
            defaultValue="00"
          />
          <TextField.SuffixText style={[a.p_0, a.m_0]} label={_(msg`s`)}>
            s
          </TextField.SuffixText>
        </TextField.Root>
      </View>
      <View style={[a.flex_col, a.flex_1, {maxHeight: 24}]}>
        <Button
          disabled={durationSeconds <= 0}
          label={_(msg`Start timing`)}
          style={{height: 28}}
          variant="solid"
          color="primary"
          size="small"
          shape="round"
          onPress={() => {
            if (durationSeconds <= 0) return
            setSeconds(durationSeconds)
            setStartTime(Date.now())
            setTimingState('active')
          }}>
          <ButtonIcon icon={PlayIcon} />
        </Button>
      </View>
    </View>
  ) : (
    <View
      style={[
        a.flex_row,
        a.align_baseline,
        a.gap_sm,
        a.p_sm,
        {borderWidth: 1, borderRadius: 4, borderColor: t.palette.primary_400},
      ]}>
      <View>
        <UITextView
          style={[
            a.font_bold,
            timingState === 'complete' ? {color: t.palette.negative_300} : {},
            {fontFamily: 'monospace'},
          ]}>
          {displayTime(seconds)}
        </UITextView>
      </View>
      {timingState === 'active' && (
        <Button
          label={_(msg`Pause timer`)}
          onPress={() => {
            const hours = Math.trunc(seconds / 3600)
            const minuteSeconds = seconds - hours * 3600
            setDuration({
              hours,
              minutes: Math.trunc(minuteSeconds / 60),
              seconds: minuteSeconds % 60,
            })
            setStartTime(Date.now())
            setTimingState('paused')
          }}>
          <ButtonIcon icon={PauseIcon} size="xs" />
        </Button>
      )}
      {timingState === 'paused' && (
        <Button
          label={_(msg`Play timer`)}
          onPress={() => {
            setStartTime(Date.now())
            setTimingState('active')
          }}>
          <ButtonIcon icon={PlayIcon} size="xs" />
        </Button>
      )}
      <Button label={_(msg`Quit timer`)} onPress={onDelete}>
        <ButtonIcon icon={TrashIcon} size="xs" />
      </Button>
    </View>
  )
}
