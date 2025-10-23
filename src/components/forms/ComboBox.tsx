import {useMemo, useRef, useState} from 'react'
import {type TextInput as NativeTextInput} from 'react-native'
import {ScrollView, View} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as TextField from '#/components/forms/TextField'
import {CircleX_Stroke2_Corner0_Rounded as CircleXIcon} from '#/components/icons/CircleX'
import * as Tooltip from '#/components/Tooltip'
import {Text} from '#/components/Typography'

interface BaseOption { id: string; label: string }

interface ComboBoxProps<T extends BaseOption> {
  options: T[]
  selection: T[]
  label: string
  onSelect: (value: T) => void
  onRemove: (value: T) => void
}


export function ComboBox<T extends BaseOption>({
  options,
  selection,
  onRemove,
  onSelect,
  label,
}: ComboBoxProps<T>) {
  const t = useTheme()
  const {_} = useLingui()
  const inputRef = useRef<NativeTextInput>(null)
  const [filteredOptions, setFilteredOptions] = useState(
    [] as T[],
  )
  const uniqSelection = selection.sort((a, b) => a.label > b.label ? 1 : -1).reduce((acc, opt) =>
    opt.label === acc.at(-1)?.label ? acc : acc.concat(opt), [] as T[])

  const expanded = !!filteredOptions.length

  // TODO: display "no results found" when applicable
  return (
    <View>
      <Tooltip.Outer visible onVisibleChange={() => { }}>
        <Tooltip.Target>
          <TextField.Root>
            <TextField.Input
              onBlur={() => {
                inputRef.current?.clear()
                // TODO: find more robust way to do this - perhaps don't unmount the component, just make invisible
                // May break in a slow browser
                // Delay this slightly, otherwise option selection doesn't work
                setTimeout(() => {
                  setFilteredOptions([])
                }, 200)
              }}
              inputRef={inputRef}
              label={label}
              onChangeText={value => {
                const trimmed = value.trim().toLowerCase()
                if (!trimmed.length) {
                  setFilteredOptions(options)
                  return
                }
                const filtered = options.filter(
                  ({label, id}) =>
                    label.toLowerCase().includes(trimmed) &&
                    !selection.find((opt) => opt.id === id),
                )
                setFilteredOptions(filtered)
              }}
            />
          </TextField.Root>
        </Tooltip.Target>
        <View>
          <Tooltip.Content
            hide={!expanded}
            label={_(`Options`)}>
            <ScrollView
              style={{
                maxHeight: 200,
                display: expanded ? undefined : 'none',
              }}>
              {filteredOptions.map((opt) => (
                <View key={opt.id}>
                  <Button
                    label={_(opt.label)}
                    size="small"
                    style={[a.justify_start]}
                    onPress={_e => {
                      onSelect(opt)
                    }}>
                    <ButtonText style={[a.text_left]}>{_(opt.label)}</ButtonText>
                  </Button>
                </View>
              ))}
            </ScrollView>
          </Tooltip.Content>
        </View>
      </Tooltip.Outer>
      {!!uniqSelection.length && (
        <View style={[a.flex_row, a.mt_xs, a.gap_xs, a.flex_wrap]}>
          {uniqSelection.map((opt, _i) => (
            <View
              key={opt.id}
              style={[
                a.rounded_sm,
                t.atoms.bg_contrast_25,
                a.p_sm,
                a.flex_row,
                a.gap_xs,
                a.align_center,
              ]}>
              <Text>{opt.label}</Text>
              <Button
                label={_(msg`Remove selection`)}
                onPress={() => {
                  onRemove(opt)
                }}>
                <ButtonIcon icon={CircleXIcon} />
              </Button>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
