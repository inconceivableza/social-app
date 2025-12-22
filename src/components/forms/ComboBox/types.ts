export interface BaseOption {
  id: string
  label: string
}

export interface ComboBoxProps<T extends BaseOption> {
  options: T[]
  selection: T[]
  label: string
  searchLabel: string
  onSelect: (value: T) => void
  onRemove: (value: T) => void
}

export interface ComboBoxSingleSelectProps {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
  isInvalid?: boolean
  onFocus?: () => void
}
