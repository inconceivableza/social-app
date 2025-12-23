import { Button } from "#/components/Button"
import { SearchType, searchTypeOptions } from "./options";
import * as Select from '#/components/Select'
import { useLingui } from "@lingui/react";
import { msg } from "@lingui/macro";
import { useTheme } from "@bsky.app/alf";
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
                    // size={platform({
                    //   web: 'tiny',
                    //   native: 'small',
                    // })}
                    variant="ghost"
                    color="secondary"
                // style={[
                //   a.pr_xs,
                //   a.pl_sm,
                //   platform({
                //     web: [{alignSelf: 'flex-start'}, a.gap_sm],
                //     native: [a.gap_xs],
                //   }),
                // ]}
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
