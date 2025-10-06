import {useEffect, useState} from 'react'
import {View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useNavigation} from '@react-navigation/core'

import {HELP_DESK_URL, webLinks} from '#/lib/constants'
import {useModalControls} from '#/state/modals'
import {useKawaiiMode} from '#/state/preferences/kawaii'
import {useInviteCodesQuery} from '#/state/queries/invites'
import {useSession} from '#/state/session'
import {DesktopFeeds} from '#/view/shell/desktop/Feeds'
import {DesktopSearch} from '#/view/shell/desktop/Search'
import {SidebarTrendingTopics} from '#/view/shell/desktop/SidebarTrendingTopics'
import {
  atoms as a,
  useGutters,
  useLayoutBreakpoints,
  useTheme,
  web,
} from '#/alf'
import {AppLanguageDropdown} from '#/components/AppLanguageDropdown'
import {Divider} from '#/components/Divider'
import {EnvConfigIndicator} from '#/components/EnvConfigIndicator'
import {Ticket_Stroke2_Corner0_Rounded as TicketIcon} from '#/components/icons/Ticket'
import {CENTER_COLUMN_OFFSET} from '#/components/Layout'
import {InlineLinkText} from '#/components/Link'
import {ProgressGuideList} from '#/components/ProgressGuide/List'
import {Text} from '#/components/Typography'

function useWebQueryParams() {
  const navigation = useNavigation()
  const [params, setParams] = useState<Record<string, string>>({})

  useEffect(() => {
    return navigation.addListener('state', e => {
      try {
        const {state} = e.data
        const lastRoute = state.routes[state.routes.length - 1]
        setParams(lastRoute.params)
      } catch (err) {}
    })
  }, [navigation, setParams])

  return params
}

export function DesktopRightNav({routeName}: {routeName: string}) {
  const t = useTheme()
  const {_} = useLingui()
  const {hasSession} = useSession()
  const {openModal} = useModalControls()
  const kawaii = useKawaiiMode()
  const gutters = useGutters(['base', 0, 'base', 'wide'])
  const isSearchScreen = routeName === 'Search'
  const webqueryParams = useWebQueryParams()
  const searchQuery = webqueryParams?.q
  const showTrending = !isSearchScreen || (isSearchScreen && !!searchQuery)
  const {rightNavVisible, centerColumnOffset, leftNavMinimal} =
    useLayoutBreakpoints()

  if (!rightNavVisible) {
    return null
  }

  const width = centerColumnOffset ? 250 : 300

  const onPressFeedback = () => {
    openModal({name: 'user-feedback'})
  }
  return (
    <View
      style={[
        gutters,
        a.gap_lg,
        web({
          position: 'fixed',
          left: '50%',
          transform: [
            {
              translateX: 300 + (centerColumnOffset ? CENTER_COLUMN_OFFSET : 0),
            },
            ...a.scrollbar_offset.transform,
          ],
          width: width + gutters.paddingLeft,
          maxHeight: '100%',
          overflowY: 'auto',
        }),
      ]}>
      {!isSearchScreen && <DesktopSearch />}

      {hasSession && (
        <>
          <ProgressGuideList />
          <DesktopFeeds />
          <Divider />
        </>
      )}

      {showTrending && <SidebarTrendingTopics />}

      <Text style={[a.leading_snug, t.atoms.text_contrast_low]}>
        {hasSession && (
          <>
            <TouchableOpacity
              onPress={onPressFeedback}
              accessibilityRole="button"
              accessibilityLabel={_(msg`Feedback`)}
              accessibilityHint={_(msg`Opens Feedback Form`)}>
              <Text
                style={[
                  t.atoms.text_contrast_high,
                  {color: t.palette.primary_500},
                ]}>
                {_(msg`Feedback`)}
              </Text>
            </TouchableOpacity>
            <Text style={t.atoms.text_contrast_low}>{' • '}</Text>
          </>
        )}
        <InlineLinkText to={webLinks.privacy} label={_(msg`Privacy`)}>
          {_(msg`Privacy`)}
        </InlineLinkText>
        {' • '}
        <InlineLinkText to={webLinks.tos} label={_(msg`Terms`)}>
          {_(msg`Terms`)}
        </InlineLinkText>
        {' • '}
        <InlineLinkText label={_(msg`Help`)} to={HELP_DESK_URL}>
          {_(msg`Help`)}
        </InlineLinkText>
      </Text>

      {hasSession && <InviteCodes />}

      {kawaii && (
        <Text style={[t.atoms.text_contrast_medium, {marginTop: 12}]}>
          <Trans>
            Logo by{' '}
            <InlineLinkText
              label={_(msg`Logo by @sawaratsuki.bsky.social`)}
              to="/profile/sawaratsuki.bsky.social">
              @sawaratsuki.bsky.social
            </InlineLinkText>
          </Trans>
        </Text>
      )}

      {!hasSession && leftNavMinimal && (
        <View style={[a.w_full, {height: 64}]}>
          <AppLanguageDropdown />
          <EnvConfigIndicator />
        </View>
      )}
    </View>
  )
}

function InviteCodes() {
  const t = useTheme()
  const {data: invites} = useInviteCodesQuery()
  const invitesAvailable = invites?.available?.length ?? 0
  const {openModal} = useModalControls()
  const {_} = useLingui()

  const onPress = () => {
    openModal({name: 'invite-codes'})
  }

  return (
    <TouchableOpacity
      testID="menuItemInviteCodes"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={_(msg`Invite codes: ${invitesAvailable} available`)}
      accessibilityHint={_(msg`Opens list of invite codes`)}
      disabled={invites?.disabled}>
      <View style={[a.align_start, a.gap_xl]}>
        <View
          style={[
            a.pl_sm,
            a.pr_md,
            a.py_sm,
            a.rounded_full,
            a.flex_row,
            a.align_center,
            a.gap_xs,
            {
              backgroundColor: t.palette.primary_25,
            },
          ]}>
          <TicketIcon
            style={[
              invitesAvailable > 0
                ? t.atoms.text
                : t.atoms.text_contrast_medium,
            ]}
            size="md"
          />
          <Text
            style={[
              a.text_md,
              invitesAvailable > 0
                ? t.atoms.text
                : t.atoms.text_contrast_medium,
            ]}>
            {invites?.disabled ? (
              <Trans>
                Your invite codes are hidden when logged in using an App
                Password
              </Trans>
            ) : invitesAvailable === 1 ? (
              <Trans>{invitesAvailable} invite code available</Trans>
            ) : (
              <Trans>{invitesAvailable} invite codes available</Trans>
            )}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}
