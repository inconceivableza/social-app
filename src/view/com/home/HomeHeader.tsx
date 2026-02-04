import React, {type PropsWithChildren} from 'react'
import {View} from 'react-native'
import {useNavigation} from '@react-navigation/native'

import {getNamedFeed} from '#/lib/constants'
import {type NavigationProp} from '#/lib/routes/types'
import {type FeedSourceInfo} from '#/state/queries/feed'
import {useSession} from '#/state/session'
import {type RenderTabBarFnProps} from '#/view/com/pager/Pager'
import {TabBar} from '../pager/TabBar'
import {HomeHeaderLayout} from './HomeHeaderLayout'

export function HomeHeader(
  props: RenderTabBarFnProps &
    PropsWithChildren<{
      testID?: string
      onPressSelected: () => void
      feeds: FeedSourceInfo[]
    }>,
) {
  const {feeds, onSelect: onSelectProp} = props
  const {hasSession} = useSession()
  const navigation = useNavigation<NavigationProp>()

  const hasPinnedCustom = React.useMemo<boolean>(() => {
    if (!hasSession) return false
    return feeds.some(tab => {
      const isBuiltIn = getNamedFeed(tab.uri)
      return !isBuiltIn
    })
  }, [feeds, hasSession])

  const items = React.useMemo(() => {
    const pinnedNames = feeds.map(f => f.displayName)
    if (!hasPinnedCustom) {
      return pinnedNames.concat('Feeds ✨')
    }
    return pinnedNames
  }, [hasPinnedCustom, feeds])

  const onPressFeedsLink = React.useCallback(() => {
    navigation.navigate('Feeds')
  }, [navigation])

  const onSelect = React.useCallback(
    (index: number) => {
      if (!hasPinnedCustom && index === items.length - 1) {
        onPressFeedsLink()
      } else if (onSelectProp) {
        onSelectProp(index)
      }
    },
    [items.length, onPressFeedsLink, onSelectProp, hasPinnedCustom],
  )

  return (
    <HomeHeaderLayout tabBarAnchor={props.tabBarAnchor}>
      <TabBar
        key={items.join(',')}
        onPressSelected={props.onPressSelected}
        selectedPage={props.selectedPage}
        onSelect={onSelect}
        testID={props.testID}
        items={items}
        dragProgress={props.dragProgress}
        dragState={props.dragState}
      />
      <View>{props.children}</View>
    </HomeHeaderLayout>
  )
}
