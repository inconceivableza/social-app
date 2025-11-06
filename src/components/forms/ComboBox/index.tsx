import { ScrollView, TouchableOpacity, View } from "react-native";
import { BaseOption, ComboBoxProps, ComboBoxSingleSelectProps } from "./types";
import * as Dialog from '#/components/Dialog'
import { useLingui } from "@lingui/react";
import * as TextField from '#/components/forms/TextField'
import { useState } from "react";
import { ComboBoxOptions, ComboBoxSelection, ComboBoxSingleSelectOptions } from "./common";
import { Button, ButtonIcon, ButtonText } from "#/components/Button"
import { msg, Trans } from "@lingui/macro";
import { PencilLine_Stroke2_Corner0_Rounded as PencilIcon } from '#/components/icons/Pencil'
import { Text } from "#/components/Typography";

/**
 * Multi-select combo box, only allowing selection of the given options.
 */
export function ComboBox<T extends BaseOption>(props: ComboBoxProps<T>) {
    const dialog = Dialog.useDialogControl()
    return <View>
        <TouchableOpacity onPress={() => {
            dialog.open()
        }}>
            <View>
                <Text>{props.label}</Text>
                {props.selection.length ? <ComboBoxSelection selection={props.selection} onRemove={props.onRemove} /> :
                    <Text><Trans>Nothing selected</Trans></Text>}

                {/* TODO provide better label
                <Button label={props.label} onPress={() => dialog.open()}>
                    <ButtonIcon icon={PencilIcon}/>
                </Button> */}
            </View>

        </TouchableOpacity>
        <Dialog.Outer control={dialog}>
            <Dialog.Inner label={props.label}>
                <ComboBoxInner {...props} onConfirm={() => dialog.close()} />
            </Dialog.Inner>
        </Dialog.Outer>
    </View>
}

function ComboBoxInner<T extends BaseOption>({
    options,
    selection,
    onRemove,
    onSelect,
    label,
    onConfirm
}: ComboBoxProps<T> & { onConfirm: () => void }) {
    const [searchText, setSearchText] = useState("")
    const { _ } = useLingui()
    return <View>
        <TextField.Root>
            <TextField.Input
                value={searchText}
                label={label}
                onChangeText={setSearchText}
            />
        </TextField.Root>
        <ComboBoxSelection onRemove={onRemove} selection={selection} />
        <ComboBoxOptions onSelect={onSelect} options={options} searchText={searchText} selection={selection} />
        <View>
            <Button label={_(msg`Confirm selection`)} onPress={onConfirm}>
                <ButtonText>
                    <Trans>Done</Trans>
                </ButtonText>
            </Button>
        </View>
    </View>
}

/**
 * Combo Box that allows selection of single value. Also accepts the user's input as a value.
 */
export function ComboBoxSingleSelect({ onChange, label, options, value, isInvalid, onFocus }: ComboBoxSingleSelectProps) {
    const dialog = Dialog.useDialogControl()

    return <View>
        <TouchableOpacity onPress={() => {
            dialog.open()
        }}>
            <View>
                <Text>{label}</Text>


                {/* TODO provide better label
                <Button label={props.label} onPress={() => dialog.open()}>
                    <ButtonIcon icon={PencilIcon}/>
                </Button> */}
            </View>

        </TouchableOpacity>
        <Dialog.Outer control={dialog}>
            <Dialog.Inner label={label}>
                <View>
                    <TextField.Root isInvalid={isInvalid}>
                        <TextField.Input
                            value={value}
                            onFocus={onFocus}
                            label={label}
                            onChangeText={onChange}
                        />
                    </TextField.Root>
                    <ComboBoxSingleSelectOptions onChange={(value) => {
                        onChange(value)
                        dialog.close()
                    }} options={options} value={value} />
                </View>
            </Dialog.Inner>
        </Dialog.Outer>
    </View>
}
