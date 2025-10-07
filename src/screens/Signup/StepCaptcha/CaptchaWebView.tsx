import {useEffect, useMemo, useRef} from 'react'
import {WebView, type WebViewNavigation} from 'react-native-webview'
import {type ShouldStartLoadRequest} from 'react-native-webview/lib/WebViewTypes'

import {envConfig} from '#/lib/constants'
import {type SignupState} from '#/screens/Signup/state'
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

const MIN_DELAY = 3_500

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
  const startedAt = useRef(Date.now())
  const successTo = useRef<NodeJS.Timeout>()

  useEffect(() => {
    return () => {
      if (successTo.current) {
        clearTimeout(successTo.current)
      }
    }
  }, [])

  const redirectHost = useMemo(() => {
    if (!state?.serviceUrl) return envConfig.SOCIAL_APP_HOST

    return state?.serviceUrl &&
      new URL(state?.serviceUrl).host === DOMAIN_ENVCONFIGS.staging.BSKY_SERVICE
      ? DOMAIN_ENVCONFIGS.staging.SOCIAL_APP_HOST
      : envConfig.SOCIAL_APP_HOST
  }, [state?.serviceUrl])

  const wasSuccessful = useRef(false)

  const onShouldStartLoadWithRequest = (event: ShouldStartLoadRequest) => {
    const urlp = new URL(event.url)
    return ALLOWED_HOSTS.includes(urlp.host)
  }

  const onNavigationStateChange = (e: WebViewNavigation) => {
    if (wasSuccessful.current) return

    const urlp = new URL(e.url)
    if (urlp.host !== redirectHost || urlp.pathname === '/gate/signup') return

    const code = urlp.searchParams.get('code')
    if (urlp.searchParams.get('state') !== stateParam || !code) {
      onError({error: 'Invalid state or code'})
      return
    }

    // We want to delay the completion of this screen ever so slightly so that it doesn't appear to be a glitch if it completes too fast
    wasSuccessful.current = true
    const now = Date.now()
    const timeTaken = now - startedAt.current
    if (timeTaken < MIN_DELAY) {
      successTo.current = setTimeout(() => {
        onSuccess(code)
      }, MIN_DELAY - timeTaken)
    } else {
      onSuccess(code)
    }
  }

  return (
    <WebView
      source={{uri: url}}
      javaScriptEnabled
      style={{
        flex: 1,
        backgroundColor: 'transparent',
        borderRadius: 10,
      }}
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
