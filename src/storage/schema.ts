/**
 * Device data that's specific to the device and does not vary based account
 */
export type Device = {
  fontScale: '-2' | '-1' | '0' | '1' | '2'
  fontFamily: 'system' | 'theme'
  lastNuxDialog: string | undefined
  geolocation?: {
    countryCode: string | undefined
    isAgeRestrictedGeo: boolean | undefined
  }
  trendingBetaEnabled: boolean
  devMode: boolean
  demoMode: boolean
  activitySubscriptionsNudged?: boolean
}

export type Account = {
  searchTermHistory?: string[]
  searchAccountHistory?: string[]
}

export type EnvConfig = {
  APPVIEW_URL: string
  BSKY_SERVICE: string
  DM_SERVICE_DID: string
  GIF_HOST: string
  HELP_DESK_URL: string
  LINK_HOST: string
  OGCARD_URL: string
  POLICY_BASE_URL: string
  PREVIEW_LINK_META_PROXY: string
  PUBLIC_BSKY_SERVICE: string
  SOCIAL_APP_HOST: string // this is used as a reference
  SOCIAL_APP_URL: string
  SOCIAL_EMBED_SERVICE: string
  STATSIG_CLIENT_KEY: string
  STATSIG_API_URL: string
  STATUS_PAGE_URL: string
  VIDEO_SERVICE: string
  VIDEO_SERVICE_DID: string
}

export type EnvContent = {
  onboarding: {
    auto_follow_accounts: string[]
  }
  feeds: {
    named: {
      [key: string]: {
        title: string
        uri: string
        type: string
        pinned: boolean
        default?: boolean
        video?: boolean
        feedback?: boolean
      }
    }
    log_for_owner_dids: string[]
    extra_headers_for_owner_dids: string[]
    known_shutdown_feeds: string[]
    feedback_proxy_did: string
    authed_only: string[]
    fallback_to: string
  }
  links: {
    about?: string
    blog?: string
    jobs?: string
  }
  sample_content: {
    profile: {
      name: string
    }
    images: {
      default_avatar: string
      default_banner: string
    }
  }
  embed: {
    default_post: {
      profile_name: string
      did: string
      post_id: string
    }
  }
  debug: {
    discover_debug_dids: string[]
  }
}
