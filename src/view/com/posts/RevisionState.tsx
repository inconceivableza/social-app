import {View} from 'react-native'
import {Trans} from '@lingui/macro'

import {type RevisionState} from '#/lib/api/feed/utils'
import {Text} from '#/view/com/util/text/Text'
import {atoms as a, useTheme} from '#/alf'

export function RevisionState({state}: {state: RevisionState}) {
  const t = useTheme()

  if (state === 'unedited') {
    return null
  }
  return (
    <View>
      <Text style={[a.pl_xs, t.atoms.text]}>
        {state === 'edited' ? <Trans>Edited</Trans> : <Trans>Outdated</Trans>}
      </Text>
    </View>
  )
}
