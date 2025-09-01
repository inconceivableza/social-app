import React from 'react'
import {TextInput, View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {timeout} from '#/lib/async/timeout'
import {canReload, reload} from '#/lib/reload'
import {logger} from '#/logger'
import {
  builtinConfigNames,
  configLabels,
  DOMAIN_ENVCONFIGS,
  fetchEnvConfig,
  getStoredEnvConfig,
  hasRequiredConfig,
  renderEnvConfig,
  setStoredEnvConfig,
  useEnvConfig,
} from '#/state/env-config'
import {clearStorage} from '#/state/persisted'
import * as Toast from '#/view/com/util/Toast'
import {atoms as a, platform, useTheme} from '#/alf'
import * as Select from '#/components/Select'
import {type ItemTextProps} from '#/components/Select/types'
import {Text} from '#/components/Typography'
import {Button, ButtonText} from './Button'

export function DisabledItemText({children}: ItemTextProps) {
  return <Text style={[{color: '#808080'}]}>{children}</Text>
}

export function EnvConfigIndicator() {
  const t = useTheme()
  const {_} = useLingui()

  const {envConfig, setEnvConfig} = useEnvConfig()
  function getCurrentEnvName() {
    for (const [key, value] of Object.entries(DOMAIN_ENVCONFIGS)) {
      if (JSON.stringify(envConfig) === JSON.stringify(value)) {
        return key
      }
    }
    return 'custom'
  }
  const [currentEnvName, setCurrentEnvName] =
    React.useState(getCurrentEnvName())
  const defaultCustomDomain = DOMAIN_ENVCONFIGS.development.SOCIAL_APP_HOST
  const [customDomain, setCustomDomain] = React.useState(defaultCustomDomain)
  const [showCustomDomain, setShowCustomDomain] = React.useState(false)
  const reloadMessage = canReload()
    ? _(msg`Going to reload app...`)
    : _(msg`Please reload app manually...`)

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

  const doDelayedReload = React.useCallback(async () => {
    const reloadDelay = 3
    await clearStorage()
    if (canReload()) {
      logger.info(
        `Reloading app after environment config change in ${reloadDelay}...`,
      )
      await timeout(reloadDelay * 1000)
      reload('Changed environment config')
    } else {
      logger.warn(
        'Could not reload app after environment config change ; user must reload otherwise confusion...',
      )
    }
  }, [])

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
      const newEnvConfig = DOMAIN_ENVCONFIGS[envName]
      if (newEnvConfig != null && hasRequiredConfig(newEnvConfig)) {
        logger.info(
          `Switching environment config to ${envName}: ${renderEnvConfig(newEnvConfig)}`,
        )
        setStoredEnvConfig(newEnvConfig)
        setEnvConfig(getStoredEnvConfig())
        setCurrentEnvName(envName)
        Toast.show(_(msg`Switched environment to ${envName}. ${reloadMessage}`))
        await doDelayedReload()
      } else {
        Toast.show(
          _(msg`Could not find valid environment config named ${envName}`),
        )
      }
    },
    [setEnvConfig, currentEnvName, doDelayedReload, reloadMessage, _],
  )
  const onUseManualConfig = React.useCallback(
    async (serverName: string) => {
      const customUrl = serverName.includes('://')
        ? serverName
        : `https://${serverName}`
      const newEnvConfig = await fetchEnvConfig(customUrl)
      if (newEnvConfig !== null) {
        logger.info(
          `Switching environment config to custom loaded from ${serverName}: ${renderEnvConfig(newEnvConfig)}`,
        )
        setStoredEnvConfig(newEnvConfig)
        setEnvConfig(getStoredEnvConfig())
        setCurrentEnvName('custom')
        Toast.show(
          _(
            msg`Switched environment to custom loaded from ${serverName}. ${reloadMessage}`,
          ),
        )
        setShowCustomDomain(false)
        await doDelayedReload()
      } else {
        Toast.show(_(msg`Could not retrieve new config from ${serverName}`))
      }
    },
    [setEnvConfig, doDelayedReload, reloadMessage, _],
  )

  return (
    <View style={[a.flex_row, a.align_baseline]}>
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
          <View style={[a.flex_col, a.px_xs]}>
            <Button
              label={_(msg`Use`)}
              accessibilityHint={_(
                msg`Use custom domain to retrieve server domains`,
              )}
              onPress={() => {
                onUseManualConfig(customDomain)
              }}>
              <ButtonText style={[{color: 'black'}]}>
                <Trans>Use</Trans>
              </ButtonText>
            </Button>
          </View>
          <View style={[a.flex_col, a.px_xs]}>
            <Button
              label="↩️"
              onPress={() => {
                setShowCustomDomain(false)
              }}>
              <ButtonText style={[{color: 'black'}]}>↩️</ButtonText>
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
  )
}
