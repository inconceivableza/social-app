import {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {ActivityIndicator, View} from 'react-native'
import {type AppBskyFeedDefs} from '@atproto/api'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import z from 'zod'

import {branding} from '#/lib/constants'
import {usePalette} from '#/lib/hooks/usePalette'
import {augmentSearchQuery} from '#/lib/strings/helpers'
import {useActorSearch} from '#/state/queries/actor-search'
import {usePopularFeedsSearch} from '#/state/queries/feed'
import {useSearchPostsQuery} from '#/state/queries/search-posts'
import {useSession} from '#/state/session'
import {useLoggedOutViewControls} from '#/state/shell/logged-out'
import {useCloseAllActiveElements} from '#/state/util'
import {Pager, type PagerRef} from '#/view/com/pager/Pager'
import {TabBar} from '#/view/com/pager/TabBar'
import {Post} from '#/view/com/post/Post'
import {ProfileCardWithFollowBtn} from '#/view/com/profile/ProfileCard'
import {List} from '#/view/com/util/List'
import {atoms as a, useTheme, web} from '#/alf'
import * as FeedCard from '#/components/FeedCard'
import * as Layout from '#/components/Layout'
import {InlineLinkText} from '#/components/Link'
import {SearchError} from '#/components/SearchError'
import {Text} from '#/components/Typography'
import {parseSearchQuery} from './utils'

// Show the People and Feeds tabs only if there are no other params set and search type is 'all'
const noParamsSchema = z
  .object({
    searchType: z.literal('all'),
    tab: z
      .enum(['top', 'latest', 'people', 'user', 'profile', 'feeds', 'feed'])
      .default('top'),
  })
  .strict()

let SearchResults = ({
  query,
  queryWithParams,
  activeTab,
  onPageSelected,
  headerHeight,
  initialPage = 0,
}: {
  query: string
  queryWithParams: string
  activeTab: number
  onPageSelected: (page: number) => void
  headerHeight: number
  initialPage?: number
}): React.ReactNode => {
  const {_} = useLingui()
  const pagerRef = useRef<PagerRef>(null)
  const parsedQuery = parseSearchQuery(queryWithParams)
  const {searchType, tab: _tab, ...serverParams} = parsedQuery.params
  const serverParamsStr = Object.keys(serverParams)
    .map(key => `${key}:${serverParams[key]}`)
    .join(' ')
  const queryForServer =
    parsedQuery.query +
    ' ' +
    serverParamsStr +
    (searchType && searchType !== 'all' ? ` searchType:${searchType}` : '')
  const showPeopleAndFeeds = useMemo(() => {
    return noParamsSchema.safeParse(parsedQuery.params).success
  }, [parsedQuery])
  const sections = useMemo(() => {
    const sections: {
      title: string
      component: React.ReactNode
    }[] = [
      {
        title: _(msg`Top`),
        component: (
          <SearchScreenPostResults
            query={queryForServer}
            sort="top"
            active={activeTab === 0}
          />
        ),
      },
      {
        title: _(msg`Latest`),
        component: (
          <SearchScreenPostResults
            query={queryForServer}
            sort="latest"
            active={activeTab === 1}
          />
        ),
      },
    ]
    if (showPeopleAndFeeds) {
      sections.push(
        {
          title: _(msg`People`),
          component: (
            <SearchScreenUserResults query={query} active={activeTab === 2} />
          ),
        },
        {
          title: _(msg`Feeds`),
          component: (
            <SearchScreenFeedsResults query={query} active={activeTab === 3} />
          ),
        },
      )
    }
    return sections
  }, [_, query, queryForServer, activeTab, showPeopleAndFeeds])

  useEffect(() => {
    pagerRef.current?.setPage(activeTab)
  }, [activeTab])
  return (
    <Pager
      ref={pagerRef}
      onPageSelected={onPageSelected}
      renderTabBar={props => (
        <Layout.Center style={[a.z_10, web([a.sticky, {top: headerHeight}])]}>
          <TabBar items={sections.map(section => section.title)} {...props} />
        </Layout.Center>
      )}
      initialPage={initialPage}>
      {sections.map((section, i) => (
        <View key={i}>{section.component}</View>
      ))}
    </Pager>
  )
}
SearchResults = memo(SearchResults)
export {SearchResults}

function Loader() {
  return (
    <Layout.Content>
      <View style={[a.py_xl]}>
        <ActivityIndicator />
      </View>
    </Layout.Content>
  )
}

function EmptyState({
  message,
  error,
  children,
}: {
  message: string
  error?: string
  children?: React.ReactNode
}) {
  const t = useTheme()

  return (
    <Layout.Content>
      <View style={[a.p_xl]}>
        <View style={[t.atoms.bg_contrast_25, a.rounded_sm, a.p_lg]}>
          <Text style={[a.text_md]}>{message}</Text>

          {error && (
            <>
              <View
                style={[
                  {
                    marginVertical: 12,
                    height: 1,
                    width: '100%',
                    backgroundColor: t.atoms.text.color,
                    opacity: 0.2,
                  },
                ]}
              />

              <Text style={[t.atoms.text_contrast_medium]}>
                <Trans>Error: {error}</Trans>
              </Text>
            </>
          )}

          {children}
        </View>
      </View>
    </Layout.Content>
  )
}

type SearchResultSlice =
  | {
      type: 'post'
      key: string
      post: AppBskyFeedDefs.PostView
    }
  | {
      type: 'loadingMore'
      key: string
    }

let SearchScreenPostResults = ({
  query,
  sort,
  active,
}: {
  query: string
  sort?: 'top' | 'latest'
  active: boolean
}): React.ReactNode => {
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const [isPTR, setIsPTR] = useState(false)
  const isLoggedin = Boolean(currentAccount?.did)
  const appName = branding.naming?.app_name || _(msg`Bluesky`)

  const augmentedQuery = useMemo(() => {
    return augmentSearchQuery(query || '', {did: currentAccount?.did})
  }, [query, currentAccount])

  const {
    isFetched,
    data: results,
    isFetching,
    error,
    refetch,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useSearchPostsQuery({query: augmentedQuery, sort, enabled: active})

  const pal = usePalette('default')
  const t = useTheme()
  const onPullToRefresh = useCallback(async () => {
    setIsPTR(true)
    await refetch()
    setIsPTR(false)
  }, [setIsPTR, refetch])
  const onEndReached = useCallback(() => {
    if (isFetching || !hasNextPage || error) return
    fetchNextPage()
  }, [isFetching, error, hasNextPage, fetchNextPage])

  const posts = useMemo(() => {
    return results?.pages.flatMap(page => page.posts) || []
  }, [results])
  const items = useMemo(() => {
    let temp: SearchResultSlice[] = []

    const seenUris = new Set()
    for (const post of posts) {
      if (seenUris.has(post.uri)) {
        continue
      }
      temp.push({
        type: 'post',
        key: post.uri,
        post,
      })
      seenUris.add(post.uri)
    }

    if (isFetchingNextPage) {
      temp.push({
        type: 'loadingMore',
        key: 'loadingMore',
      })
    }

    return temp
  }, [posts, isFetchingNextPage])

  const closeAllActiveElements = useCloseAllActiveElements()
  const {requestSwitchToAccount} = useLoggedOutViewControls()

  const showSignIn = () => {
    closeAllActiveElements()
    requestSwitchToAccount({requestedAccount: 'none'})
  }

  const showCreateAccount = () => {
    closeAllActiveElements()
    requestSwitchToAccount({requestedAccount: 'new'})
  }

  if (!isLoggedin) {
    return (
      <SearchError
        title={_(msg`Search is currently unavailable when logged out`)}>
        <Text style={[a.text_md, a.text_center, a.leading_snug]}>
          <Trans>
            <InlineLinkText
              style={[pal.link]}
              label={_(msg`Sign in`)}
              to={'#'}
              onPress={showSignIn}>
              Sign in
            </InlineLinkText>
            <Text style={t.atoms.text_contrast_medium}> or </Text>
            <InlineLinkText
              style={[pal.link]}
              label={_(msg`Create an account`)}
              to={'#'}
              onPress={showCreateAccount}>
              create an account
            </InlineLinkText>
            <Text> </Text>
            <Text style={t.atoms.text_contrast_medium}>
              to search for news, sports, politics, and everything else
              happening on {appName}.
            </Text>
          </Trans>
        </Text>
      </SearchError>
    )
  }

  return error ? (
    <EmptyState
      message={_(
        msg`We're sorry, but your search could not be completed. Please try again in a few minutes.`,
      )}
      error={error.toString()}
    />
  ) : (
    <>
      {isFetched ? (
        <>
          {posts.length ? (
            <List
              data={items}
              renderItem={({item}) => {
                if (item.type === 'post') {
                  return <Post post={item.post} />
                } else {
                  return null
                }
              }}
              keyExtractor={item => item.key}
              refreshing={isPTR}
              onRefresh={onPullToRefresh}
              onEndReached={onEndReached}
              desktopFixedHeight
              contentContainerStyle={{paddingBottom: 100}}
            />
          ) : (
            <EmptyState message={_(msg`No results found`)} />
          )}
        </>
      ) : (
        <Loader />
      )}
    </>
  )
}
SearchScreenPostResults = memo(SearchScreenPostResults)

let SearchScreenUserResults = ({
  query,
  active,
}: {
  query: string
  active: boolean
}): React.ReactNode => {
  const {_} = useLingui()

  const {data: results, isFetched} = useActorSearch({
    query,
    enabled: active,
  })

  return isFetched && results ? (
    <>
      {results.length ? (
        <List
          data={results}
          renderItem={({item}) => <ProfileCardWithFollowBtn profile={item} />}
          keyExtractor={item => item.did}
          desktopFixedHeight
          contentContainerStyle={{paddingBottom: 100}}
        />
      ) : (
        <EmptyState message={_(msg`No results found for ${query}`)} />
      )}
    </>
  ) : (
    <Loader />
  )
}
SearchScreenUserResults = memo(SearchScreenUserResults)

let SearchScreenFeedsResults = ({
  query,
  active,
}: {
  query: string
  active: boolean
}): React.ReactNode => {
  const t = useTheme()
  const {_} = useLingui()

  const {data: results, isFetched} = usePopularFeedsSearch({
    query,
    enabled: active,
  })

  return isFetched && results ? (
    <>
      {results.length ? (
        <List
          data={results}
          renderItem={({item}) => (
            <View
              style={[
                a.border_b,
                t.atoms.border_contrast_low,
                a.px_lg,
                a.py_lg,
              ]}>
              <FeedCard.Default view={item} />
            </View>
          )}
          keyExtractor={item => item.uri}
          desktopFixedHeight
          contentContainerStyle={{paddingBottom: 100}}
        />
      ) : (
        <EmptyState message={_(msg`No results found for ${query}`)} />
      )}
    </>
  ) : (
    <Loader />
  )
}
SearchScreenFeedsResults = memo(SearchScreenFeedsResults)
