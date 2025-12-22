import {useMemo} from 'react'
import { ScrollView, StyleProp, View, ViewStyle } from 'react-native'
import { Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, select, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'
import {
  type BaseOption,
  type ComboBoxProps,
} from './types'


// TODO: may want to pass function for rendering option
export function ComboBoxOptions<T extends BaseOption>({
  options,
  onSelect,
  searchText,
  selection,
  containerStyle
}: Pick<ComboBoxProps<T>, 'options' | 'onSelect' | 'selection'> & {
    searchText: string,
    containerStyle?: StyleProp<ViewStyle>
}) {
  const {_} = useLingui()
  const t = useTheme()
  const filteredOptions = useMemo(() => {
    const trimmedSearch = searchText.trim().toLowerCase()
    return options
      .filter(({id, label}) => {
        return (
          label.toLowerCase().includes(trimmedSearch) &&
          !selection.find(opt => opt.id === id)
        )
      })
      .map(opt => ({...opt, onClick: () => onSelect(opt)}))
  }, [options, selection, searchText, onSelect])

  return (
    <ScrollView
      style={[
        a.rounded_sm,
        select(t.name, {
          light: t.atoms.bg,
          dark: t.atoms.bg_contrast_100,
          dim: t.atoms.bg_contrast_100,
        }),
        containerStyle
      ]}>
      {filteredOptions.length ? (
        filteredOptions.map(opt => {
          return (
            <View
              key={opt.id}
              style={[a.border_b, t.atoms.border_contrast_low]}>
              <Button
                label={_(opt.label)}
                size="small"
                color="primary_subtle"
                style={[a.justify_start, {borderRadius: 0}]}
                onPress={opt.onClick}>
                <ButtonText style={[a.text_left]}>{_(opt.label)}</ButtonText>
              </Button>
            </View>
          )
        })
      ) : (
        <View style={[a.p_md]}>
          <Text style={{fontStyle: 'italic'}}>
            <Trans>No results found</Trans>
          </Text>
        </View>
      )}
    </ScrollView>
  )
}
