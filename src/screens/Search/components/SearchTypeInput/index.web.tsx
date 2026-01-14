import * as ToggleButton from '#/components/forms/ToggleButton'
import { msg } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { searchTypeOptions, SearchType } from './options'
import { View } from 'react-native'
import { atoms } from '#/alf'


export function SearchTypeInput({ value, onChange }: { value: SearchType, onChange: (value: SearchType) => void }) {
  const { _ } = useLingui()
  return <View style={atoms.flex_1}><ToggleButton.Group

    label={_(msg`Search type`)}
    onChange={values => {
      const found = searchTypeOptions.find(
        ({ value }) => value === values[0],
      )
      onChange(found?.value ?? 'all')
    }}
    values={[value]}>
    {searchTypeOptions.map(({ label, value }) => (
      <ToggleButton.Button
        label={_(label)}
        name={value}
        key={`searchtype-${value}`}>
        <ToggleButton.ButtonText>
          {_(label)}
        </ToggleButton.ButtonText>
      </ToggleButton.Button>
    ))}
  </ToggleButton.Group>
  </View>
}