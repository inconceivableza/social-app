
import { useMemo } from 'react'
import { StyleProp, View, ViewStyle } from 'react-native'
import { Trans } from '@lingui/macro'
import { useLingui } from '@lingui/react'

import { atoms as a, select, useTheme } from '#/alf'
import { Button, ButtonText } from '#/components/Button'
import { Text } from '#/components/Typography'
import {
    type BaseOption,
    type ComboBoxProps,
} from './types'
import { List } from '#/view/com/util/List'

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
    const { _ } = useLingui()
    const t = useTheme()
    const filteredOptions = useMemo(() => {
        const trimmedSearch = searchText.trim().toLowerCase()
        return options
            .filter(({ id, label }) => {
                return (
                    label.toLowerCase().includes(trimmedSearch) &&
                    !selection.find(opt => opt.id === id)
                )
            })
            .map(opt => ({ ...opt, onClick: () => onSelect(opt) }))
    }, [options, selection, searchText, onSelect])

    return (
        <View
            style={[
                a.h_full,
                a.rounded_sm,
                select(t.name, {
                    light: t.atoms.bg,
                    dark: t.atoms.bg_contrast_100,
                    dim: t.atoms.bg_contrast_100,
                }),
                containerStyle,
            ]}>
            <List
                showsVerticalScrollIndicator
                keyExtractor={item => item.id}
                ListEmptyComponent={(
                    <View style={[a.p_md]}>
                        <Text style={{ fontStyle: 'italic' }}>
                            <Trans>No results found</Trans>
                        </Text>
                    </View>
                )}
                data={filteredOptions}
                renderItem={({ item }) => <View
                    key={item.id}
                    style={[a.border_b, t.atoms.border_contrast_low]}>
                    <Button
                        label={_(item.label)}
                        size="small"
                        color="primary_subtle"
                        style={[a.justify_start, { borderRadius: 0 }, a.mb_xs]}
                        onPress={item.onClick}>
                        <ButtonText style={[a.text_left]}>{_(item.label)}</ButtonText>
                    </Button>
                </View>}
            >

            </List>
        </View>
    )
}