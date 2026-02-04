import {useMemo} from 'react'
import {ScrollView, type StyleProp, View, type ViewStyle} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, select, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {CircleX_Stroke2_Corner0_Rounded as CircleXIcon} from '#/components/icons/CircleX'
import {Text} from '#/components/Typography'
import {
  type BaseOption,
  type ComboBoxProps,
  type ComboBoxSingleSelectProps,
} from './types'

export function ComboBoxSelection<T extends BaseOption>({
  selection,
  onRemove,
}: Pick<ComboBoxProps<T>, 'selection' | 'onRemove'>) {
  const uniqSelection = useMemo(
    () =>
      selection
        .sort((a, b) => (a.label > b.label ? 1 : -1))
        .reduce(
          (acc, opt) =>
            opt.label === acc.at(-1)?.label ? acc : acc.concat(opt),
          [] as T[],
        ),
    [selection],
  )
  const t = useTheme()
  const {_} = useLingui()
  if (!uniqSelection.length) return null
  return (
    <View style={[a.flex_row, a.gap_xs, a.flex_wrap]}>
      {uniqSelection.map((opt, _i) => (
        <View
          key={opt.id}
          style={[
            a.rounded_sm,
            t.atoms.bg_contrast_25,
            a.px_sm,
            a.flex_row,
            a.align_center,
            a.flex_wrap,
          ]}>
          <View>
            <Text>{opt.label}</Text>
          </View>
          <View>
            <Button
              label={_(msg`Remove selection`)}
              size="tiny"
              shape="round"
              onPress={() => {
                onRemove(opt)
              }}>
              <ButtonIcon icon={CircleXIcon} />
            </Button>
          </View>
        </View>
      ))}
    </View>
  )
}

export function ComboBoxSingleSelectOptions({
  value,
  options,
  onChange,
  containerStyle,
  optionStyle,
}: Pick<ComboBoxSingleSelectProps, 'value' | 'options' | 'onChange'> & {
  containerStyle?: StyleProp<ViewStyle>
  optionStyle?: StyleProp<ViewStyle>
}) {
  const t = useTheme()
  const {_} = useLingui()
  const filteredOptions = useMemo(() => {
    const filtered = new Array<string>()
    const valLower = value.toLowerCase()
    if (value) {
      filtered.push(value)
    }
    options.forEach(opt => {
      const optLower = opt.toLowerCase()
      if (optLower !== valLower && optLower.includes(valLower)) {
        filtered.push(opt)
      }
    })
    return filtered
  }, [options, value])

  return (
    <ScrollView
      style={[
        a.rounded_sm,
        select(t.name, {
          light: t.atoms.bg,
          dark: t.atoms.bg_contrast_100,
          dim: t.atoms.bg_contrast_100,
        }),
        containerStyle,
      ]}>
      {filteredOptions.map((opt, i) => (
        <View
          key={i}
          style={[a.border_b, t.atoms.border_contrast_low, optionStyle]}>
          <Button
            label={_(opt)}
            size="small"
            color="primary_subtle"
            style={[a.justify_start, {borderRadius: 0}]}
            onPress={_e => {
              onChange(opt)
            }}>
            <ButtonText style={[a.text_left]}>{_(opt)}</ButtonText>
          </Button>
        </View>
      ))}
    </ScrollView>
  )
}
