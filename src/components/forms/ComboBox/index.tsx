import {useState} from 'react'
import {TouchableOpacity, View} from 'react-native'
import {useTheme} from '@bsky.app/alf'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as TextField from '#/components/forms/TextField'
import {PlusLarge_Stroke2_Corner0_Rounded as PlusIcon} from '#/components/icons/Plus'
import {Text} from '#/components/Typography'
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

/**
 * Multi-select combo box, only allowing selection of the given options.
 */
export function ComboBox<T extends BaseOption>(props: ComboBoxProps<T>) {
  const dialog = Dialog.useDialogControl()
  const t = useTheme()
  return (
    <View style={a.h_full}>
      <TouchableOpacity
        accessibilityRole="button"
        style={a.h_full}
        onPress={() => {
          dialog.open()
        }}>
        <View style={a.h_full}>
          <View
            style={[
              a.p_sm,
              {borderRadius: 8},
              t.atoms.bg_contrast_900,
              a.flex_row,
              a.align_center,
              a.h_full,
            ]}>
            {props.selection.length ? (
              <View style={[a.flex_1]}>
                <ComboBoxSelection
                  selection={props.selection}
                  onRemove={props.onRemove}
                />
              </View>
            ) : (
              <Text style={[t.atoms.text_contrast_low]}>{props.label}</Text>
            )}

            {/* TODO provide better label */}
            <View style={[a.ml_auto]}>
              <Button
                style={[a.ml_auto]}
                shape="round"
                variant="outline"
                color="primary"
                size="tiny"
                label={props.label}
                onPress={() => dialog.open()}>
                <ButtonIcon icon={PlusIcon} />
              </Button>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      <Dialog.Outer control={dialog}>
        <Dialog.Handle />
        <Dialog.Inner label={props.label}>
          <ComboBoxInner {...props} onConfirm={() => dialog.close()} />
        </Dialog.Inner>
      </Dialog.Outer>
    </View>
  )
}

function ComboBoxInner<T extends BaseOption>({
  options,
  selection,
  onRemove,
  onSelect,
  onConfirm,
  searchLabel,
}: ComboBoxProps<T> & {onConfirm: () => void}) {
  const [searchText, setSearchText] = useState('')
  const {_} = useLingui()
  const t = useTheme()
  return (
    <View style={[a.gap_md]}>
      <View>
        <View
          style={[
            a.flex_row,
            a.flex_1,
            t.atoms.bg_contrast_900,
            a.align_center,
            {borderRadius: 8},
          ]}>
          <View style={[a.flex_1]}>
            <TextField.Root>
              <TextField.Input
                value={searchText}
                label={searchLabel}
                onChangeText={setSearchText}
              />
            </TextField.Root>
          </View>
          <View style={[a.p_sm, {maxWidth: '75%'}]}>
            <ComboBoxSelection onRemove={onRemove} selection={selection} />
          </View>
        </View>
        <View style={{height: 200}}>
          <ComboBoxOptions
            onSelect={onSelect}
            options={options}
            searchText={searchText}
            selection={selection}
          />
        </View>
      </View>
      <View>
        <Button
          label={_(msg`Confirm selection`)}
          onPress={onConfirm}
          size="small"
          color="primary">
          <ButtonText>
            <Trans>Done</Trans>
          </ButtonText>
        </Button>
      </View>
    </View>
  )
}

/**
 * Combo Box that allows selection of single value. Also accepts the user's input as a value.
 */
export function ComboBoxSingleSelect({
  onChange,
  label,
  options,
  value,
  isInvalid,
  onFocus,
}: ComboBoxSingleSelectProps) {
  const dialog = Dialog.useDialogControl()

  return (
    <View>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => {
          dialog.open()
        }}>
        <View>
          <TextField.Input label={label} value={value} readOnly />
        </View>
      </TouchableOpacity>
      <Dialog.Outer control={dialog}>
        <Dialog.Inner label={label}>
          <View>
            <TextField.Root isInvalid={isInvalid}>
              <TextField.Input
                selectTextOnFocus
                value={value}
                onFocus={onFocus}
                label={label}
                onChangeText={onChange}
              />
            </TextField.Root>
            <View style={{height: 200}}>
              <ComboBoxSingleSelectOptions
                onChange={value => {
                  onChange(value)
                  dialog.close()
                }}
                options={options}
                value={value}
              />
            </View>
          </View>
        </Dialog.Inner>
      </Dialog.Outer>
    </View>
  )
}
