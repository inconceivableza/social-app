import {type PropsWithChildren, useState} from 'react'

import * as TextField from '#/components/forms/TextField'

interface NumberFieldProps {
  label: string
  onChange: (value: string) => void
  defaultValue?: string
}

export function NumberField({
  label,
  onChange,
  defaultValue,
  children,
}: PropsWithChildren<NumberFieldProps>) {
  const [invalid, setInvalid] = useState(false)
  return (
    <TextField.Root isInvalid={invalid}>
      <TextField.Input
        selectTextOnFocus
        label={label}
        defaultValue={defaultValue}
        inputMode="numeric"
        onChangeText={text => {
          const isInvalid = Number.isNaN(Number(text))
          setInvalid(isInvalid)
          if (!isInvalid) {
            onChange(text)
          }
        }}
      />
      {children}
    </TextField.Root>
  )
}
