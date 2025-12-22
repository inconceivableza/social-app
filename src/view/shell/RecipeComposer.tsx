import {useEffect} from 'react'
import {Animated, Easing} from 'react-native'

import {useAnimatedValue} from '#/lib/hooks/useAnimatedValue'
import {useComposerState} from '#/state/shell/composer'
import {atoms as a, useTheme} from '#/alf'
import {ComposerRecipe} from '../com/composer/ComposerRecipe'

export function RecipeComposer({winHeight}: {winHeight: number}) {
  const state = useComposerState()
  const t = useTheme()
  const initInterp = useAnimatedValue(0)

  useEffect(() => {
    if (state) {
      Animated.timing(initInterp, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }).start()
    } else {
      initInterp.setValue(0)
    }
  }, [initInterp, state])
  const wrapperAnimStyle = {
    transform: [
      {
        translateY: initInterp.interpolate({
          inputRange: [0, 1],
          outputRange: [winHeight, 0],
        }),
      },
    ],
  }

  // rendering
  // =

  if (state?.type !== 'recipe') {
    return null
  }

  return (
    <Animated.View
      style={[a.absolute, a.inset_0, t.atoms.bg, wrapperAnimStyle]}
      aria-modal
      accessibilityViewIsModal>
      <ComposerRecipe edit={state.edit} />
    </Animated.View>
  )
}
