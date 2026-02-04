import {memo} from 'react'
import {ActivityIndicator, View} from 'react-native'
import {type AppBskyActorDefs} from '@atproto/api'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useModerationOpts} from '#/state/preferences/moderation-opts'
import {SearchLinkCard} from '#/view/shell/desktop/Search'
import {SearchProfileCard} from '#/screens/Search/components/SearchProfileCard'
import {atoms as a} from '#/alf'
import * as Layout from '#/components/Layout'
import {type SearchType} from './SearchTypeInput/options'

let AutocompleteResults = ({
  isAutocompleteFetching,
  autocompleteData,
  queryType,
  onSubmit,
  onResultPress,
  onProfileClick,
}: {
  isAutocompleteFetching: boolean
  autocompleteData: AppBskyActorDefs.ProfileViewBasic[] | undefined
  queryType: SearchType
  onSubmit: () => void
  onResultPress: () => void
  onProfileClick: (profile: AppBskyActorDefs.ProfileViewBasic) => void
}): React.ReactNode => {
  const {_} = useLingui()
  const moderationOpts = useModerationOpts()
  return (
    <>
      {(isAutocompleteFetching && !autocompleteData?.length) ||
      !moderationOpts ? (
        <Layout.Content>
          <View style={[a.py_xl]}>
            <ActivityIndicator />
          </View>
        </Layout.Content>
      ) : (
        <Layout.Content
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <SearchLinkCard
            label={_(
              msg`Search for matching ${queryType === 'all' ? _(`posts`) : _(`recipes`)}`,
            )}
            onPress={onSubmit}
            style={a.border_b}
          />
          {autocompleteData?.map(item => (
            <SearchProfileCard
              key={item.did}
              profile={item}
              moderationOpts={moderationOpts}
              onPress={() => {
                onProfileClick(item)
                onResultPress()
              }}
            />
          ))}
          <View style={{height: 200}} />
        </Layout.Content>
      )}
    </>
  )
}
AutocompleteResults = memo(AutocompleteResults)
export {AutocompleteResults}
