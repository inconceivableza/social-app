import React from 'react'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {
  DOMAIN_ENVCONFIGS,
  getStoredEnvConfig,
  setStoredEnvConfig,
  useEnvConfig,
} from '#/state/env-config'
import {atoms as a, platform, useTheme} from '#/alf'
import {Flag_Stroke2_Corner0_Rounded as FlagIcon} from '#/components/icons/Flag'
import * as Select from '#/components/Select'
import {Button} from './Button'

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

  const builtinConfigNames = ['production', 'staging', 'development']
  const builtinConfigItems = builtinConfigNames.map(l => ({
    label: `${l} -> ${DOMAIN_ENVCONFIGS[l].SOCIAL_APP_HOST}`,
    value: l,
  }))
  const isCustom = !builtinConfigNames.includes(currentEnvName)
  const customConfigItems = isCustom
    ? [
        {
          label: `${currentEnvName || 'custom'} -> ${envConfig.SOCIAL_APP_HOST}`,
          value: currentEnvName || 'custom',
        },
      ]
    : []
  const envConfigItems = builtinConfigItems.concat(customConfigItems)

  const onChangeEnvConfig = React.useCallback(
    (envName: string) => {
      if (!envName) return
      const newEnvConfig = DOMAIN_ENVCONFIGS[envName]
      if (newEnvConfig != null) {
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
        renderItem={({label, value}) => (
          <Select.Item value={value} label={label}>
            <Select.ItemIndicator icon={FlagIcon} />
            <Select.ItemText>{label}</Select.ItemText>
          </Select.Item>
        )}
        items={envConfigItems}
      />
    </Select.Root>
  )
}
