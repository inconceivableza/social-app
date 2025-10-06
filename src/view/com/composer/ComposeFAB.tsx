import { EventStopper } from "../util/EventStopper";
import * as Menu from '#/components/Menu'
import { FAB } from "../util/fab/FAB";
import { ComposeIcon2 } from '#/lib/icons'
import { s } from '#/lib/styles'
import { useLingui } from "@lingui/react";
import { Trans, msg } from "@lingui/macro";
import { useOpenComposer } from "#/lib/hooks/useOpenComposer";
import { useCallback } from "react";
import { View } from "react-native";

export function ComposeFAB() {
    const { _ } = useLingui()

    const { openComposer } = useOpenComposer()

    const onComposePost = useCallback(() => {
        openComposer({
            type: "post"
        })
    }, [])

    const onComposeRecipe = useCallback(() => {
        openComposer({
            type: "recipe"
        })
    }, [])

    return <EventStopper onKeyDown={false}>
        <View>
            <Menu.Root>
                <Menu.Trigger label={_(msg`Compose`)}>
                    {(props) => {
                        return <FAB
                            {...props.props}

                            testID="composeFAB"
                            icon={<ComposeIcon2 strokeWidth={1.5} size={29} style={s.white} />}
                            accessibilityRole="button"
                            accessibilityLabel={_(msg({ message: `New post`, context: 'action' }))}
                            accessibilityHint=""
                        />
                    }}
                </Menu.Trigger>
                <Menu.Outer>
                    <Menu.Item
                        testID="composeMenuComposePost"
                        label={_(msg`Compose post`)}
                        onPress={onComposePost}>
                        <Menu.ItemText>
                            <Trans>Post</Trans>
                        </Menu.ItemText>
                    </Menu.Item>
                    <Menu.Item
                        testID="composeMenuComposeRecipe"
                        label={_(msg`Compose recipe`)}
                        onPress={onComposeRecipe}>
                        <Menu.ItemText>
                            <Trans>Recipe</Trans>
                        </Menu.ItemText>
                    </Menu.Item>
                </Menu.Outer>
            </Menu.Root>
        </View>
    </EventStopper>
}