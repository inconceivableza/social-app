import React from 'react'
import {StyleSheet} from 'react-native'
import {WebView, WebViewNavigation} from 'react-native-webview'
import {ShouldStartLoadRequest} from 'react-native-webview/lib/WebViewTypes'

import {envConfig} from '#/lib/constants'
import {SignupState} from '#/screens/Signup/state'
import {DOMAIN_ENVCONFIGS} from '#/state/env-config'

const ALLOWED_HOSTS = [
  // allow production or staging or the current configured hosts
  DOMAIN_ENVCONFIGS.production.BSKY_SERVICE.replace(/^https?:\/\//, ''),
  DOMAIN_ENVCONFIGS.production.SOCIAL_APP_HOST,
  DOMAIN_ENVCONFIGS.staging.BSKY_SERVICE.replace(/^https?:\/\//, ''),
  DOMAIN_ENVCONFIGS.staging.SOCIAL_APP_HOST,
  envConfig.BSKY_SERVICE.replace(/^https?:\/\//, ''),
  envConfig.SOCIAL_APP_HOST,
  'js.hcaptcha.com',
  'newassets.hcaptcha.com',
  'api2.hcaptcha.com',
]

export function CaptchaWebView({
  url,
  stateParam,
  state,
  onSuccess,
  onError,
}: {
  url: string
  stateParam: string
  state?: SignupState
  onSuccess: (code: string) => void
  onError: (error: unknown) => void
}) {
  const redirectHost = React.useMemo(() => {
    if (!state?.serviceUrl) return envConfig.SOCIAL_APP_HOST

    return state?.serviceUrl &&
      new URL(state?.serviceUrl).host === DOMAIN_ENVCONFIGS.staging.BSKY_SERVICE
      ? DOMAIN_ENVCONFIGS.staging.SOCIAL_APP_HOST
      : envConfig.SOCIAL_APP_HOST
  }, [state?.serviceUrl])

  const wasSuccessful = React.useRef(false)

  const onShouldStartLoadWithRequest = React.useCallback(
    (event: ShouldStartLoadRequest) => {
      const urlp = new URL(event.url)
      return ALLOWED_HOSTS.includes(urlp.host)
    },
    [],
  )

  const onNavigationStateChange = React.useCallback(
    (e: WebViewNavigation) => {
      if (wasSuccessful.current) return

      const urlp = new URL(e.url)
      if (urlp.host !== redirectHost) return

      const code = urlp.searchParams.get('code')
      if (urlp.searchParams.get('state') !== stateParam || !code) {
        onError({error: 'Invalid state or code'})
        return
      }

      wasSuccessful.current = true
      onSuccess(code)
    },
    [redirectHost, stateParam, onSuccess, onError],
  )

  return (
    <WebView
      source={{uri: url}}
      javaScriptEnabled
      style={styles.webview}
      onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
      onNavigationStateChange={onNavigationStateChange}
      scrollEnabled={false}
      onError={e => {
        onError(e.nativeEvent)
      }}
      onHttpError={e => {
        onError(e.nativeEvent)
      }}
    />
  )
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 10,
  },
})
