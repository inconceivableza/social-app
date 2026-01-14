import { useEffect, useMemo, useState } from 'react'
import { ScrollView, TextStyle, View } from 'react-native'
import { runOnJS } from 'react-native-reanimated'
import { UITextView } from 'react-native-uitextview'
import * as Notifications from 'expo-notifications'
import { RichText as RichTextAPI } from '@atproto/api'
import { msg, Trans } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { padStart } from 'lodash'

import { type RecipePostView } from '#/lib/api/feed/utils'
import { useHaptics } from '#/lib/haptics'
import { countLines } from '#/lib/strings/helpers'
import { isAndroid, isNative } from '#/platform/detection'
import { atoms as a, useTheme } from '#/alf'
import { Button, ButtonIcon, ButtonText } from '#/components/Button'
import * as TextField from '#/components/forms/TextField'
import * as Toggle from '#/components/forms/Toggle'
import { Clock_Stroke2_Corner0_Rounded as ClockIcon } from '#/components/icons/Clock'
import { Pause_Filled_Corner0_Rounded as PauseIcon } from '#/components/icons/Pause'
import { Play_Filled_Corner0_Rounded as PlayIcon } from '#/components/icons/Play'
import { PlusLarge_Stroke2_Corner0_Rounded as PlusIcon } from '#/components/icons/Plus'
import { Trash_Stroke2_Corner0_Rounded as TrashIcon } from '#/components/icons/Trash'
import { ShowMoreTextButton } from '#/components/Post/ShowMoreTextButton'
import { RichText } from '#/components/RichText'
import { Text } from '#/components/Typography'
import { usePreparationState } from '../recipe-preparation/recipePreparation'

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
  const playHaptic = useHaptics()
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
  const scheduleLocalNotification = async (instructionKey: string) => {
    if (isNative) {
      console.log('Notification being scheduled')
      const instructionSection =
        revisionContent.instructionSections[
        Number(instructionKey.split('-')[0])
        ]
      const sectionName = instructionSection?.name
        ? `${instructionSection.name} - `
        : ''
      const instructionNumber = Number(instructionKey.split('-')[1]) + 1
      await Notifications.scheduleNotificationAsync({
        content: {
          title: _(msg`Recipe timer finished`),
          body: _(
            msg`The countdown for instruction ${sectionName}${instructionNumber} in recipe ${revisionContent.name} has finished.`,
          ),
          data: { reason: 'timer', subject: recipePost.uri, instructionKey },
          sound: 'timer.aiff',
        },
        trigger: {
          seconds: 1,
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          channelId: 'timer',
        },
      })
      console.log('Notification scheduled')
    } else {
      console.log('No notifications on web')
    }
    runOnJS(playHaptic)('Heavy')
  }

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
      <View style={a.gap_sm}>
        {revisionContent.ingredientSections.map(({ name, ingredients }, sectionIdx) => {
          return (
            <View key={sectionIdx} style={[a.gap_sm]}>
              {name && <Text style={[a.font_bold, a.py_2xs]}>{name}</Text>}
              <View style={[a.ml_sm, a.gap_xs]}>
                {ingredients.map((ingredient, ingredientIdx) => {

                  return <View key={ingredientIdx} style={[a.py_2xs]}>
                    <Toggle.Item
                      type="checkbox"
                      label={_(msg`Toggle ingredient`)}
                      name={`toggle_ingredient_${ingredientIdx}`}
                      onChange={() => dispatch({ type: 'toggle_ingredient', ingredientIdx, sectionIdx })}
                      value={state.ingredientSections[sectionIdx]?.[ingredientIdx]?.checked}>
                      <Toggle.Checkbox />
                      <Toggle.LabelText
                        style={[
                          a.text_md,
                          a.font_normal,
                          { lineHeight: a.text_md.fontSize * 1.4 },
                        ]}>
                        {[ingredient.quantity, ingredient.unit, ingredient.name].filter(Boolean).join(" ")}
                      </Toggle.LabelText>
                    </Toggle.Item>
                  </View>
                })}
              </View>
            </View>

          )
        })}
      </View>
      <View style={[a.py_sm]}>
        <Text style={[a.text_lg, t.atoms.text_contrast_medium]}>
          <Trans context="recipe">Instructions</Trans>
        </Text>
      </View>
      <View style={a.gap_sm}>
        {revisionContent.instructionSections.map(
          ({ name, instructions }, sectionIdx) => {
            return (
              <View key={sectionIdx} style={[a.gap_sm]}>
                {name && <Text style={[a.font_bold, a.py_2xs]}>{name}</Text>}
                <View style={[a.ml_sm, a.gap_xs, a.flex_1]}>
                  {instructions.map((instruction, instructionIdx) => {
                    const instructionKey =
                      `${sectionIdx}-${instructionIdx}` as const
                    const hasTimer = timers[instructionKey]
                    return (
                      <View key={instructionIdx}>
                        <View
                          style={[
                            a.flex_row,
                            a.gap_md,
                            a.py_2xs,
                            a.align_end,
                            a.flex_1
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
                              emoji
                              style={[
                                a.text_md,
                                a.font_normal,
                                { lineHeight: a.text_md.fontSize * 1.4 },
                                a.flex_grow,
                                a.flex_shrink,
                              ]}>
                              {`${instructionIdx + 1}. ${instruction.text}`}
                            </Toggle.LabelText>
                          </Toggle.Item>
                          {
                            <Button
                              label={_(msg`Create timer`)}
                              color="secondary"
                              variant="solid"
                              shape="round"
                              style={[
                                a.flex_grow_0,
                                a.py_2xs,
                                a.px_sm,
                                a.mx_2xs,
                                hasTimer && {opacity: 0},
                              ]}
                              onPress={() =>
                                setTimers(ts => ({
                                  ...ts,
                                  [instructionKey]: !ts[instructionKey],
                                }))
                              }>
                              <ButtonIcon icon={ClockIcon} />
                            </Button>
                          }
                        </View>
                        {hasTimer && (
                          <InstructionTimer
                            onDelete={() =>
                              setTimers(ts => {
                                delete ts[instructionKey]
                                return { ...ts }
                              })
                            }
                            onNotify={() =>
                              scheduleLocalNotification(instructionKey)
                            }
                          />
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
      <View style={[a.align_center, a.mt_md]}>
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
function InstructionTimer({
  onDelete,
  onNotify,
}: {
  onDelete: () => void
  onNotify: () => void
}) {
  const [seconds, setSeconds] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [timingState, setTimingState] = useState<
    'inactive' | 'active' | 'paused' | 'complete'
  >('inactive')
  const [duration, setDuration] = useState({ hours: 0, minutes: 0, seconds: 0 }) // Duration in seconds
  const [durationText, setDurationText] = useState({hours: '00', minutes: '00', seconds: '00'}) // Duration in seconds
  const {_} = useLingui()
  const t = useTheme()

  const durationSeconds =
    duration.hours * 60 * 60 + duration.minutes * 60 + duration.seconds

  // TODO: ensure hours <= 24, minutes < 60, seconds < 60
  function durationCallback(field: keyof typeof duration) {
    return function (text: string) {
      if (text.length > 2) text = text.substring(text.length-2)
      setDurationText(d => ({...d, [field]: text.padStart(2, '0')}))
      const value = Number(text)
      if (Number.isNaN(value)) return
      setDuration(d => ({ ...d, [field]: value }))
    }
  }

  function onAnotherMinute() {
    setDuration({
      hours: duration.hours,
      minutes: duration.minutes + 1,
      seconds: duration.seconds,
    })
    setDurationText({
      hours: String(duration.hours).padStart(2, '0'),
      minutes: String(duration.minutes + 1).padStart(2, '0'),
      seconds: String(duration.seconds).padStart(2, '0'),
    })
    if (timingState === 'active' || timingState === 'paused') {
      setSeconds(seconds + 60)
    } else if (timingState === 'complete') {
      setSeconds(seconds + 60)
      setTimingState('paused')
    }
  }

  useEffect(() => {
    if (timingState !== 'active' || startTime === null) return

    const endTime = startTime + durationSeconds * 1000

    const id = setInterval(() => {
      const diff = endTime - Date.now()
      // TODO: handle this during validation
      if (diff > 1000 * 60 * 60 * 24) {
        clearInterval(id)
      }

      if (diff <= 0) {
        clearInterval(id)
        setDuration({ hours: 0, minutes: 0, seconds: 0 })
        setSeconds(0)
        setTimingState('complete')
        onNotify()
        return
      }
      setSeconds(Math.round(diff / 1000))
    }, 250)
    return () => clearInterval(id)
  }, [timingState, startTime, durationSeconds, onNotify])
  // TODO: used controlled inputs (prevents non numerical values)
  const timerButtonSize = isAndroid ? 'sm' : 'xs'
  const th = 28, tmw = isNative ? 32 : 28
  const timeInputRootStyle = [a.py_0, a.px_2xs, a.m_0]
  const timeInputViewStyle = [a.p_0, a.m_0, a.flex_col, a.flex_1, a.align_baseline, a.flex_shrink, isAndroid && {maxWidth: 62}, {borderColor: 'transparent', borderWidth: 2}]
  const clockFont: TextStyle = {fontFamily: 'Inter-Regular, monospace, ui-monospace', fontVariant: ['tabular-nums']}
  const timeInputTextStyle = [a.pt_0, a.pb_0, a.pr_2xs, a.pl_xs, a.m_0, {height: th, maxWidth: tmw}, a.align_baseline, clockFont]
  const timeInputSuffixStyle = [a.p_0, a.pr_0, a.m_0, a.align_baseline]
  return timingState === 'inactive' ? (
    <View
      style={[a.flex_row, a.gap_xs, a.pt_xs, a.mb_sm, a.align_center, a.flex_shrink, { alignSelf: 'flex-end' }]}>
      <View style={timeInputViewStyle}>
        <TextField.Root style={timeInputRootStyle}>
          <TextField.Input
            style={timeInputTextStyle}
            selectTextOnFocus
            onChangeText={durationCallback('hours')}
            inputMode="decimal"
            label={_(msg`Hours`)}
            value={durationText.hours}
            editable
            manualOverrideFonts
          />
          <TextField.SuffixText style={timeInputSuffixStyle} label={_(msg`h`)}>
            h
          </TextField.SuffixText>
        </TextField.Root>
      </View>
      <View style={timeInputViewStyle}>
        <TextField.Root style={timeInputRootStyle}>
          <TextField.Input
            style={timeInputTextStyle}
            selectTextOnFocus
            onChangeText={durationCallback('minutes')}
            inputMode="decimal"
            label={_(msg`Minutes`)}
            value={durationText.minutes}
            editable
            manualOverrideFonts
          />
          <TextField.SuffixText style={timeInputSuffixStyle} label={_(msg`m`)}>
            m
          </TextField.SuffixText>
        </TextField.Root>
      </View>
      <View style={timeInputViewStyle}>
        <TextField.Root style={timeInputRootStyle}>
          <TextField.Input
            style={timeInputTextStyle}
            selectTextOnFocus
            onChangeText={durationCallback('seconds')}
            inputMode="decimal"
            label={_(msg`Seconds`)}
            value={durationText.seconds}
            editable
            manualOverrideFonts
          />
          <TextField.SuffixText style={timeInputSuffixStyle} label={_(msg`s`)}>
            s
          </TextField.SuffixText>
        </TextField.Root>
      </View>
      <View
        style={[
          a.px_xs,
          a.m_0,
          a.flex_row,
          a.flex_0,
          {alignItems: 'center'},
          a.flex_shrink,
          a.gap_sm,
        ]}>
        <Button
          disabled={durationSeconds <= 0}
          label={_(msg`Start timing`)}
          variant="ghost"
          color={durationSeconds <= 0 ? 'secondary' : 'primary'}
          onPress={() => {
            if (durationSeconds <= 0) return
            setSeconds(durationSeconds)
            setStartTime(Date.now())
            setTimingState('active')
          }}>
          <ButtonIcon icon={PlayIcon} size={timerButtonSize}/>
        </Button>
        <Button
          label={_(msg`Cancel timer setup`)}
          onPress={onDelete}
          variant="ghost"
          color="primary">
          <ButtonIcon icon={TrashIcon} size={timerButtonSize}/>
        </Button>
        <Button
          label={_(msg`Add another minute`)}
          onPress={onAnotherMinute}
          variant="ghost"
          color="primary">
          <ButtonIcon icon={PlusIcon} size={timerButtonSize}/>
        </Button>
      </View>
    </View>
  ) : (
    <View
      style={[
        a.flex_row,
        a.flex_shrink,
        {alignSelf: 'flex-end'},
        a.gap_sm,
        a.p_0,
        a.pt_xs,
        a.mb_sm,
      ]}>
      <View style={[a.z_10,
                  a.inset_0,
                  a.rounded_sm,
                  t.atoms.bg_contrast_50,
                  {borderColor: 'transparent', borderWidth: 2},
                  a.px_sm,
                  {alignContent: 'center'},
                  ]}>
        <UITextView
          style={[
            timingState === 'complete'
              ? { color: t.palette.negative_300 }
              : timingState === 'paused'
                  ? { color: t.palette.contrast_700 }
                  : {},
            clockFont,
            {height: th, alignContent: 'center'},
          ]}>
          {displayTime(seconds)}
        </UITextView>
      </View>
      <View
        style={[
          a.px_xs,
          a.m_0,
          a.flex_row,
          a.flex_0,
          {alignItems: 'center'},
          a.flex_shrink,
          a.gap_sm,
        ]}>
        {(timingState === 'active' || timingState === 'complete') && (
          <Button
            label={_(msg`Pause timer`)}
            disabled={timingState === 'complete'}
            variant="ghost"
            color={timingState === 'complete' ? 'secondary' : 'primary'}
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
            <ButtonIcon icon={PauseIcon} size={timerButtonSize} />
          </Button>
        )}
        {timingState === 'paused' && (
          <Button
            label={_(msg`Play timer`)}
            onPress={() => {
              setStartTime(Date.now())
              setTimingState('active')
            }}>
            <ButtonIcon icon={PlayIcon} size={timerButtonSize} />
          </Button>
        )}
        <Button label={_(msg`Quit timer`)} onPress={onDelete}>
          <ButtonIcon icon={TrashIcon} size={timerButtonSize} />
        </Button>
        <Button label={_(msg`Add another minute`)} onPress={onAnotherMinute}>
          <ButtonIcon icon={PlusIcon} size={timerButtonSize} />
        </Button>
      </View>
    </View>
  )
}
