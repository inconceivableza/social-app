import React from 'react'
import {type StyleProp, TextInput, View, type ViewStyle} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import * as reload from '#/lib/reload'
import {logger} from '#/logger'
import {
  builtinConfigNames,
  configLabels,
  DOMAIN_ENVCONFIGS,
  getCurrentEnvName,
  getStoredEnvConfig,
  hasRequiredConfig,
  renderEnvConfig,
  SWITCHING_ENABLED,
  switchToBuiltinEnvironment,
  switchToCustomEnvironment,
  useEnvConfig,
  useEnvContent,
} from '#/state/env-config'
import * as Toast from '#/view/com/util/Toast'
import {flatten} from '#/alf'
import {atoms as a, platform, useTheme} from '#/alf'
import * as Select from '#/components/Select'
import {type ItemTextProps} from '#/components/Select/types'
import {Text} from '#/components/Typography'
import {Button, ButtonText} from './Button'

export function DisabledItemText({children}: ItemTextProps) {
  return <Text style={[{color: '#808080'}]}>{children}</Text>
}

export type IndicatorProps = {
  style?: StyleProp<ViewStyle>
}

export function EnvConfigIndicator({style}: IndicatorProps) {
  const t = useTheme()
  const {_} = useLingui()

  const {envConfig, setEnvConfig} = useEnvConfig()
  const {setEnvContent} = useEnvContent()
  const [currentEnvName, setCurrentEnvName] = React.useState(() =>
    getCurrentEnvName(envConfig, true),
  )
  const defaultCustomDomain = DOMAIN_ENVCONFIGS.development.SOCIAL_APP_HOST
  const [customDomain, setCustomDomain] = React.useState(defaultCustomDomain)
  const [showCustomDomain, setShowCustomDomain] = React.useState(false)
  logger.warn('Evaluating reload', reload)
  const reloadMessage = reload?.canReload
    ? _(msg`Going to reload app...`)
    : _(msg`Please exit and reload app manually...`)

  const builtinConfigItems = builtinConfigNames.map(l => ({
    label: `${configLabels[l] || l}→${DOMAIN_ENVCONFIGS[l].SOCIAL_APP_HOST}`,
    value: l,
    enabled: hasRequiredConfig(DOMAIN_ENVCONFIGS[l]),
  }))
  const isCustom = !builtinConfigNames.includes(currentEnvName)
  const c = currentEnvName || 'custom'
  const customInputIndicator = {
    label: '⌨️ manual input',
    value: '$input',
    enabled: true,
  }
  const showEnvConfigIndicator = {
    label: '👀 show config',
    value: '$show',
    enabled: true,
  }
  const controlIndicators = [customInputIndicator, showEnvConfigIndicator]
  const customConfigItems = isCustom
    ? [
        {
          label: `${configLabels[c] || '🛠️ ' + c}→${envConfig.SOCIAL_APP_HOST}`,
          value: c,
          enabled: hasRequiredConfig(envConfig),
        },
      ]
    : []
  const envConfigItems = builtinConfigItems
    .concat(customConfigItems)
    .concat(controlIndicators)

  const onChangeEnvConfig = React.useCallback(
    async (envName: string) => {
      const isControl = envName.startsWith('$')
      if (isControl) {
        if (envName === '$input') {
          setShowCustomDomain(true)
        } else if (envName === '$show') {
          const envConfigText = renderEnvConfig(getStoredEnvConfig())
          logger.info(
            `Current Environment Config ${currentEnvName}: ${envConfigText}`,
          )
          Toast.show(
            _(msg`Environment Config ${currentEnvName}: ${envConfigText}`),
          )
        }
        return
      }
      if (!envName) return
      const result = await switchToBuiltinEnvironment(
        envName,
        setEnvConfig,
        setEnvContent,
      )
      if (result.success) {
        setCurrentEnvName(envName)
        Toast.show(_(msg`${result.message}. ${reloadMessage}`))
        await reload.doDelayedReload(
          'Changed environment config',
          'Reloading app after environment config change',
          'User must exit and reload app after environment config change to prevent errors',
        )
      } else {
        Toast.show(_(msg`${result.message}`))
      }
    },
    [setEnvConfig, setEnvContent, currentEnvName, reloadMessage, _],
  )
  const onUseManualConfig = React.useCallback(
    async (serverName: string) => {
      const result = await switchToCustomEnvironment(
        serverName,
        setEnvConfig,
        setEnvContent,
      )
      if (result.success) {
        setCurrentEnvName('custom')
        Toast.show(_(msg`${result.message}. ${reloadMessage}`))
        setShowCustomDomain(false)
        await reload.doDelayedReload(
          'Changed environment config',
          'Reloading app after environment config change',
          'User must exit and reload app after environment config change to prevent errors',
        )
      } else {
        Toast.show(_(msg`${result.message}`))
      }
    },
    [setEnvConfig, setEnvContent, reloadMessage, _],
  )

  return SWITCHING_ENABLED ? (
    <View style={[a.flex_row, a.align_baseline, flatten(style)]}>
      <Text emoji style={[a.p_0, a.align_baseline]}>
        🌐
      </Text>
      {showCustomDomain ? (
        <>
          <View style={[a.flex_col, a.px_xs, a.align_baseline]}>
            <Text emoji style={[a.align_baseline]}>
              ⌨️
            </Text>
          </View>
          <View
            style={[
              a.inset_0,
              t.atoms.bg_contrast_25,
              a.flex_col,
              a.px_xs,
              {width: '50%'},
            ]}>
            <TextInput
              accessibilityLabel="Text input field"
              onChangeText={text => {
                setCustomDomain(text)
              }}
              defaultValue={customDomain}
              accessibilityHint={_(msg`Custom server domain`)}
            />
          </View>
          <View style={[a.flex_col, a.px_0, a.align_baseline]}>
            <Button
              label={_(msg`Connect`)}
              style={[a.px_xs]}
              accessibilityHint={_(
                msg`Use custom server domain to retrieve configuration`,
              )}
              onPress={() => {
                onUseManualConfig(customDomain)
              }}>
              <ButtonText style={[a.align_baseline]}>
                <Text emoji>✅</Text>
              </ButtonText>
            </Button>
          </View>
          <View style={[a.flex_col, a.px_0]}>
            <Button
              label="Close manual server domain"
              style={[a.px_xs]}
              onPress={() => {
                setShowCustomDomain(false)
              }}>
              <ButtonText style={[a.align_baseline]}>
                <Text emoji>❌</Text>
              </ButtonText>
            </Button>
          </View>
        </>
      ) : (
        <View style={[a.flex_col, a.align_baseline]}>
          <Select.Root value={currentEnvName} onValueChange={onChangeEnvConfig}>
            <Select.Trigger label={_(msg`Change server domain`)}>
              {({props}) => (
                <Button
                  {...props}
                  label={props.accessibilityLabel}
                  size={platform({
                    web: 'tiny',
                    native: 'small',
                  })}
                  variant="ghost"
                  color="secondary"
                  style={[
                    a.pr_xs,
                    a.pl_sm,
                    platform({
                      web: [{alignSelf: 'flex-start'}, a.gap_sm],
                      native: [a.gap_xs],
                    }),
                  ]}>
                  <Select.ValueText
                    placeholder={_(msg`Select a server domain`)}
                    style={[t.atoms.text_contrast_medium]}
                  />
                  <Select.Icon style={[t.atoms.text_contrast_medium]} />
                </Button>
              )}
            </Select.Trigger>
            <Select.Content
              renderItem={({label, value, enabled}) => (
                <Select.Item value={value} label={label}>
                  {enabled ? (
                    <Select.ItemText>{label}</Select.ItemText>
                  ) : (
                    <DisabledItemText>{label}</DisabledItemText>
                  )}
                </Select.Item>
              )}
              items={envConfigItems}
            />
          </Select.Root>
        </View>
      )}
    </View>
  ) : (
    <></>
  ) // only show env-config indicator when switching is enabled
}
