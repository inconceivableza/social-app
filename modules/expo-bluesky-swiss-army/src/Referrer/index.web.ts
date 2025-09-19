import {Platform} from 'react-native'
import Constants from 'expo-constants'

import {NotImplementedError} from '../NotImplemented'
import {type GooglePlayReferrerInfo, type ReferrerInfo} from './types'

export function getGooglePlayReferrerInfoAsync(): Promise<GooglePlayReferrerInfo> {
  throw new NotImplementedError()
}

let SOCIAL_APP_HOST: string | undefined

function getSocialAppHost(): string {
  if (SOCIAL_APP_HOST === undefined) {
    const envConfigMap = Constants.expoConfig?.extra?.['env-config']
    const currentEnv = process.env.EXPO_PUBLIC_ENV || 'production'
    const envConfig = envConfigMap?.[currentEnv] || {}
    SOCIAL_APP_HOST =
      (envConfig.EXPO_PUBLIC_SOCIAL_APP_HOST as string) || 'bsky.app'
  }
  return SOCIAL_APP_HOST
}

export function getReferrerInfo(): ReferrerInfo | null {
  if (
    Platform.OS === 'web' &&
    // for ssr
    typeof document !== 'undefined' &&
    document != null &&
    document.referrer
  ) {
    try {
      const url = new URL(document.referrer)
      const socialAppHost = getSocialAppHost()
      if (url.hostname !== socialAppHost) {
        return {
          referrer: url.href,
          hostname: url.hostname,
        }
      }
    } catch {
      // If something happens to the URL parsing, we don't want to actually cause any problems for the user. Just
      // log the error so we might catch it
      console.error('Failed to parse referrer URL')
    }
  }
  return null
}
