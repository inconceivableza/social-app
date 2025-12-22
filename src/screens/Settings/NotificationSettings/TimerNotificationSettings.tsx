import {useMemo, useState} from 'react'
import {View} from 'react-native'
import {type AppBskyNotificationDefs} from '@atproto/api'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {
  type AllNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {logger} from '#/logger'
import {
  useNotificationSettingsQuery,
  useNotificationSettingsUpdateMutation,
} from '#/state/queries/notifications/settings'
import {atoms as a, platform, useTheme} from '#/alf'
import {Admonition} from '#/components/Admonition'
import * as Toggle from '#/components/forms/Toggle'
import {Heart2_Stroke2_Corner0_Rounded as HeartIcon} from '#/components/icons/Heart2'
import * as Layout from '#/components/Layout'
import * as SettingsList from '../components/SettingsList'
import {ItemTextWithSubtitle} from './components/ItemTextWithSubtitle'
import {PreferenceControls} from './components/PreferenceControls'

type Props = NativeStackScreenProps<
  AllNavigatorParams,
  'TimerNotificationSettings'
>
export function TimerNotificationSettingsScreen({}: Props) {
  const {_} = useLingui()
  const t = useTheme()
  const {data: preferences, isError} = useNotificationSettingsQuery()
  const {mutate} = useNotificationSettingsUpdateMutation()
  const [timerNotifications, setTimerNotifications] = useState(false)
  logger.debug('TimerNotificationSettingsScreen', {
    preferences,
    timerNotifications,
  })
  const preference = useMemo(() => {
    return preferences?.timer ?? {}
  }, [preferences])
  const name = 'timer'

  const syncOthers: Exclude<
    keyof AppBskyNotificationDefs.Preferences,
    '$type'
  >[] = []

  const channels = useMemo(() => {
    const arr = []
    if (preference.timer) arr.push('timer')
    return arr
  }, [preference])

  const onChangeChannels = (change: string[]) => {
    setTimerNotifications(change.includes('timer'))
    const newPreference = {
      ...preference,
      timer: change.includes('timer'),
    } satisfies typeof preference

    logger.metric('activityPreference:changeChannels', {
      name,
      timer: newPreference.timer,
    })

    mutate({
      [name]: newPreference,
      ...Object.fromEntries(syncOthers.map(key => [key, newPreference])),
    })
  }

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Notifications</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <SettingsList.Container>
          <SettingsList.Item style={[a.align_start]}>
            <SettingsList.ItemIcon icon={HeartIcon} />
            <ItemTextWithSubtitle
              bold
              titleText={<Trans>Timers</Trans>}
              subtitleText={
                <Trans>
                  Get notifications when timers/countdowns for recipes are
                  completed.
                </Trans>
              }
            />
          </SettingsList.Item>
          {false &&
            (isError ? (
              <View style={[a.px_lg, a.pt_md]}>
                <Admonition type="error">
                  <Trans>Failed to load notification settings.</Trans>
                </Admonition>
              </View>
            ) : (
              <PreferenceControls name="timer" preference={preference} />
            ))}
          <View style={[a.px_xl, a.pt_md, a.gap_sm]}>
            <Toggle.Group
              type="checkbox"
              label={_(msg`Select your preferred notification channels`)}
              values={channels}
              onChange={change => {
                onChangeChannels(change)
                setTimerNotifications(change.includes('timer'))
              }}>
              <View style={[a.gap_sm]}>
                <Toggle.Item
                  label={_(msg`Receive in-app notifications`)}
                  name="timer"
                  style={[
                    a.py_xs,
                    platform({
                      native: [a.justify_between],
                      web: [a.flex_row_reverse, a.gap_sm],
                    }),
                  ]}>
                  <Toggle.LabelText
                    style={[t.atoms.text, a.font_normal, a.text_md, a.flex_1]}>
                    <Trans>In-app notifications</Trans>
                  </Toggle.LabelText>
                  <Toggle.Platform />
                </Toggle.Item>
              </View>
            </Toggle.Group>
          </View>
        </SettingsList.Container>
      </Layout.Content>
    </Layout.Screen>
  )
}
