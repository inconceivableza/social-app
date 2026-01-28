import {useMemo, useState} from 'react'
import {useWindowDimensions} from 'react-native'
import {runOnJS, useAnimatedReaction} from 'react-native-reanimated'

import {useWebMediaQueries} from '#/lib/hooks/useWebMediaQueries'
import {useShellLayout} from '#/state/shell/shell-layout'

export function useHeaderOffset() {
  const {isDesktop, isTablet} = useWebMediaQueries()
  const {fontScale} = useWindowDimensions()
  const {headerHeight} = useShellLayout()

  // Calculate fallback height
  const fallbackHeight = useMemo(() => {
    const navBarHeight = 52
    const tabBarPad = 10 + 10 + 3 // padding + border
    const normalLineHeight = 20 // matches tab bar
    const tabBarText = normalLineHeight * fontScale
    return navBarHeight + tabBarPad + tabBarText - 4
  }, [fontScale])

  const [measuredHeight, setMeasuredHeight] = useState(0)

  // Subscribe to headerHeight changes
  useAnimatedReaction(
    () => headerHeight.value,
    (value, previous) => {
      if (value !== previous && value > 0) {
        runOnJS(setMeasuredHeight)(value)
      }
    },
    [headerHeight],
  )

  if (isDesktop || isTablet) {
    return 0
  }

  // Use measured height if available, otherwise use fallback
  return measuredHeight > 0 ? measuredHeight : fallbackHeight
}
