import {useState} from 'react'
import {View} from 'react-native'
import {Popover} from 'radix-ui'

import * as TextField from '#/components/forms/TextField'
import {
  ComboBoxOptions,
  ComboBoxSelection,
  ComboBoxSingleSelectOptions,
} from './common'
import {
  type BaseOption,
  type ComboBoxProps,
  type ComboBoxSingleSelectProps,
} from './types'
import { atoms } from '@bsky.app/alf'

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
  const [searchText, setSearchText] = useState('')

  const [open, setOpen] = useState(false)

  function reset() {
    setOpen(false)
    setSearchText('')
  }
  return (
    <View>
      <Popover.Root open={open}>
        <Popover.Trigger asChild>
          <View collapsable={false}>
            <TextField.Root>
              <TextField.Input
                value={searchText}
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
            onPointerDownOutside={reset}>
            <ComboBoxOptions
              options={options}
              searchText={searchText}
              selection={selection}
              onSelect={opt => {
                onSelect(opt)
                reset()
              }}
              containerStyle={{ maxHeight: 200 }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <View style={[atoms.mt_xs]}>
      <ComboBoxSelection selection={selection} onRemove={onRemove} />
      </View>
    </View>
  )
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
  const [open, setOpen] = useState(false)

  return (
    <View>
      <Popover.Root open={open}>
        <Popover.Trigger asChild>
          <View collapsable={false}>
            <TextField.Root isInvalid={isInvalid}>
              <TextField.Input
                value={value}
                selectTextOnFocus
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
            <ComboBoxSingleSelectOptions
              onChange={opt => {
                onChange(opt)
                setOpen(false)
              }}
              options={options}
              value={value}
              containerStyle={{
                maxHeight: 200,
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </View>
  )
}
