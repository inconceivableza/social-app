import { Button } from "#/components/Button"
import { SearchType, searchTypeOptions } from "./options";
import * as Select from '#/components/Select'
import { useLingui } from "@lingui/react";
import { msg } from "@lingui/macro";
import { atoms, useTheme } from "#/alf";
export function SearchTypeInput({ value, onChange }: { value: SearchType, onChange: (value: SearchType) => void }) {
    const { _ } = useLingui()
    const t = useTheme()
    return <Select.Root
        value={value}
        onValueChange={onChange}>
        <Select.Trigger label={_(msg`Change app language`)}>
            {({ props }) => (
                <Button
                    {...props}
                    label={props.accessibilityLabel}
                    size="small"
                    style={atoms.flex_1}
                    color="secondary"
                >
                    <Select.ValueText
                        placeholder={_(msg`Select search type`)}
                        style={[t.atoms.text_contrast_medium]}
                    />
                    <Select.Icon style={[t.atoms.text_contrast_medium]} />
                </Button>
            )}
        </Select.Trigger>
        <Select.Content
            renderItem={({ label, value }) => (
                <Select.Item value={value} label={label}>
                    <Select.ItemIndicator />
                    <Select.ItemText>{label}</Select.ItemText>
                </Select.Item>
            )}
            items={searchTypeOptions.map(item => ({
                label: item.label,
                value: item.value,
            }))}
        />
    </Select.Root>

}
