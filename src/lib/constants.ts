import {type Insets, Platform} from 'react-native'
import Constants from 'expo-constants'
import {type AppBskyActorDefs, BSKY_LABELER_DID} from '@atproto/api'

import {
  beginResolveEnvConfig,
  DOMAIN_ENVCONFIGS,
  getStoredEnvConfig,
  getStoredEnvContent,
} from '#/state/env-config'
import {type ProxyHeaderValue} from '#/state/session/agent'
import {BAPP_CONFIG_DEV_URL, IS_DEV} from '#/env'

beginResolveEnvConfig()
export const envConfig = getStoredEnvConfig()
export const envContent = getStoredEnvContent()
export const LOCAL_DEV_SERVICE =
  Platform.OS === 'android' ? 'http://10.0.2.2:2583' : 'http://localhost:2583'
export const STAGING_SERVICE =
  DOMAIN_ENVCONFIGS.staging.BSKY_SERVICE ||
  DOMAIN_ENVCONFIGS.bluesky_staging.BSKY_SERVICE
export const BSKY_SERVICE = envConfig.BSKY_SERVICE
export const BSKY_SERVICE_DID = envConfig.BSKY_SERVICE_DID
export const PUBLIC_BSKY_SERVICE = envConfig.PUBLIC_BSKY_SERVICE
export const DEFAULT_SERVICE = BSKY_SERVICE
export const HELP_DESK_URL = envConfig.HELP_DESK_URL
export const EMBED_SERVICE = envConfig.SOCIAL_EMBED_SERVICE
const usingBlueskyEmbed = [
  DOMAIN_ENVCONFIGS.bluesky.SOCIAL_EMBED_SERVICE,
  DOMAIN_ENVCONFIGS.bluesky_staging.SOCIAL_EMBED_SERVICE,
].includes(EMBED_SERVICE)
export const EMBED_SCRIPT = usingBlueskyEmbed
  ? `${EMBED_SERVICE}/static/embed.js`
  : `${EMBED_SERVICE}/embed.js`
export const BSKY_DOWNLOAD_URL = `${envConfig.SOCIAL_APP_URL}/download`
export const STARTER_PACK_MAX_SIZE = 150
export const CARD_ASPECT_RATIO = 1200 / 630
export const CHAT_DISABLED = true
export const ONBOARDING_DISABLE_INTERESTS = true
export const ONBOARDING_DISABLE_SUGGESTED_ACCOUNTS = true
export const ONBOARDING_DISABLE_SUGGESTED_STARTERPACKS = true
export const ONBOARDING_DISABLE_VALUE_PROP = true
export const branding = (
  Constants?.expoConfig?.extra || {
    branding: {
      naming: {
        app_name: '',
      },
    },
  }
).branding

// HACK
// Yes, this is exactly what it looks like. It's a hard-coded constant
// reflecting the number of new users in the last week. We don't have
// time to add a route to the servers for this so we're just going to hard
// code and update this number with each release until we can get the
// server route done.
// -prf
export const JOINED_THIS_WEEK = 560000 // estimate as of 12/18/24

// Debug DIDs from env-content: debug.discover_debug_dids
export const DISCOVER_DEBUG_DIDS: Record<string, true> =
  envContent.debug?.discover_debug_dids?.reduce(
    (acc, did) => {
      acc[did] = true
      return acc
    },
    {} as Record<string, true>,
  ) || {}

const BASE_FEEDBACK_FORM_URL = `${HELP_DESK_URL}/requests/new`
export const FEEDBACK_POST_URL = process.env.FEEDBACK_POST_URL
export const FEEDBACK_POST_TOKEN = process.env.FEEDBACK_POST_TOKEN
export function FEEDBACK_FORM_URL({
  email,
  handle,
}: {
  email?: string
  handle?: string
}): string {
  let str = BASE_FEEDBACK_FORM_URL
  if (email) {
    str += `?tf_anonymous_requester_email=${encodeURIComponent(email)}`
    if (handle) {
      str += `&tf_17205412673421=${encodeURIComponent(handle)}`
    }
  }
  return str
}

export const MAX_DISPLAY_NAME = 64
export const MAX_DESCRIPTION = 256

export const MAX_GRAPHEME_LENGTH = 300

export const MAX_DM_GRAPHEME_LENGTH = 1000

export const MAX_RECIPE_TITLE_GRAPHEME_LENGTH = 500
export const MAX_RECIPE_DESCRIPTION_GRAPHEME_LENGTH = 5000

// Recommended is 100 per: https://www.w3.org/WAI/GL/WCAG20/tests/test3.html
// but increasing limit per user feedback
export const MAX_ALT_TEXT = 2000

export const MAX_REPORT_REASON_GRAPHEME_LENGTH = 2000

export function IS_TEST_USER(handle?: string) {
  return handle && handle?.endsWith('.test')
}

export function IS_PROD_SERVICE(url?: string) {
  return url && url !== STAGING_SERVICE && !url.startsWith(LOCAL_DEV_SERVICE)
}

// Default feeds from env-content: feeds.named filtered by default: true
export const DEFAULT_FEED_GENERATOR = (rkey: string) => {
  const defaultFeeds = Object.values(envContent.feeds?.named || {}).filter(
    feed => feed?.default,
  )
  const feed = defaultFeeds.find(f => f?.uri?.includes(rkey))
  return (
    feed?.uri ||
    `at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/${rkey}`
  )
}

// Legacy feed generators - these are replaced by env-content
export const PROD_DEFAULT_FEED = (rkey: string) => DEFAULT_FEED_GENERATOR(rkey)
export const STAGING_DEFAULT_FEED = (rkey: string) =>
  DEFAULT_FEED_GENERATOR(rkey)

// Legacy constants for backward compatibility - these should be removed over time
export const PROD_FEEDS = Object.values(envContent.feeds?.named || {})
  .filter(feed => feed?.default && feed?.feedback)
  .map(feed => `feedgen|${feed.uri}`)

export const STAGING_FEEDS = PROD_FEEDS // Same as production now since we use the same structure

// Feeds that support feedback from env-content: feeds.named filtered by feedback: true
export const FEEDBACK_FEEDS = Object.values(envContent.feeds?.named || {})
  .filter(feed => feed?.feedback)
  .map(feed => `feedgen|${feed.uri}`)

export const POST_IMG_MAX = {
  width: 2000,
  height: 2000,
  size: 1000000,
}

export const STAGING_LINK_META_PROXY =
  DOMAIN_ENVCONFIGS.staging.PREVIEW_LINK_META_PROXY

export const PROD_LINK_META_PROXY =
  DOMAIN_ENVCONFIGS.production.PREVIEW_LINK_META_PROXY

export function LINK_META_PROXY(serviceUrl: string) {
  if (envConfig.PREVIEW_LINK_META_PROXY) {
    return envConfig.PREVIEW_LINK_META_PROXY
  } else if (IS_PROD_SERVICE(serviceUrl)) {
    return PROD_LINK_META_PROXY
  }

  return STAGING_LINK_META_PROXY
}

export const STATUS_PAGE_URL = envConfig.STATUS_PAGE_URL

// Hitslop constants
export const createHitslop = (size: number): Insets => ({
  top: size,
  left: size,
  bottom: size,
  right: size,
})
export const HITSLOP_10 = createHitslop(10)
export const HITSLOP_20 = createHitslop(20)
export const HITSLOP_30 = createHitslop(30)
export const LANG_DROPDOWN_HITSLOP = {top: 10, bottom: 10, left: 4, right: 4}
export const BACK_HITSLOP = HITSLOP_30
export const MAX_POST_LINES = 25

// Constants loaded from env-content - these replace hardcoded values
// These are resolved once from stored env-content and updated when env-content changes

// Auto-follow accounts from env-content: onboarding.auto_follow_accounts
export const AUTO_FOLLOW_ACCOUNT_DIDS =
  envContent.onboarding?.auto_follow_accounts || []

// Legacy constant for backwards compatibility - use first account from auto_follow_accounts
export const BSKY_APP_ACCOUNT_DID =
  (envContent.onboarding?.auto_follow_accounts?.length || 0) > 0
    ? envContent.onboarding?.auto_follow_accounts?.[0]
    : 'did:plc:z72i7hdynmk6r22z27h6tvur'

// Feed owner DIDs from env-content: feeds.log_for_owner_dids
export const BSKY_FEED_OWNER_DIDS = envContent.feeds?.log_for_owner_dids || []

// Extra header DIDs from env-content: feeds.extra_headers_for_owner_dids
export const FEED_EXTRA_HEADER_DIDS =
  envContent.feeds?.extra_headers_for_owner_dids || []

// Feed URIs from env-content: feeds.named
export const DISCOVER_FEED_URI =
  envContent.feeds?.named?.discover?.uri ||
  'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot'

export const VIDEO_FEED_URI =
  envContent.feeds?.named?.video?.uri ||
  'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/thevids'

// Video feed URIs from env-content: feeds.named filtered by video: true
export const VIDEO_FEED_URIS = Object.values(envContent.feeds?.named || {})
  .filter(feed => feed?.video)
  .map(feed => feed.uri)

// Recommended feeds from env-content: feeds.named filtered by pinned: true
export const DISCOVER_SAVED_FEED = envContent.feeds?.named?.discover
  ? {
      type: envContent.feeds.named.discover.type,
      value: envContent.feeds.named.discover.uri,
      pinned: envContent.feeds.named.discover.pinned,
    }
  : {
      type: 'feed',
      value: DISCOVER_FEED_URI,
      pinned: true,
    }

export const TIMELINE_SAVED_FEED = envContent.feeds?.named?.timeline
  ? {
      type: envContent.feeds.named.timeline.type,
      value: envContent.feeds.named.timeline.uri,
      pinned: envContent.feeds.named.timeline.pinned,
    }
  : {
      type: 'timeline',
      value: 'following',
      pinned: true,
    }

export const VIDEO_SAVED_FEED = envContent.feeds?.named?.video
  ? {
      type: envContent.feeds.named.video.type,
      value: envContent.feeds.named.video.uri,
      pinned: envContent.feeds.named.video.pinned,
    }
  : {
      type: 'feed',
      value: VIDEO_FEED_URI,
      pinned: true,
    }

export const RECOMMENDED_SAVED_FEEDS: Pick<
  AppBskyActorDefs.SavedFeed,
  'type' | 'value' | 'pinned'
>[] = Object.values(envContent.feeds?.named || {})
  .filter(feed => feed?.pinned)
  .map(feed => ({
    type: feed.type,
    value: feed.uri,
    pinned: feed.pinned,
  }))

// Known shutdown feeds from env-content: feeds.known_shutdown_feeds
export const KNOWN_SHUTDOWN_FEEDS = envContent.feeds?.known_shutdown_feeds || []

// Legacy constants that are still needed for some functions
export const STAGING_VIDEO_FEED_URI =
  'at://did:plc:yofh3kx63drvfljkibw5zuxo/app.bsky.feed.generator/thevids'

// Feed proxy DID from env-content: feeds.feedback_proxy_did
export const FEED_PROXY_DID =
  envContent.feeds?.feedback_proxy_did || 'did:web:discover.bsky.app'

// Authenticated-only feeds from env-content: feeds.authed_only
export const KNOWN_AUTHED_ONLY_FEEDS = envContent.feeds?.authed_only || []

// Feed fallback from env-content: feeds.fallback_to
export const FEED_FALLBACK_NAME = envContent.feeds?.fallback_to || 'discover'
export const FEED_FALLBACK_FEED = envContent.feeds?.named?.[FEED_FALLBACK_NAME]
export const FEED_FALLBACK_FEEDNAME =
  FEED_FALLBACK_FEED?.uri?.split('/').pop() || 'whats-hot'

// Links from env-content: links
export const LINKS = {
  about: envContent.links?.about,
  blog: envContent.links?.blog,
  jobs: envContent.links?.jobs,
}

// Sample content from env-content: sample_content
export const SAMPLE_PROFILE_NAME =
  envContent.sample_content?.profile?.name || 'bsky.app'
export const DEFAULT_AVATAR =
  envContent.sample_content?.images?.default_avatar ||
  'https://bsky.social/about/images/favicon-32x32.png'
export const DEFAULT_BANNER =
  envContent.sample_content?.images?.default_banner ||
  'https://bsky.social/about/images/social-card-default-gradient.png'

export const GIF_SERVICE = `https://${envConfig.GIF_HOST}`

export const GIF_SEARCH = (params: string) =>
  `${GIF_SERVICE}/tenor/v2/search?${params}`
export const GIF_FEATURED = (params: string) =>
  `${GIF_SERVICE}/tenor/v2/featured?${params}`

export const MAX_LABELERS = 20

export const VIDEO_SERVICE = envConfig.VIDEO_SERVICE
export const VIDEO_SERVICE_DID = envConfig.VIDEO_SERVICE_DID

export const VIDEO_MAX_DURATION_MS = 3 * 60 * 1000 // 3 minutes in milliseconds
/**
 * Maximum size of a video in megabytes, _not_ mebibytes. Backend uses
 * ISO megabytes.
 */
export const VIDEO_MAX_SIZE = 1000 * 1000 * 100 // 100mb

export const SUPPORTED_MIME_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/webm',
  'video/quicktime',
  'image/gif',
] as const

export type SupportedMimeTypes = (typeof SUPPORTED_MIME_TYPES)[number]

export const EMOJI_REACTION_LIMIT = 5

export const urls = {
  website: {
    blog: {
      // no need to change this
      initialVerificationAnnouncement: `https://bsky.social/about/blog/04-21-2025-verification`,
    },
  },
}

// ironically named, as this points to the non-public api host
export const PUBLIC_APPVIEW = envConfig.APPVIEW_URL
// This should then be loaded with env-config, and not configured separately for production and staging
export const PUBLIC_APPVIEW_DID = envConfig.APPVIEW_DID
export const PUBLIC_STAGING_APPVIEW_DID = DOMAIN_ENVCONFIGS.staging.APPVIEW_DID

export const DEV_ENV_APPVIEW = `http://localhost:2584` // always the same

// temp hack for e2e - esb
export const BLUESKY_PROXY_HEADER = {
  value: `${envConfig.BSKY_PROXY_DID || envConfig.BSKY_SERVICE_DID}#bsky_appview`,
  get() {
    return this.value as ProxyHeaderValue
  },
  set(value: string) {
    this.value = value
  },
}

export const DM_SERVICE_HEADERS = {
  'atproto-proxy': `${envConfig.DM_PROXY_DID || envConfig.DM_SERVICE_DID}#bsky_chat`,
}

export const BLUESKY_MOD_SERVICE_HEADERS = {
  'atproto-proxy': `${BSKY_LABELER_DID}#atproto_labeler`,
}

// const IPCC_URL is the old style and not used by default any more
const BAPP_CONFIG_URL_PROD = `https://ip.bsky.app/config`
const BAPP_CONFIG_URL = IS_DEV
  ? (BAPP_CONFIG_DEV_URL ?? BAPP_CONFIG_URL_PROD)
  : BAPP_CONFIG_URL_PROD
export const GEOLOCATION_CONFIG_URL =
  envConfig.GEOLOCATION_CONFIG_URL || BAPP_CONFIG_URL

const POLICY_BASE_URL = envConfig.POLICY_BASE_URL
export const webLinks = {
  main: POLICY_BASE_URL, // main support page
  tos: `${POLICY_BASE_URL}/tos`,
  privacy: `${POLICY_BASE_URL}/privacy-policy`,
  community: `${POLICY_BASE_URL}/community-guidelines`,
  communityDeprecated: `${POLICY_BASE_URL}/community-guidelines-deprecated`,
  copyright: `${POLICY_BASE_URL}/copyright`,
}
