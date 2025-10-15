import * as TextField from "#/components/forms/TextField";
import { useState } from "react";

interface NumberFieldProps {
    label: string
    onChange: (value: number) => void
    defaultValue?: number
}

export function NumberField({ label, onChange, defaultValue }: NumberFieldProps) {
    const [invalid, setInvalid] = useState(false)
    return <TextField.Root isInvalid={invalid}>
        <TextField.Input label={label} defaultValue={defaultValue ? defaultValue + "" : undefined}
            inputMode="numeric" onChangeText={text => {
                const value = Number(text)
                const isInvalid = Number.isNaN(value)
                setInvalid(isInvalid)
                if (!isInvalid) {
                    onChange(value)
                }
            }}
        />
    </TextField.Root>
}