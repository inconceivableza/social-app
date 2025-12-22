import {type PropsWithChildren, useState} from 'react'
import {View} from 'react-native'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {
  ChevronBottom_Stroke2_Corner0_Rounded as ChevronDownIcon,
  ChevronTop_Stroke2_Corner0_Rounded as ChevronUpIcon,
} from '#/components/icons/Chevron'

export function Accordion(props: PropsWithChildren<{heading: string}>) {
  const [expanded, setExpanded] = useState(false)
  const t = useTheme()
  return (
    <View
      style={[a.border, t.atoms.border_contrast_medium, a.rounded_xs, a.p_md]}>
      <View style={[a.align_center]}>
        <Button label={props.heading} onPress={() => setExpanded(v => !v)}>
          <ButtonText style={[a.text_md]}>{props.heading}</ButtonText>
          <ButtonIcon icon={expanded ? ChevronUpIcon : ChevronDownIcon} />
        </Button>
      </View>

      {expanded && <View style={[a.mt_md]}>{props.children}</View>}
    </View>
  )
}
