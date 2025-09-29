import {View} from 'react-native'

import {envConfig, SAMPLE_PROFILE_NAME} from '#/lib/constants'
import {atoms as a, useTheme} from '#/alf'
import {ButtonText} from '#/components/Button'
import {InlineLinkText, Link} from '#/components/Link'
import {H1, Text} from '#/components/Typography'

export function Links() {
  const t = useTheme()
  return (
    <View style={[a.gap_md, a.align_start]}>
      <H1>Links</H1>

      <View style={[a.gap_md, a.align_start]}>
        <InlineLinkText label="foo" to="https://google.com" style={[a.text_lg]}>
          https://google.com
        </InlineLinkText>
        <InlineLinkText label="foo" to="https://google.com" style={[a.text_lg]}>
          External with custom children (google.com)
        </InlineLinkText>
        <InlineLinkText
          label="foo"
          to={envConfig.BSKY_SERVICE}
          style={[a.text_md, t.atoms.text_contrast_low]}>
          Internal ({envConfig.BSKY_SERVICE.replace(/^https?:\/\//, '')})
        </InlineLinkText>
        <InlineLinkText
          label="foo"
          to={`${envConfig.SOCIAL_APP_URL}/profile/${SAMPLE_PROFILE_NAME || 'bsky.app'}`}
          style={[a.text_md]}>
          Internal ({envConfig.SOCIAL_APP_HOST})
        </InlineLinkText>

        <Link
          variant="solid"
          color="primary"
          size="large"
          label={`View @${SAMPLE_PROFILE_NAME || 'bsky.app'}'s profile`}
          to={`${envConfig.SOCIAL_APP_HOST}/profile/${SAMPLE_PROFILE_NAME || 'bsky.app'}`}>
          <ButtonText>Link as a button</ButtonText>
        </Link>

        <Link
          label={`View @${SAMPLE_PROFILE_NAME || 'bsky.app'}'s profile`}
          to={`${envConfig.SOCIAL_APP_HOST}/profile/${SAMPLE_PROFILE_NAME || 'bsky.app'}`}>
          <View
            style={[
              a.flex_row,
              a.align_center,
              a.gap_md,
              a.rounded_md,
              a.p_md,
              t.atoms.bg_contrast_25,
            ]}>
            <View
              style={[
                {width: 32, height: 32},
                a.rounded_full,
                t.atoms.bg_contrast_200,
              ]}
            />
            <Text>View @{SAMPLE_PROFILE_NAME || 'bsky.app'}'s profile</Text>
          </View>
        </Link>
      </View>
    </View>
  )
}
