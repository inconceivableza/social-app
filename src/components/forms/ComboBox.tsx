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

interface ComboBoxProps {
  options: {id: string; label: string}[]
  selection: string[]
  label: string
  onSelect: (value: string) => void
  onRemove: (value: string) => void
}
export function ComboBox({
  options,
  selection,
  onRemove,
  onSelect,
  label,
}: ComboBoxProps) {
  const t = useTheme()
  const {_} = useLingui()
  const inputRef = useRef<NativeTextInput>(null)
  const [filteredOptions, setFilteredOptions] = useState(
    [] as {id: string; label: string}[],
  )
  const expanded = !!filteredOptions.length

  const labelLookup = useMemo(() => {
    return new Map(options.map(({id, label}) => [id, label]))
  }, [options])

  const selectionLabels = useMemo(() => {
    return selection.map(id => ({label: labelLookup.get(id), id}))
  }, [selection, labelLookup])

  // TODO: display "no results found" when applicable
  return (
    <View>
      <Tooltip.Outer visible onVisibleChange={() => {}}>
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
                    !selection.includes(id),
                )
                setFilteredOptions(filtered)
              }}
            />
          </TextField.Root>
        </Tooltip.Target>
        <View>
          <Tooltip.Content
            fill={expanded ? undefined : 'transparent'}
            label={_(`Options`)}>
            <ScrollView
              style={{
                maxHeight: 200,
                display: expanded ? undefined : 'none',
              }}>
              {filteredOptions.map(({label, id}) => (
                <View key={id}>
                  <Button
                    color="primary"
                    label={_(msg`${label}`)}
                    size="small"
                    style={[a.justify_start]}
                    onPress={_e => {
                      if (selection.includes(id)) return
                      onSelect(id)
                    }}>
                    <ButtonText style={[a.text_left]}>{label}</ButtonText>
                  </Button>
                </View>
              ))}
            </ScrollView>
          </Tooltip.Content>
        </View>
      </Tooltip.Outer>
      {!!selectionLabels.length && (
        <View style={[a.flex_row, a.mt_xs, a.gap_xs]}>
          {selectionLabels.map(({id, label}, _i) => (
            <View
              key={id}
              style={[
                a.rounded_sm,
                t.atoms.bg_contrast_25,
                a.p_sm,
                a.flex_row,
                a.gap_xs,
                a.justify_center,
              ]}>
              <Text>{label}</Text>
              <Button
                color="primary"
                label={_(msg`Remove selection`)}
                onPress={() => {
                  onRemove(id)
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
