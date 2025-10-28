import {
  type NativeStackScreenProps,
  type SearchTabNavigatorParams,
} from '#/lib/routes/types'
import {SearchScreenShell} from './Shell'

export function SearchScreen(
  props: NativeStackScreenProps<SearchTabNavigatorParams, 'Search'>,
) {
  // TODO: maybe just pass in all params
  const queryParam = props.route?.params?.q ?? ''

  return (
    <SearchScreenShell
      queryParam={queryParam}
      testID="searchScreen"
      isExplore
    />
  )
}
