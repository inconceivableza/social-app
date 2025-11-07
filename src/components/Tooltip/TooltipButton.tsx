
import { PropsWithChildren, useState } from "react"
import { Button, ButtonIcon } from "#/components/Button"
import * as Tooltip from "./index"
import { type Props as SVGIconProps } from '#/components/icons/common'
import { CircleX_Stroke2_Corner0_Rounded as CircleX } from "#/components/icons/CircleX"
import { View } from "react-native"
import { useLingui } from "@lingui/react"
import { msg } from "@lingui/macro"

export function TooltipButton({ children, label, icon }:
    PropsWithChildren<{ label: string, icon: React.ComponentType<SVGIconProps> }>) {
    const { _ } = useLingui()
    const [visible, setVisible] = useState(false)
    return <Tooltip.Outer visible={visible} onVisibleChange={() => { }}>
        <Tooltip.Target >
            <Button label={label} onPress={() => setVisible(!visible)}>
                <ButtonIcon icon={icon} />
            </Button>
        </Tooltip.Target >

        <Tooltip.TextBubble>
            <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1 }}>
                    {children}
                </View>
                <View >
                    <Button label={_(msg`Close tooltip`)} onPress={() => setVisible(false)}>
                        <ButtonIcon icon={CircleX} />
                    </Button>
                </View>
            </View>
        </Tooltip.TextBubble>
    </Tooltip.Outer>
}