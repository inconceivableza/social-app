import { useMemo, useRef, useState } from 'react'
import {type TextInput as NativeTextInput} from 'react-native'
import {ScrollView, View} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import { atoms as a, select, useTheme } from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as TextField from '#/components/forms/TextField'
import { CircleX_Stroke2_Corner0_Rounded as CircleXIcon } from '#/components/icons/CircleX'
import {Text} from '#/components/Typography'

import { Popover } from "radix-ui";

interface BaseOption {
  id: string
  label: string
}

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
  const [searchText, setSearchText] = useState('')
  const filteredOptions = useMemo(() => {
    const trimmedSearch = searchText.trim().toLowerCase()
    return options.filter(({ id, label }) => {
      return label.toLowerCase().includes(trimmedSearch) &&
        !selection.find(opt => opt.id === id)
    })
  }, [options, selection, searchText])

  const uniqSelection = selection
    .sort((a, b) => (a.label > b.label ? 1 : -1))
    .reduce(
      (acc, opt) => (opt.label === acc.at(-1)?.label ? acc : acc.concat(opt)),
      [] as T[],
    )

  const [open, setOpen] = useState(false)
  // TODO: display "no results found" when applicable
  return (
    <View>
      <Popover.Root open={open}>
        <Popover.Trigger asChild>
          <View collapsable={false}>
          <TextField.Root>
            <TextField.Input
                value={searchText}
                onBlur={(e) => {
                  setSearchText('')
              }}
              onFocus={() => {
                setOpen(true)
              }}
              label={label}
              onChangeText={value => {
                setSearchText(value)
              }}
            />
          </TextField.Root>
          </View>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="radix-combobox-content radix-popover-content" style={{ minWidth: 'max-content' }}
            onPointerDownOutside={() => {
              setOpen(false)
            }} >

            <ScrollView
              style={[
                a.rounded_sm,
                select(t.name, {
                  light: t.atoms.bg,
                  dark: t.atoms.bg_contrast_100,
                  dim: t.atoms.bg_contrast_100,
                }), {
                  maxHeight: 200,
                }]}>
              {filteredOptions.map(opt => (
                <View key={opt.id}>
                  <Button
                    label={_(opt.label)}
                    size="small"
                    color='primary_subtle'
                    style={[a.justify_start]}
                    onPress={_e => {
                      onSelect(opt)
                      setOpen(false)
                    }}>
                    <ButtonText style={[a.text_left]}>
                      {_(opt.label)}
                    </ButtonText>
                  </Button>
                </View>
              ))}
            </ScrollView>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
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
