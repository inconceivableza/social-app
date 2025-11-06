import { BaseOption, ComboBoxProps, ComboBoxSingleSelectProps } from "./types"
import { atoms as a, select, useTheme } from "#/alf"
import { ScrollView, View } from "react-native"
import { Button, ButtonIcon, ButtonText } from '#/components/Button'
import { useLingui } from "@lingui/react"
import { Text } from "#/components/Typography"
import { msg, Trans } from "@lingui/macro"
import { useMemo } from "react"
import { CircleX_Stroke2_Corner0_Rounded as CircleXIcon } from '#/components/icons/CircleX'

// TODO: may want to pass function for rendering option
export function ComboBoxOptions<T extends BaseOption>({ options, onSelect, searchText, selection }:
    Pick<ComboBoxProps<T>, "options" | "onSelect" | "selection"> & { searchText: string }) {
    const { _ } = useLingui()
    const t = useTheme()
    const filteredOptions = useMemo(() => {
        const trimmedSearch = searchText.trim().toLowerCase()
        return options.filter(({ id, label }) => {
            return label.toLowerCase().includes(trimmedSearch) &&
                !selection.find(opt => opt.id === id)
        })
    }, [options, selection, searchText])

    return <ScrollView
        style={[
            a.rounded_sm,
            select(t.name, {
                light: t.atoms.bg,
                dark: t.atoms.bg_contrast_100,
                dim: t.atoms.bg_contrast_100,
            }), {
                maxHeight: 200,
            }]}>
        {filteredOptions.length ? filteredOptions.map(opt => (
            <View key={opt.id}>
                <Button
                    label={_(opt.label)}
                    size="small"
                    color='primary_subtle'
                    style={[a.justify_start]}
                    onPress={_e => {
                        onSelect(opt)
                    }}>
                    <ButtonText style={[a.text_left]}>
                        {_(opt.label)}
                    </ButtonText>
                </Button>
            </View>
        )) : <View style={a.p_md}><Text><Trans>No results found</Trans></Text></View>}
    </ScrollView>
}

export function ComboBoxSelection<T extends BaseOption>({ selection, onRemove }: Pick<ComboBoxProps<T>, "selection" | "onRemove">) {
    const uniqSelection = useMemo(() => selection
        .sort((a, b) => (a.label > b.label ? 1 : -1))
        .reduce(
            (acc, opt) => (opt.label === acc.at(-1)?.label ? acc : acc.concat(opt)),
            [] as T[],
        ), [selection])
    const t = useTheme()
    const { _ } = useLingui()
    if (!uniqSelection.length) return null
    return <View style={[a.flex_row, a.mt_xs, a.gap_xs, a.flex_wrap]}>
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
}

export function ComboBoxSingleSelectOptions({ value, options, onChange }: Pick<ComboBoxSingleSelectProps, "value" | "options" | "onChange">) {
    const t = useTheme()
    const { _ } = useLingui()
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

    return <ScrollView
        style={[
            a.rounded_sm,
            select(t.name, {
                light: t.atoms.bg,
                dark: t.atoms.bg_contrast_100,
                dim: t.atoms.bg_contrast_100,
            }), {
                maxHeight: 200,
            }]}>
        {filteredOptions.map((opt, i) => (
            <View key={i}>
                <Button
                    label={_(opt)}
                    size="small"
                    color='primary_subtle'
                    style={[a.justify_start]}
                    onPress={_e => {
                        onChange(opt)
                    }}>
                    <ButtonText style={[a.text_left]}>
                        {_(opt)}
                    </ButtonText>
                </Button>
            </View>
        ))}
    </ScrollView>
}
