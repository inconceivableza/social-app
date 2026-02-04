import {useState} from 'react'
import {TouchableOpacity, useWindowDimensions, View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useTheme} from '#/alf'
import {atoms as a} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as TextField from '#/components/forms/TextField'
import {PlusLarge_Stroke2_Corner0_Rounded as PlusIcon} from '#/components/icons/Plus'
import {Text} from '#/components/Typography'
import {ComboBoxOptions} from './ComboBoxOptions'
import {ComboBoxSelection, ComboBoxSingleSelectOptions} from './common'
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
    <View>
      <TouchableOpacity
        accessibilityRole="button"
        disabled={!!props.selection.length}
        onPress={() => {
          dialog.open()
        }}>
        <View>
          <View
            style={[
              a.p_sm,
              {borderRadius: 8},
              t.atoms.bg_contrast_50,
              a.flex_row,
              a.align_center,
              a.gap_sm,
            ]}>
            <View style={[a.flex_1]}>
              {props.selection.length ? (
                <ComboBoxSelection
                  selection={props.selection}
                  onRemove={props.onRemove}
                />
              ) : (
                <Text
                  style={[
                    a.text_md,
                    {
                      color: t.palette.contrast_500,
                      lineHeight: a.text_md.fontSize * 1.2,
                    },
                  ]}>
                  <Trans>{props.label}</Trans>
                </Text>
              )}
            </View>
            {/* TODO provide better label */}
            <View>
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
  const {height: windowHeight} = useWindowDimensions()
  const [headerHeight, setHeaderHeight] = useState(0)

  // Calculate available height for list: window height - header - dialog padding/insets
  // Reserve ~200px for dialog padding, safe areas, and margins
  const availableHeight = Math.max(200, windowHeight - headerHeight - 200)

  return (
    <View style={[a.gap_sm]}>
      <View
        onLayout={e => {
          setHeaderHeight(e.nativeEvent.layout.height)
        }}>
        <View style={[a.gap_sm]}>
          <View>
            <Button
              label={_(msg`Confirm selection`)}
              onPress={onConfirm}
              size="small"
              color="primary"
              style={[a.ml_auto]}>
              <ButtonText>
                <Trans>Done</Trans>
              </ButtonText>
            </Button>
          </View>
          <View>
            <TextField.Root>
              <TextField.Input
                value={searchText}
                label={searchLabel}
                onChangeText={setSearchText}
              />
            </TextField.Root>
          </View>
          <View>
            <ComboBoxSelection onRemove={onRemove} selection={selection} />
          </View>
        </View>
      </View>

      <View style={{maxHeight: availableHeight}}>
        <ComboBoxOptions
          onSelect={onSelect}
          options={options}
          searchText={searchText}
          selection={selection}
        />
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
  const t = useTheme()
  const dialog = Dialog.useDialogControl()
  const {_} = useLingui()
  return (
    <View>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => {
          dialog.open()
        }}>
        <View>
          <View
            style={[
              a.p_md,
              {borderRadius: 8},
              t.atoms.bg_contrast_50,
              a.flex_row,
              a.align_center,
              a.h_full,
            ]}>
            <View style={[a.flex_1]}>
              {value ? (
                <Text style={[a.text_md]}>{value}</Text>
              ) : (
                <Text
                  style={[
                    a.text_md,
                    {
                      color: t.palette.contrast_500,
                    },
                  ]}>
                  <Trans>{label}</Trans>
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <Dialog.Outer control={dialog}>
        <Dialog.Inner label={label}>
          <View style={[a.gap_sm]}>
            <View style={[a.flex_row, a.ml_auto]}>
              <Button
                onPress={() => dialog.close()}
                label={_(msg`Done`)}
                size="small"
                color="primary">
                <ButtonText>
                  <Trans>Done</Trans>
                </ButtonText>
              </Button>
            </View>
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
            </View>
            <View>
              <ComboBoxSingleSelectOptions
                onChange={value => {
                  onChange(value)
                  dialog.close()
                }}
                optionStyle={[a.mb_xs]}
                options={options}
                value={value}
                containerStyle={{height: '100%'}}
              />
            </View>
          </View>
        </Dialog.Inner>
      </Dialog.Outer>
    </View>
  )
}
