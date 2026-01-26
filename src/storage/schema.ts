import {type PreparationState} from '#/view/com/recipe-preparation/types'
import {type ID as PolicyUpdate202508} from '#/components/PolicyUpdateOverlay/updates/202508/config'

/**
 * Device data that's specific to the device and does not vary based account
 */
export type Device = {
  fontScale: '-2' | '-1' | '0' | '1' | '2'
  fontFamily: 'system' | 'theme'
  lastNuxDialog: string | undefined

  /**
   * Geolocation config, fetched from the IP service. This previously did
   * double duty as the "status" for geolocation state, but that has since
   * moved here to the client.
   */
  geolocation?: {
    countryCode: string | undefined
    regionCode: string | undefined
    ageRestrictedGeos: {
      countryCode: string
      regionCode: string | undefined
    }[]
    ageBlockedGeos: {
      countryCode: string
      regionCode: string | undefined
    }[]
  }
  /**
   * The GPS-based geolocation, if the user has granted permission.
   */
  deviceGeolocation?: {
    countryCode: string | undefined
    regionCode: string | undefined
  }

  trendingBetaEnabled: boolean
  devMode: boolean
  demoMode: boolean
  activitySubscriptionsNudged?: boolean

  /**
   * Policy update overlays. New IDs are required for each new announcement.
   */
  policyUpdateDebugOverride?: boolean
  [PolicyUpdate202508]?: boolean
}

export type Account = {
  searchTermHistory?: string[]
  searchAccountHistory?: string[]
  recipePreparations: Record<string, PreparationState>
}

export type EnvConfig = {
  APPVIEW_DID: string
  APPVIEW_URL: string
  BSKY_PROXY_DID: string
  BSKY_SERVICE: string
  BSKY_SERVICE_DID: string
  DM_PROXY_DID: string
  DM_SERVICE_DID: string
  GEOLOCATION_CONFIG_URL: string
  GIF_HOST: string
  LINK_HOST: string
  MOD_SERVICE_DID: string
  OGCARD_URL: string
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

// NB any changes here must be added to env-config/EMPTY_CONTENT as well
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
        profile_name?: string
        default?: boolean
        video?: boolean
        feedback?: boolean
      }
    }
    log_for_owner_dids: string[]
    extra_headers_for_owner_dids: string[]
    known_shutdown_feeds: string[]
    authed_only: string[]
    fallback_to?: string
  }
  links: {
    about?: string
    blog?: string
    helpDesk?: string
    jobs?: string
    policyBase?: string
  }
  feedback?: {
    postUrl?: string
    postToken?: string
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
      record_type?: string
      post_id: string
    }
  }
  debug: {
    discover_debug_dids: string[]
  }
}
