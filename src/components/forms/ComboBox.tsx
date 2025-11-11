import {useMemo, useState} from 'react'
import {ScrollView, View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {Popover} from 'radix-ui'

import {atoms as a, select, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as TextField from '#/components/forms/TextField'
import {CircleX_Stroke2_Corner0_Rounded as CircleXIcon} from '#/components/icons/CircleX'
import {Text} from '#/components/Typography'

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

/**
 * Multi-select combo box, only allowing selection of the given options.
 */
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
    return options.filter(({id, label}) => {
      return (
        label.toLowerCase().includes(trimmedSearch) &&
        !selection.find(opt => opt.id === id)
      )
    })
  }, [options, selection, searchText])

  const uniqSelection = selection
    .sort((a, b) => (a.label > b.label ? 1 : -1))
    .reduce(
      (acc, opt) => (opt.label === acc.at(-1)?.label ? acc : acc.concat(opt)),
      [] as T[],
    )

  const [open, setOpen] = useState(false)
  return (
    <View>
      <Popover.Root open={open}>
        <Popover.Trigger asChild>
          <View collapsable={false}>
            <TextField.Root>
              <TextField.Input
                value={searchText}
                onBlur={() => {
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
          <Popover.Content
            className="radix-combobox-content radix-popover-content"
            style={{minWidth: 'max-content'}}
            onPointerDownOutside={() => {
              setOpen(false)
            }}>
            <ScrollView
              style={[
                a.rounded_sm,
                select(t.name, {
                  light: t.atoms.bg,
                  dark: t.atoms.bg_contrast_100,
                  dim: t.atoms.bg_contrast_100,
                }),
                {
                  maxHeight: 200,
                },
              ]}>
              {filteredOptions.length ? (
                filteredOptions.map(opt => (
                  <View key={opt.id}>
                    <Button
                      label={_(opt.label)}
                      size="small"
                      color="primary_subtle"
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
                ))
              ) : (
                <View style={a.p_md}>
                  <Text>
                    <Trans>No results found</Trans>
                  </Text>
                </View>
              )}
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

interface ComboBoxSingleSelectProps {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
  isInvalid?: boolean
  onFocus?: () => void
}

/**
 * Combo Box that allows selection of single value. Also accepts the user's input as a value.
 */
export function ComboBoxSingleSelect({
  options,
  value,
  onChange,
  label,
  isInvalid,
  onFocus,
}: ComboBoxSingleSelectProps) {
  const t = useTheme()
  const {_} = useLingui()
  const [open, setOpen] = useState(false)

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
    <View>
      <Popover.Root open={open}>
        <Popover.Trigger asChild>
          <View collapsable={false}>
            <TextField.Root isInvalid={isInvalid}>
              <TextField.Input
                value={value}
                onFocus={() => {
                  setOpen(true)
                  onFocus?.()
                }}
                label={label}
                onChangeText={value => {
                  onChange(value)
                }}
              />
            </TextField.Root>
          </View>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="radix-combobox-content radix-popover-content"
            style={{minWidth: 'max-content'}}
            onPointerDownOutside={() => {
              setOpen(false)
            }}>
            <ScrollView
              style={[
                a.rounded_sm,
                select(t.name, {
                  light: t.atoms.bg,
                  dark: t.atoms.bg_contrast_100,
                  dim: t.atoms.bg_contrast_100,
                }),
                {
                  maxHeight: 200,
                },
              ]}>
              {filteredOptions.map((opt, i) => (
                <View key={i}>
                  <Button
                    label={_(opt)}
                    size="small"
                    color="primary_subtle"
                    style={[a.justify_start]}
                    onPress={_e => {
                      onChange(opt)
                      setOpen(false)
                    }}>
                    <ButtonText style={[a.text_left]}>{_(opt)}</ButtonText>
                  </Button>
                </View>
              ))}
            </ScrollView>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </View>
  )
}
