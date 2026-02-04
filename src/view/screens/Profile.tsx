import React, {useCallback, useMemo} from 'react'
import {StyleSheet} from 'react-native'
import {SafeAreaView} from 'react-native-safe-area-context'
import {
  type AppBskyActorDefs,
  moderateProfile,
  type ModerationOpts,
  RichText as RichTextAPI,
} from '@atproto/api'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useFocusEffect} from '@react-navigation/native'
import {useQueryClient} from '@tanstack/react-query'

import {useSetTitle} from '#/lib/hooks/useSetTitle'
import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {combinedDisplayName} from '#/lib/strings/display-names'
import {cleanError} from '#/lib/strings/errors'
import {colors} from '#/lib/styles'
import {useProfileShadow} from '#/state/cache/profile-shadow'
import {listenSoftReset} from '#/state/events'
import {useModerationOpts} from '#/state/preferences/moderation-opts'
import {useLabelerInfoQuery} from '#/state/queries/labeler'
import {resetProfilePostsQueries} from '#/state/queries/post-feed'
import {useProfileQuery} from '#/state/queries/profile'
import {useResolveDidQuery} from '#/state/queries/resolve-uri'
import {useAgent, useSession} from '#/state/session'
import {useSetMinimalShellMode} from '#/state/shell'
import {ProfileFeedgens} from '#/view/com/feeds/ProfileFeedgens'
import {ProfileLists} from '#/view/com/lists/ProfileLists'
import {PagerWithHeader} from '#/view/com/pager/PagerWithHeader'
import {ErrorScreen} from '#/view/com/util/error/ErrorScreen'
import {type ListRef} from '#/view/com/util/List'
import {ProfileHeader, ProfileHeaderLoading} from '#/screens/Profile/Header'
import {ProfileFeedSection} from '#/screens/Profile/Sections/Feed'
import {ProfileLabelsSection} from '#/screens/Profile/Sections/Labels'
import {atoms as a} from '#/alf'
import * as Layout from '#/components/Layout'
import {ScreenHider} from '#/components/moderation/ScreenHider'
import {ProfileStarterPacks} from '#/components/StarterPack/ProfileStarterPacks'
import {navigate} from '#/Navigation'
import {ExpoScrollForwarderView} from '../../../modules/expo-scroll-forwarder'
import {ComposeFAB} from '../com/composer/ComposeFAB'

interface SectionRef {
  scrollToTop: () => void
}

type Props = NativeStackScreenProps<CommonNavigatorParams, 'Profile'>
export function ProfileScreen(props: Props) {
  return (
    <Layout.Screen testID="profileScreen" style={[a.pt_0]}>
      <ProfileScreenInner {...props} />
    </Layout.Screen>
  )
}

function ProfileScreenInner({route}: Props) {
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()
  const name =
    route.params.name === 'me' ? currentAccount?.did : route.params.name
  const moderationOpts = useModerationOpts()
  const {
    data: resolvedDid,
    error: resolveError,
    refetch: refetchDid,
    isLoading: isLoadingDid,
  } = useResolveDidQuery(name)
  const {
    data: profile,
    error: profileError,
    refetch: refetchProfile,
    isLoading: isLoadingProfile,
    isPlaceholderData: isPlaceholderProfile,
  } = useProfileQuery({
    did: resolvedDid,
  })

  const onPressTryAgain = React.useCallback(() => {
    if (resolveError) {
      refetchDid()
    } else {
      refetchProfile()
    }
  }, [resolveError, refetchDid, refetchProfile])

  // Apply hard-coded redirects as need
  React.useEffect(() => {
    if (resolveError) {
      if (name === 'lulaoficial.bsky.social') {
        console.log('Applying redirect to lula.com.br')
        navigate('Profile', {name: 'lula.com.br'})
      }
    }
  }, [name, resolveError])

  // When we open the profile, we want to reset the posts query if we are blocked.
  React.useEffect(() => {
    if (resolvedDid && profile?.viewer?.blockedBy) {
      resetProfilePostsQueries(queryClient, resolvedDid)
    }
  }, [queryClient, profile?.viewer?.blockedBy, resolvedDid])

  // Most pushes will happen here, since we will have only placeholder data
  if (isLoadingDid || isLoadingProfile) {
    return (
      <Layout.Content>
        <ProfileHeaderLoading />
      </Layout.Content>
    )
  }
  if (resolveError || profileError) {
    return (
      <SafeAreaView style={[a.flex_1]}>
        <ErrorScreen
          testID="profileErrorScreen"
          title={profileError ? _(msg`Not Found`) : _(msg`Oops!`)}
          message={cleanError(resolveError || profileError)}
          onPressTryAgain={onPressTryAgain}
          showHeader
        />
      </SafeAreaView>
    )
  }
  if (profile && moderationOpts) {
    return (
      <ProfileScreenLoaded
        profile={profile}
        moderationOpts={moderationOpts}
        isPlaceholderProfile={isPlaceholderProfile}
        hideBackButton={!!route.params.hideBackButton}
      />
    )
  }
  // should never happen
  return (
    <SafeAreaView style={[a.flex_1]}>
      <ErrorScreen
        testID="profileErrorScreen"
        title="Oops!"
        message="Something went wrong and we're not sure what."
        onPressTryAgain={onPressTryAgain}
        showHeader
      />
    </SafeAreaView>
  )
}

function ProfileScreenLoaded({
  profile: profileUnshadowed,
  isPlaceholderProfile,
  moderationOpts,
  hideBackButton,
}: {
  profile: AppBskyActorDefs.ProfileViewDetailed
  moderationOpts: ModerationOpts
  hideBackButton: boolean
  isPlaceholderProfile: boolean
}) {
  const profile = useProfileShadow(profileUnshadowed)
  const {hasSession, currentAccount} = useSession()
  const setMinimalShellMode = useSetMinimalShellMode()
  const {
    data: labelerInfo,
    error: labelerError,
    isLoading: isLabelerLoading,
  } = useLabelerInfoQuery({
    did: profile.did,
    enabled: !!profile.associated?.labeler,
  })
  const [currentPage, setCurrentPage] = React.useState(0)
  const {_} = useLingui()

  const [scrollViewTag, setScrollViewTag] = React.useState<number | null>(null)

  const postsSectionRef = React.useRef<SectionRef>(null)
  const repliesSectionRef = React.useRef<SectionRef>(null)
  const mediaSectionRef = React.useRef<SectionRef>(null)
  const videosSectionRef = React.useRef<SectionRef>(null)
  const likesSectionRef = React.useRef<SectionRef>(null)
  const feedsSectionRef = React.useRef<SectionRef>(null)
  const listsSectionRef = React.useRef<SectionRef>(null)
  const starterPacksSectionRef = React.useRef<SectionRef>(null)
  const labelsSectionRef = React.useRef<SectionRef>(null)
  const recipesSectionRef = React.useRef<SectionRef>(null)
  const allSectionRef = React.useRef<SectionRef>(null)

  useSetTitle(combinedDisplayName(profile))

  const description = profile.description ?? ''
  const hasDescription = description !== ''
  const [descriptionRT, isResolvingDescriptionRT] = useRichText(description)
  const showPlaceholder = isPlaceholderProfile || isResolvingDescriptionRT
  const moderation = useMemo(
    () => moderateProfile(profile, moderationOpts),
    [profile, moderationOpts],
  )

  const isMe = profile.did === currentAccount?.did
  const hasLabeler = !!profile.associated?.labeler
  const feedGenCount = profile.associated?.feedgens || 0
  const starterPackCount = profile.associated?.starterPacks || 0
  // subtract starterpack count from list count, since starterpacks are a type of list
  const listCount = (profile.associated?.lists || 0) - starterPackCount

  const {visibleSections, sectionById, sectionTitles} = useMemo(() => {
    // Order is significant
    const allSections = [
      {
        id: 'filters',
        visible: hasLabeler,
        title: _(msg`Labels`),
        ref: labelsSectionRef,
      },
      {id: 'all', visible: !hasLabeler, title: _(msg`All`), ref: allSectionRef},
      {id: 'posts', visible: true, title: _(msg`Posts`), ref: postsSectionRef},
      {
        id: 'replies',
        visible:
          hasSession && false /** Currently has same functionality as "all" */,
        title: _(msg`Replies`),
        ref: repliesSectionRef,
      },
      {
        id: 'recipes',
        visible: !hasLabeler,
        title: _(msg`Recipes`),
        ref: recipesSectionRef,
      },
      {
        id: 'reviews',
        visible: !hasLabeler,
        title: _(msg`Reviews`),
        ref: recipesSectionRef,
      },
      {
        id: 'media',
        visible: !hasLabeler,
        title: _(msg`Media`),
        ref: mediaSectionRef,
      },
      {
        id: 'videos',
        visible: !hasLabeler,
        title: _(msg`Videos`),
        ref: videosSectionRef,
      },
      {id: 'likes', visible: isMe, title: _(msg`Likes`), ref: likesSectionRef},
      {
        id: 'feeds',
        visible: isMe || feedGenCount > 0,
        title: _(msg`Feeds`),
        ref: feedsSectionRef,
      },
      {
        id: 'starter_packs',
        visible: isMe || starterPackCount > 0,
        title: _(msg`Starter Packs`),
        ref: starterPacksSectionRef,
      },
      {
        id: 'lists',
        visible: hasSession && (isMe || listCount > 0),
        title: _(msg`Lists`),
        ref: listsSectionRef,
      },
    ] as const

    const visibleSections = allSections.filter(({visible}) => visible)
    const sectionById = new Map(
      visibleSections.map(section => [section.id, section]),
    )
    const sectionTitles = visibleSections.map(({title}) => title)

    return {visibleSections, sectionById, sectionTitles}
  }, [
    _,
    hasLabeler,
    hasSession,
    isMe,
    feedGenCount,
    starterPackCount,
    listCount,
  ])

  const scrollSectionToTop = useCallback(
    (index: number) => {
      visibleSections[index].ref?.current?.scrollToTop()
    },
    [visibleSections],
  )

  useFocusEffect(
    React.useCallback(() => {
      setMinimalShellMode(false)
      return listenSoftReset(() => {
        scrollSectionToTop(currentPage)
      })
    }, [setMinimalShellMode, currentPage, scrollSectionToTop]),
  )

  // events
  // =

  /* const onPressCompose = () => {
    const mention =
      profile.handle === currentAccount?.handle ||
      isInvalidHandle(profile.handle)
        ? undefined
        : profile.handle
    openComposer({
      type: 'post',
      mention
    })
  } */

  const onPageSelected = (i: number) => {
    setCurrentPage(i)
  }

  const onCurrentPageSelected = (index: number) => {
    scrollSectionToTop(index)
  }

  // rendering
  // =

  const renderHeader = ({
    setMinimumHeight,
  }: {
    setMinimumHeight: (height: number) => void
  }) => {
    return (
      <ExpoScrollForwarderView scrollViewTag={scrollViewTag}>
        <ProfileHeader
          profile={profile}
          labeler={labelerInfo}
          descriptionRT={hasDescription ? descriptionRT : null}
          moderationOpts={moderationOpts}
          hideBackButton={hideBackButton}
          isPlaceholderProfile={showPlaceholder}
          setMinimumHeight={setMinimumHeight}
        />
      </ExpoScrollForwarderView>
    )
  }

  return (
    <ScreenHider
      testID="profileView"
      style={styles.container}
      screenDescription={_(msg`profile`)}
      modui={moderation.ui('profileView')}>
      <PagerWithHeader
        testID="profilePager"
        isHeaderReady={!showPlaceholder}
        items={sectionTitles}
        onPageSelected={onPageSelected}
        onCurrentPageSelected={onCurrentPageSelected}
        renderHeader={renderHeader}
        allowHeaderOverScroll>
        {sectionById.has('filters')
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfileLabelsSection
                ref={labelsSectionRef}
                labelerInfo={labelerInfo}
                labelerError={labelerError}
                isLabelerLoading={isLabelerLoading}
                moderationOpts={moderationOpts}
                scrollElRef={scrollElRef as ListRef}
                headerHeight={headerHeight}
                isFocused={isFocused}
                setScrollViewTag={setScrollViewTag}
              />
            )
          : null}
        {sectionById.has('all')
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfileFeedSection
                ref={postsSectionRef}
                feed={`author|${profile.did}|all`}
                headerHeight={headerHeight}
                isFocused={isFocused}
                scrollElRef={scrollElRef as ListRef}
                ignoreFilterFor={profile.did}
                setScrollViewTag={setScrollViewTag}
              />
            )
          : null}
        {sectionById.has('posts')
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfileFeedSection
                ref={postsSectionRef}
                feed={`author|${profile.did}|posts_and_author_threads`}
                headerHeight={headerHeight}
                isFocused={isFocused}
                scrollElRef={scrollElRef as ListRef}
                ignoreFilterFor={profile.did}
                setScrollViewTag={setScrollViewTag}
              />
            )
          : null}
        {sectionById.has('replies')
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfileFeedSection
                ref={repliesSectionRef}
                feed={`author|${profile.did}|posts_with_replies`}
                headerHeight={headerHeight}
                isFocused={isFocused}
                scrollElRef={scrollElRef as ListRef}
                ignoreFilterFor={profile.did}
                setScrollViewTag={setScrollViewTag}
              />
            )
          : null}
        {sectionById.has('recipes')
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfileFeedSection
                ref={recipesSectionRef}
                feed={`author|${profile.did}|recipes`}
                headerHeight={headerHeight}
                isFocused={isFocused}
                scrollElRef={scrollElRef as ListRef}
                ignoreFilterFor={profile.did}
                setScrollViewTag={setScrollViewTag}
              />
            )
          : null}
        {sectionById.has('reviews')
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfileFeedSection
                ref={recipesSectionRef}
                feed={`author|${profile.did}|reviews`}
                headerHeight={headerHeight}
                isFocused={isFocused}
                scrollElRef={scrollElRef as ListRef}
                ignoreFilterFor={profile.did}
                setScrollViewTag={setScrollViewTag}
              />
            )
          : null}
        {sectionById.has('media')
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfileFeedSection
                ref={mediaSectionRef}
                feed={`author|${profile.did}|posts_with_media`}
                headerHeight={headerHeight}
                isFocused={isFocused}
                scrollElRef={scrollElRef as ListRef}
                ignoreFilterFor={profile.did}
                setScrollViewTag={setScrollViewTag}
              />
            )
          : null}
        {sectionById.has('videos')
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfileFeedSection
                ref={videosSectionRef}
                feed={`author|${profile.did}|posts_with_video`}
                headerHeight={headerHeight}
                isFocused={isFocused}
                scrollElRef={scrollElRef as ListRef}
                ignoreFilterFor={profile.did}
                setScrollViewTag={setScrollViewTag}
              />
            )
          : null}
        {sectionById.has('likes')
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfileFeedSection
                ref={likesSectionRef}
                feed={`likes|${profile.did}`}
                headerHeight={headerHeight}
                isFocused={isFocused}
                scrollElRef={scrollElRef as ListRef}
                ignoreFilterFor={profile.did}
                setScrollViewTag={setScrollViewTag}
              />
            )
          : null}
        {sectionById.has('feeds')
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfileFeedgens
                ref={feedsSectionRef}
                did={profile.did}
                scrollElRef={scrollElRef as ListRef}
                headerOffset={headerHeight}
                enabled={isFocused}
                setScrollViewTag={setScrollViewTag}
              />
            )
          : null}
        {sectionById.has('starter_packs')
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfileStarterPacks
                ref={starterPacksSectionRef}
                did={profile.did}
                isMe={isMe}
                scrollElRef={scrollElRef as ListRef}
                headerOffset={headerHeight}
                enabled={isFocused}
                setScrollViewTag={setScrollViewTag}
              />
            )
          : null}
        {sectionById.has('lists')
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfileLists
                ref={listsSectionRef}
                did={profile.did}
                scrollElRef={scrollElRef as ListRef}
                headerOffset={headerHeight}
                enabled={isFocused}
                setScrollViewTag={setScrollViewTag}
              />
            )
          : null}
      </PagerWithHeader>
      {hasSession && <ComposeFAB />}
    </ScreenHider>
  )
}

function useRichText(text: string): [RichTextAPI, boolean] {
  const agent = useAgent()
  const [prevText, setPrevText] = React.useState(text)
  const [rawRT, setRawRT] = React.useState(() => new RichTextAPI({text}))
  const [resolvedRT, setResolvedRT] = React.useState<RichTextAPI | null>(null)
  if (text !== prevText) {
    setPrevText(text)
    setRawRT(new RichTextAPI({text}))
    setResolvedRT(null)
    // This will queue an immediate re-render
  }
  React.useEffect(() => {
    let ignore = false
    async function resolveRTFacets() {
      // new each time
      const resolvedRT = new RichTextAPI({text})
      await resolvedRT.detectFacets(agent)
      if (!ignore) {
        setResolvedRT(resolvedRT)
      }
    }
    resolveRTFacets()
    return () => {
      ignore = true
    }
  }, [text, agent])
  const isResolving = resolvedRT === null
  return [resolvedRT ?? rawRT, isResolving]
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    height: '100%',
    // @ts-ignore Web-only.
    overflowAnchor: 'none', // Fixes jumps when switching tabs while scrolled down.
  },
  loading: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  emptyState: {
    paddingVertical: 40,
  },
  loadingMoreFooter: {
    paddingVertical: 20,
  },
  endItem: {
    paddingTop: 20,
    paddingBottom: 30,
    color: colors.gray5,
    textAlign: 'center',
  },
})
