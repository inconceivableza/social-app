import {type PropsWithChildren, useState} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {Button, ButtonIcon} from '#/components/Button'
import {CircleX_Stroke2_Corner0_Rounded as CircleX} from '#/components/icons/CircleX'
import {type Props as SVGIconProps} from '#/components/icons/common'
import * as Tooltip from './index'

export function TooltipButton({
  children,
  label,
  icon,
}: PropsWithChildren<{
  label: string
  icon: React.ComponentType<SVGIconProps>
}>) {
  const {_} = useLingui()
  const [visible, setVisible] = useState(false)
  return (
    <Tooltip.Outer visible={visible} onVisibleChange={() => {}}>
      <Tooltip.Target>
        <Button label={label} onPress={() => setVisible(!visible)}>
          <ButtonIcon icon={icon} />
        </Button>
      </Tooltip.Target>

      <Tooltip.TextBubble>
        <View style={{flexDirection: 'row'}}>
          <View style={{flex: 1}}>{children}</View>
          <View>
            <Button
              label={_(msg`Close tooltip`)}
              onPress={() => setVisible(false)}>
              <ButtonIcon icon={CircleX} />
            </Button>
          </View>
        </View>
      </Tooltip.TextBubble>
    </Tooltip.Outer>
  )
}
