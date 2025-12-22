import React from 'react'
import {Modal, View} from 'react-native'

import {useDialogStateControlContext} from '#/state/dialogs'
import {useComposerState} from '#/state/shell/composer'
import {atoms as a, useTheme} from '#/alf'
import {useComposerCancelRef} from '../com/composer/Composer'
import {ComposerRecipe} from '../com/composer/ComposerRecipe'

export function RecipeComposer({}: {winHeight: number}) {
  const {setFullyExpandedCount} = useDialogStateControlContext()
  const t = useTheme()
  const state = useComposerState()
  const ref = useComposerCancelRef()

  const open = !!state && state?.type === 'recipe'
  const prevOpen = React.useRef(open)

  React.useEffect(() => {
    if (open && !prevOpen.current) {
      setFullyExpandedCount(c => c + 1)
    } else if (!open && prevOpen.current) {
      setFullyExpandedCount(c => c - 1)
    }
    prevOpen.current = open
  }, [open, setFullyExpandedCount])

  return (
    <Modal
      aria-modal
      accessibilityViewIsModal
      visible={open}
      presentationStyle="pageSheet"
      animationType="slide"
      allowSwipeDismissal="true"
      onRequestClose={() => ref.current?.onPressCancel()}>
      <View style={[t.atoms.bg, a.flex_1]}>
        <ComposerRecipe edit={state?.edit} />
      </View>
    </Modal>
  )
}
