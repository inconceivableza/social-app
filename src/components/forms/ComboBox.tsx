
import { atoms as a, useTheme } from "#/alf";
import { Button, ButtonText, ButtonIcon } from "#/components/Button";
import * as Tooltip from "#/components/Tooltip";
import { Text } from "#/components/Typography";
import * as TextField from "#/components/forms/TextField";
import { CircleX_Stroke2_Corner0_Rounded as CircleXIcon } from "#/components/icons/CircleX";
import { useLingui } from "@lingui/react";
import { useRef, useState } from "react";
import { TextInput as NativeTextInput } from "react-native";
import { msg, Trans } from "@lingui/macro";
import { View, ScrollView } from "react-native";


interface ComboBoxProps {
    options: string[];
    selection: string[];
    label: string;
    onSelect: (value: string) => void;
    onRemove: (value: string) => void;
}
export function ComboBox({ options, selection, onRemove, onSelect, label }: ComboBoxProps) {
    const t = useTheme();
    const { _ } = useLingui();
    const inputRef = useRef<NativeTextInput>(null);
    const [filteredOptions, setFilteredOptions] = useState([] as string[]);
    const expanded = !!filteredOptions.length;

    // TODO: display "no results found" when applicable
    return <View>
        <Tooltip.Outer visible onVisibleChange={() => { }}>
            <Tooltip.Target>
                <TextField.Root>
                    <TextField.Input onBlur={() => {
                        inputRef.current?.clear();
                        // Delay this slightly, otherwise option selection doesn't work
                        setTimeout(() => {
                            setFilteredOptions([]);
                        }, 100);
                    }} inputRef={inputRef} label={label} onChangeText={value => {
                        const trimmed = value.trim().toLowerCase();
                        if (!trimmed.length) {
                            setFilteredOptions(options);
                            return;
                        }
                        const filtered = options.filter(cuisine => cuisine.toLowerCase().includes(trimmed) &&
                            !selection.includes(cuisine));
                        setFilteredOptions(filtered);
                    }} />
                </TextField.Root>
            </Tooltip.Target>
            <View>
                <Tooltip.Content fill={expanded ? undefined : "transparent"} label={_(`Options`)}>
                    <ScrollView style={{
                        maxHeight: 200,
                        display: expanded ? undefined : 'none'
                    }}>
                        {filteredOptions.map(name => <View key={name}>
                            <Button label={_(msg`${name}`)} size="small" style={[a.justify_start]}
                                onPress={(e) => {
                                    if (selection.includes(name)) return;
                                    onSelect(name);
                                }}
                            >
                                <ButtonText style={[a.text_left]}>
                                    <Trans>{name}</Trans>
                                </ButtonText>
                            </Button>
                        </View>)}
                    </ScrollView>
                </Tooltip.Content>
            </View>
        </Tooltip.Outer>
        {!!selection.length && <View style={[a.flex_row, a.mt_xs]}>
            {selection.map((value, i) => <View key={value} style={[
                a.rounded_sm, t.atoms.bg_contrast_25, a.p_sm, a.flex_row, a.gap_xs, a.justify_center
            ]}>
                <Text>{value}</Text>
                <Button color="primary" label={_(msg`Remove selection`)}
                    onPress={() => {
                        onRemove(value);
                    }}
                >
                    <ButtonIcon icon={CircleXIcon} />
                </Button>
            </View>)}
        </View>}
    </View>;
}
