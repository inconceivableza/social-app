import {
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  type StyleProp,
  type TextInput,
  View,
  type ViewStyle,
} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native'
import {useQueryClient} from '@tanstack/react-query'
import {mapValues, pickBy} from 'lodash'

import {branding, HITSLOP_10, HITSLOP_20} from '#/lib/constants'
import {useNonReactiveCallback} from '#/lib/hooks/useNonReactiveCallback'
import {MagnifyingGlassIcon} from '#/lib/icons'
import {type NavigationProp, type SearchTabOptions} from '#/lib/routes/types'
import {isWeb} from '#/platform/detection'
import {listenSoftReset} from '#/state/events'
import {useActorAutocompleteQuery} from '#/state/queries/actor-autocomplete'
import {
  unstableCacheProfileView,
  useProfilesQuery,
} from '#/state/queries/profile'
import {useSession} from '#/state/session'
import {useSetMinimalShellMode} from '#/state/shell'
import {
  makeSearchQuery,
  type Params,
  parseSearchQuery,
} from '#/screens/Search/utils'
import {
  atoms as a,
  platform,
  tokens,
  useBreakpoints,
  useTheme,
  web,
} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {SearchInput} from '#/components/forms/SearchInput'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {account, useStorage} from '#/storage'
import type * as bsky from '#/types/bsky'
import {AutocompleteResults} from './components/AutocompleteResults'
import {
  recipeParamsSchema,
  RecipeSearchFields,
  useRecipeSearchState,
} from './components/RecipeSearchFields'
import {SearchHistory} from './components/SearchHistory'
import {SearchLanguageDropdown} from './components/SearchLanguageDropdown'
import {SearchTypeInput} from './components/SearchTypeInput'
import {type SearchType} from './components/SearchTypeInput/options'
import {Explore} from './Explore'
import {SearchResults} from './SearchResults'

type ParamsArg = Params | Readonly<object | undefined>

function nonEmptyParams(params: ParamsArg) {
  return Object.fromEntries(
    Object.entries(params ?? {}).filter(([_key, value]) => !!value),
  )
}

function excludeRecipeParams(params: ParamsArg) {
  return Object.fromEntries(
    Object.entries(params ?? {}).filter(
      ([key]) =>
        !(key in ['recipeCategories', 'recipeCuisines', 'recipeDiets']),
    ),
  )
}

function equalParams(p1: ParamsArg, p2: ParamsArg) {
  /* const t1 = (p1 ?? {}) as Record<string, string>, t2 = (p2 ?? {}) as Record<string, string>
  const k1 = Object.keys(t1), k2 = Object.keys(t2)
  if (k1.length !== k2.length) return false;
  for (const k of k1) {
    if (!(k in t2)) return false
    if (t1[k] !== t2[k]) return false
  }
  return true */
  return JSON.stringify(p1 ?? {}) === JSON.stringify(p2 ?? {})
}

export function SearchScreenShell({
  queryParam,
  testID,
  fixedParams,
  navButton = 'menu',
  inputPlaceholder,
  isExplore,
}: {
  queryParam: string
  testID: string
  fixedParams?: Params
  navButton?: 'back' | 'menu'
  inputPlaceholder?: string
  isExplore?: boolean
}) {
  const t = useTheme()
  const {gtMobile} = useBreakpoints()
  const navigation = useNavigation<NavigationProp>()
  const route = useRoute()
  const textInput = useRef<TextInput>(null)
  const {_} = useLingui()
  const setMinimalShellMode = useSetMinimalShellMode()
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()

  // Query terms
  const [searchText, setSearchText] = useState<string>(queryParam)
  const {data: autocompleteData, isFetching: isAutocompleteFetching} =
    useActorAutocompleteQuery(searchText, true)

  const [showAutocomplete, setShowAutocomplete] = useState(false)

  const [termHistory = [], setTermHistory] = useStorage(account, [
    currentAccount?.did ?? 'pwi',
    'searchTermHistory',
  ] as const)
  const [accountHistory = [], setAccountHistory] = useStorage(account, [
    currentAccount?.did ?? 'pwi',
    'searchAccountHistory',
  ])

  const {data: accountHistoryProfiles} = useProfilesQuery({
    handles: accountHistory,
    maintainData: true,
  })

  const updateSearchHistory = useCallback(
    async (item: string) => {
      if (!item) return
      const newSearchHistory = [
        item,
        ...termHistory.filter(search => search !== item),
      ].slice(0, 6)
      setTermHistory(newSearchHistory)
    },
    [termHistory, setTermHistory],
  )

  const updateProfileHistory = useCallback(
    async (item: bsky.profile.AnyProfileView) => {
      const newAccountHistory = [
        item.did,
        ...accountHistory.filter(p => p !== item.did),
      ].slice(0, 10)
      setAccountHistory(newAccountHistory)
    },
    [accountHistory, setAccountHistory],
  )

  const deleteSearchHistoryItem = useCallback(
    async (item: string) => {
      setTermHistory(termHistory.filter(search => search !== item))
    },
    [termHistory, setTermHistory],
  )
  const deleteProfileHistoryItem = useCallback(
    async (item: bsky.profile.AnyProfileView) => {
      setAccountHistory(accountHistory.filter(p => p !== item.did))
    },
    [accountHistory, setAccountHistory],
  )
  // TODO: rethink query manager so that query construction doesn't happen in two steps
  let {
    params: incompleteParams,
    query,
    handlers,
  } = useQueryManager({
    initialQuery: queryParam,
    fixedParams,
  })

  const parsedParams = useMemo(() => {
    return recipeParamsSchema.parse(route.params ?? {})
  }, [route.params])

  const [recipeSearchFields, dispatchRecipeSearch] =
    useRecipeSearchState(parsedParams)

  const [searchType, setSearchType] = useState<SearchType>(
    parsedParams.searchType,
  )

  const {queryWithParams, params} = useMemo(() => {
    const recipeParams = mapValues(recipeSearchFields, opts =>
      // Certain options have multiple paths i.e. multiple parents. We want results from all of them.
      opts.flatMap(opt => opt.paths.map(path => path.join('/'))).join(','),
    )
    // we need to change the tab parameter if it isn't available with the current search
    const showPeopleAndFeeds = searchType !== 'recipes' && !incompleteParams
    const actualTab = showPeopleAndFeeds
      ? parsedParams.tab
      : parsedParams.tab in ['top', 'latest']
        ? parsedParams.tab
        : 'top'
    const params = {
      ...incompleteParams,
      ...(searchType === 'recipes' ? recipeParams : {}),
      searchType,
      tab: actualTab,
    }
    const queryWithParams = makeSearchQuery(query, params)
    const checkRouteParams = nonEmptyParams({q: query, ...params})
    if (!equalParams(checkRouteParams, route.params)) {
      navigation.replaceParams(checkRouteParams)
    }
    return {queryWithParams, params}
  }, [
    query,
    incompleteParams,
    parsedParams,
    recipeSearchFields,
    searchType,
    navigation,
    route.params,
  ])

  const onChangeSearchType = useCallback(
    (searchType: SearchType) => {
      const relevantParams =
        searchType === 'recipes' ? params : excludeRecipeParams(params)
      const newParams = {
        ...relevantParams,
        q: query,
        searchType,
      }
      setSearchType(searchType)
      navigation.replaceParams(newParams)
    },
    [navigation, query, params],
  )

  const showFilters = Boolean(queryWithParams && !showAutocomplete)

  // web only - measure header height for sticky positioning
  const [headerHeight, setHeaderHeight] = useState(0)
  const headerRef = useRef(null)
  useLayoutEffect(() => {
    if (isWeb) {
      if (!headerRef.current) return
      const measurement = (headerRef.current as Element).getBoundingClientRect()
      setHeaderHeight(measurement.height)
    }
  }, [])

  useFocusEffect(
    useNonReactiveCallback(() => {
      if (isWeb) {
        setSearchText(queryParam)
      }
    }),
  )

  const onPressClearQuery = useCallback(() => {
    scrollToTopWeb()
    setSearchText('')
    textInput.current?.focus()
  }, [])

  const onChangeText = useCallback(async (text: string) => {
    scrollToTopWeb()
    setSearchText(text)
  }, [])

  const navigateToItem = useCallback(
    (item: string) => {
      scrollToTopWeb()
      setShowAutocomplete(false)
      updateSearchHistory(item)

      if (isWeb) {
        // @ts-expect-error route is not typesafe
        navigation.push(route.name, {q: item, ...pickBy(params)})
      } else {
        textInput.current?.blur()
        navigation.setParams({q: item, ...pickBy(params)})
      }
    },
    [updateSearchHistory, navigation, route, params],
  )

  const onPressCancelSearch = useCallback(() => {
    scrollToTopWeb()
    textInput.current?.blur()
    setShowAutocomplete(false)
    if (isWeb) {
      // Empty params resets the URL to be /search rather than /search?q=
      const {q: _q, ...parameters} = (route.params ?? {}) as {
        [key: string]: string
      }
      // @ts-expect-error route is not typesafe
      navigation.replace(route.name, parameters)
    } else {
      setSearchText('')
      const {q: _q, ...parameters} = (route.params ?? {}) as {
        [key: string]: string
      }
      navigation.setParams({q: '', ...parameters})
    }
  }, [setShowAutocomplete, setSearchText, navigation, route.params, route.name])

  const onSubmit = useCallback(() => {
    navigateToItem(searchText)
  }, [navigateToItem, searchText])

  const onAutocompleteResultPress = useCallback(() => {
    if (isWeb) {
      setShowAutocomplete(false)
    } else {
      textInput.current?.blur()
    }
  }, [])

  const handleHistoryItemClick = useCallback(
    (item: string) => {
      setSearchText(item)
      navigateToItem(item)
    },
    [navigateToItem],
  )

  const handleProfileClick = useCallback(
    (profile: bsky.profile.AnyProfileView) => {
      unstableCacheProfileView(queryClient, profile)
      // Slight delay to avoid updating during push nav animation.
      setTimeout(() => {
        updateProfileHistory(profile)
      }, 400)
    },
    [updateProfileHistory, queryClient],
  )

  const onSoftReset = useCallback(() => {
    if (isWeb) {
      // Empty params resets the URL to be /search rather than /search?q=
      // Also clear the tab parameter when soft resetting
      const {
        q: _q,
        tab: _tab,
        ...parameters
      } = (route.params ?? {}) as {
        [key: string]: string
      }
      // @ts-expect-error route is not typesafe
      navigation.replace(route.name, parameters)
    } else {
      setSearchText('')
      navigation.setParams({q: '', tab: undefined})
      textInput.current?.focus()
    }
  }, [navigation, route])

  useFocusEffect(
    useCallback(() => {
      setMinimalShellMode(false)
      return listenSoftReset(onSoftReset)
    }, [onSoftReset, setMinimalShellMode]),
  )

  const onSearchInputFocus = useCallback(() => {
    if (searchType === 'recipes') return
    if (isWeb) {
      // Prevent a jump on iPad by ensuring that
      // the initial focused render has no result list.
      requestAnimationFrame(() => {
        setShowAutocomplete(true)
      })
    } else {
      setShowAutocomplete(true)
    }
  }, [setShowAutocomplete, searchType])

  const focusSearchInput = useCallback(
    (tab?: SearchTabOptions) => {
      textInput.current?.focus()

      // If a tab is specified, set the tab parameter
      if (tab) {
        if (isWeb) {
          navigation.setParams({...route.params, tab})
        } else {
          navigation.setParams({tab})
        }
      }
    },
    [navigation, route],
  )

  const updateCurrentTab = useCallback(
    (tab?: SearchTabOptions) => {
      // If a tab is specified, set the tab parameter
      if (tab) {
        if (isWeb) {
          navigation.setParams({...route.params, tab})
        } else {
          navigation.setParams({tab})
        }
      }
    },
    [navigation, route],
  )

  const showHeader = !gtMobile || navButton !== 'menu'
  return (
    <Layout.Screen testID={testID}>
      <View
        ref={headerRef}
        onLayout={evt => {
          if (isWeb) setHeaderHeight(evt.nativeEvent.layout.height)
        }}
        style={[
          a.relative,
          a.z_10,
          web({
            position: 'sticky',
            top: 0,
          }),
        ]}>
        <Layout.Center style={t.atoms.bg}>
          {showHeader && (
            <View
              // HACK: shift up search input. we can't remove the top padding
              // on the search input because it messes up the layout animation
              // if we add it only when the header is hidden
              style={{marginBottom: tokens.space.xs * -1}}>
              <Layout.Header.Outer noBottomBorder>
                {navButton === 'menu' ? (
                  <Layout.Header.MenuButton />
                ) : (
                  <Layout.Header.BackButton />
                )}
                <Layout.Header.Content align="left">
                  <Layout.Header.TitleText>
                    {isExplore ? <Trans>Explore</Trans> : <Trans>Search</Trans>}
                  </Layout.Header.TitleText>
                </Layout.Header.Content>
                {showFilters ? (
                  <SearchLanguageDropdown
                    value={params.lang}
                    onChange={handlers.setLang}
                  />
                ) : (
                  <Layout.Header.Slot />
                )}
              </Layout.Header.Outer>
            </View>
          )}
          <View style={[a.px_lg, a.pt_sm, a.pb_sm, a.overflow_hidden]}>
            <View style={[a.gap_sm]}>
              <View
                style={[
                  a.w_full,
                  a.flex_row,
                  a.align_stretch,
                  a.gap_xs,
                  a.align_center,
                ]}>
                <View style={[platform({web: {width: '25%'}})]}>
                  <SearchTypeInput
                    value={searchType}
                    onChange={onChangeSearchType}
                  />
                </View>
                <View style={{flexGrow: 1}}>
                  <SearchInput
                    ref={textInput}
                    value={searchText}
                    onFocus={onSearchInputFocus}
                    onChangeText={onChangeText}
                    onClearText={onPressClearQuery}
                    onSubmitEditing={onSubmit}
                    placeholder={
                      (inputPlaceholder ?? searchType === 'all')
                        ? _(msg`Search for posts, users, or feeds`)
                        : _(msg`Search for recipes`)
                    }
                    hitSlop={{...HITSLOP_20, top: 0}}
                  />
                </View>
                {showAutocomplete && (
                  <Button
                    label={_(msg`Cancel search`)}
                    size="large"
                    variant="ghost"
                    color="secondary"
                    style={[a.px_sm]}
                    onPress={onPressCancelSearch}
                    hitSlop={HITSLOP_10}>
                    <ButtonText>
                      <Trans>Cancel</Trans>
                    </ButtonText>
                  </Button>
                )}
              </View>
              {searchType === 'recipes' && (
                <View>
                  <RecipeSearchFields
                    state={recipeSearchFields}
                    dispatch={dispatchRecipeSearch}
                  />
                </View>
              )}
              {showFilters && !showHeader && (
                <View
                  style={[
                    a.flex_row,
                    a.align_center,
                    a.justify_between,
                    a.gap_sm,
                  ]}>
                  <SearchLanguageDropdown
                    value={params.lang}
                    onChange={handlers.setLang}
                  />
                </View>
              )}
            </View>
          </View>
        </Layout.Center>
      </View>

      <View
        style={{
          display: showAutocomplete && !fixedParams ? 'flex' : 'none',
          flex: 1,
        }}>
        {query.trim() ? (
          <AutocompleteResults
            isAutocompleteFetching={isAutocompleteFetching}
            autocompleteData={autocompleteData}
            queryType={searchType}
            onSubmit={onSubmit}
            onResultPress={onAutocompleteResultPress}
            onProfileClick={handleProfileClick}
          />
        ) : (
          <SearchHistory
            searchHistory={termHistory}
            selectedProfiles={accountHistoryProfiles?.profiles || []}
            onItemClick={handleHistoryItemClick}
            onProfileClick={handleProfileClick}
            onRemoveItemClick={deleteSearchHistoryItem}
            onRemoveProfileClick={deleteProfileHistoryItem}
          />
        )}
      </View>
      <View
        style={{
          display: showAutocomplete ? 'none' : 'flex',
          flex: 1,
        }}>
        <SearchScreenInner
          query={query}
          queryWithParams={queryWithParams}
          headerHeight={headerHeight}
          focusSearchInput={focusSearchInput}
          updateCurrentTab={updateCurrentTab}
        />
      </View>
    </Layout.Screen>
  )
}

const tabIndexToTab: Record<number, SearchTabOptions> = {
  0: 'top',
  1: 'latest',
  2: 'people',
  3: 'feeds',
}

let SearchScreenInner = ({
  query,
  queryWithParams,
  headerHeight,
  focusSearchInput,
  updateCurrentTab,
}: {
  query: string
  queryWithParams: string
  headerHeight: number
  focusSearchInput: (tab?: SearchTabOptions) => void
  updateCurrentTab: (tab?: SearchTabOptions) => void
}): React.ReactNode => {
  const t = useTheme()
  const setMinimalShellMode = useSetMinimalShellMode()
  const {hasSession} = useSession()
  const {gtTablet} = useBreakpoints()
  const route = useRoute()

  // Get tab parameter from route params
  const tabParam = (route.params as {q?: string; tab?: SearchTabOptions})?.tab

  // Map tab parameter to tab index
  const getInitialTabIndex = useCallback(() => {
    if (!tabParam) return 0
    switch (tabParam) {
      case 'user':
      case 'profile':
      case 'top':
        return 0
      case 'latest':
        return 1
      case 'people':
        return 2 // People tab
      case 'feed':
        return 3 // Feeds tab
      case 'feeds':
      default:
        return 0
    }
  }, [tabParam])

  const [activeTab, setActiveTab] = useState(getInitialTabIndex())

  // Update activeTab when tabParam changes
  useLayoutEffect(() => {
    const newTabIndex = getInitialTabIndex()
    if (newTabIndex !== activeTab) {
      setActiveTab(newTabIndex)
    }
  }, [tabParam, activeTab, getInitialTabIndex])

  const onPageSelected = useCallback(
    (index: number) => {
      setMinimalShellMode(false)
      setActiveTab(index)
      updateCurrentTab(tabIndexToTab[index])
    },
    [setMinimalShellMode, updateCurrentTab],
  )
  return queryWithParams ? (
    <SearchResults
      query={query}
      queryWithParams={queryWithParams}
      activeTab={activeTab}
      headerHeight={headerHeight}
      onPageSelected={onPageSelected}
      initialPage={activeTab}
    />
  ) : hasSession ? (
    <Explore focusSearchInput={focusSearchInput} headerHeight={headerHeight} />
  ) : (
    <Layout.Center>
      <View style={a.flex_1}>
        {gtTablet && (
          <View
            style={[
              a.border_b,
              t.atoms.border_contrast_low,
              a.px_lg,
              a.pt_sm,
              a.pb_lg,
            ]}>
            <Text style={[a.text_2xl, a.font_bold]}>
              <Trans>Search</Trans>
            </Text>
          </View>
        )}

        <View style={[a.align_center, a.justify_center, a.py_4xl, a.gap_lg]}>
          <MagnifyingGlassIcon
            strokeWidth={3}
            size={60}
            style={t.atoms.text_contrast_medium as StyleProp<ViewStyle>}
          />
          <Text style={[t.atoms.text_contrast_medium, a.text_md]}>
            <Trans>
              Find posts, users, and feeds on {branding.naming.app_name}
            </Trans>
          </Text>
        </View>
      </View>
    </Layout.Center>
  )
}
SearchScreenInner = memo(SearchScreenInner)

function useQueryManager({
  initialQuery,
  fixedParams,
}: {
  initialQuery: string
  fixedParams?: Params
}) {
  const {query, params: initialParams} = useMemo(() => {
    return parseSearchQuery(initialQuery || '')
  }, [initialQuery])
  const [prevInitialQuery, setPrevInitialQuery] = useState(initialQuery)
  const [lang, setLang] = useState(initialParams.lang || '')

  if (initialQuery !== prevInitialQuery) {
    // handle new queryParam change (from manual search entry)
    setPrevInitialQuery(initialQuery)
    setLang(initialParams.lang || '')
  }

  const params = useMemo(() => {
    return {
      // default stuff
      ...initialParams,
      // managed stuff
      lang,
      ...fixedParams,
      // ...recipeParams
    }
  }, [lang, initialParams, fixedParams])
  const handlers = useMemo(
    () => ({
      setLang,
    }),
    [setLang],
  )

  return useMemo(() => {
    return {
      query,
      params: {
        ...params,
      },
      handlers,
    }
  }, [query, params, handlers])
}

function scrollToTopWeb() {
  if (isWeb) {
    window.scrollTo(0, 0)
  }
}
