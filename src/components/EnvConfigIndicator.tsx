import React from 'react'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {
  builtinConfigNames,
  configLabels,
  DOMAIN_ENVCONFIGS,
  getStoredEnvConfig,
  hasRequiredConfig,
  setStoredEnvConfig,
  useEnvConfig,
} from '#/state/env-config'
import {atoms as a, platform, useTheme} from '#/alf'
import * as Select from '#/components/Select'
import {type ItemTextProps} from '#/components/Select/types'
import {Text} from '#/components/Typography'
import {Button} from './Button'

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

  const builtinConfigItems = builtinConfigNames.map(l => ({
    label: `${configLabels[l] || l}→${DOMAIN_ENVCONFIGS[l].SOCIAL_APP_HOST}`,
    value: l,
    enabled: hasRequiredConfig(DOMAIN_ENVCONFIGS[l]),
  }))
  const isCustom = !builtinConfigNames.includes(currentEnvName)
  const c = currentEnvName || 'custom'
  const customConfigItems = isCustom
    ? [
        {
          label: `${configLabels[c] || '🛠️ ' + c}→${envConfig.SOCIAL_APP_HOST}`,
          value: c,
          enabled: hasRequiredConfig(envConfig),
        },
      ]
    : []
  const envConfigItems = builtinConfigItems.concat(customConfigItems)

  const onChangeEnvConfig = React.useCallback(
    (envName: string) => {
      if (!envName) return
      const newEnvConfig = DOMAIN_ENVCONFIGS[envName]
      if (newEnvConfig != null && hasRequiredConfig(newEnvConfig)) {
        setStoredEnvConfig(newEnvConfig)
        setEnvConfig(getStoredEnvConfig())
        setCurrentEnvName(envName)
      }
    },
    [setEnvConfig],
  )

  return (
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
        renderItem={({label, value, enabled}) =>
          enabled ? (
            <Select.Item value={value} label={label}>
              <Select.ItemText>{label}</Select.ItemText>
            </Select.Item>
          ) : (
            <Select.Item value={value} label={label}>
              <DisabledItemText>{label}</DisabledItemText>
            </Select.Item>
          )
        }
        items={envConfigItems}
      />
    </Select.Root>
  )
}
