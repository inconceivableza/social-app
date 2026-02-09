/*

Allows configuration of domains, branding and server-specific contents within the atproto ecosystem

* Configuration of branding is read from branding.json, read by the social-app at build time.
  - This includes app names, some text content (verbage) and code ids for the package etc
  - Changes to styles and images (logos etc) are not read from configuration but committed

* Configuration of what server domains are being used is done in .env* files following the dotenv profiles specification
  - This approach supports different environments for production, testing (staging), and development.
  - Mobile builds must target one of these environments
  - Mobile builds and the web server bundle all configured profile's environments

* Configuration of custom content within the app is in conf/env-content*.json files
  - Configured profiles have separate env-content.${profile}.json files

* Except for production builds, this supports switching between environments
  - Configured profiles can be directly selected in the mobile and web UI
  - The app can also connect to a custom social-app server and retrieve its environment
  - The bsky "App View" app serves env-content to the social-app when a custom server is selected

* This should all use the Bluesky defaults when no other config is present
  - In general, defaults elsewhere in the code have been moved here and just reference this config

**Constant Resolution**

* expo follows the dotenv order of precedence, and so does the go server:
  - .env.{development|test|production}.local
  - .env.local
  - .env.{development|test|production}
  - .env
  - the actual system environment variables, which at runtime will be:
      - defined by docker-compose.yaml when running in a docker container
      - whatever is in the environment when running from source on the host

*/

import React from 'react'
import Constants from 'expo-constants'
import EventEmitter from 'eventemitter3'
import z from 'zod'

// import {logger} from '#/logger'
const logger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
}
import {
  device,
  env_config as envConfigStorage,
  env_content as envContentStorage,
  type EnvConfig,
  type EnvContent,
} from '#/storage'

export type {EnvConfig, EnvContent}

/**
 * Default envconfig value.
 * If not overriden with dynamic config, will point to built environment, for production configuration
 * In builds, this will resolve directly to the environment variables set, or fall back to the Bluesky ones
 * When running from node in dev mode, this will resolve using the EXPO_PUBLIC_ variables at runtime
 */

const EMPTY_CONFIG: EnvConfig = {
  APPVIEW_DID: '',
  APPVIEW_URL: '',
  BSKY_PROXY_DID: '',
  BSKY_SERVICE: '',
  BSKY_SERVICE_DID: '',
  DM_PROXY_DID: '',
  DM_SERVICE_DID: '',
  GEOLOCATION_CONFIG_URL: '',
  GIF_HOST: '',
  LINK_HOST: '',
  MOD_SERVICE_DID: '',
  OGCARD_URL: '',
  PREVIEW_LINK_META_PROXY: '',
  PUBLIC_BSKY_SERVICE: '',
  SOCIAL_APP_HOST: '',
  SOCIAL_APP_URL: '',
  SOCIAL_EMBED_SERVICE: '',
  STATSIG_CLIENT_KEY: '',
  STATSIG_API_URL: '',
  STATUS_PAGE_URL: '',
  VIDEO_SERVICE: '',
  VIDEO_SERVICE_DID: '',
}

// map from the EnvConfig key name to the (non-EXPO_PUBLIC_-prefaced) environment name passed into social-app
// these environment names are also what bskyweb serves on the /env-config url
const InternalToEnvName: EnvConfig & Record<string, string> = {
  APPVIEW_DID: 'ATP_APPVIEW_DID',
  APPVIEW_URL: 'ATP_APPVIEW_URL',
  BSKY_PROXY_DID: 'BLUESKY_PROXY_DID',
  BSKY_SERVICE: 'ATP_PDS_URL',
  BSKY_SERVICE_DID: 'ATP_PDS_DID',
  DM_PROXY_DID: 'CHAT_PROXY_DID',
  DM_SERVICE_DID: 'DM_SERVICE_DID',
  GEOLOCATION_CONFIG_URL: 'GEOLOCATION_CONFIG_URL',
  GIF_HOST: 'GIF_HOST',
  LINK_HOST: 'LINK_HOST',
  MOD_SERVICE_DID: 'MOD_SERVICE_DID',
  OGCARD_URL: 'OGCARD_URL',
  PREVIEW_LINK_META_PROXY: 'PREVIEW_LINK_META_PROXY',
  PUBLIC_BSKY_SERVICE: 'ATP_PUBLIC_APPVIEW_URL',
  SOCIAL_APP_HOST: 'SOCIAL_APP_HOST', // plan to use to detect host match with env
  SOCIAL_APP_URL: 'SOCIAL_APP_URL',
  SOCIAL_EMBED_SERVICE: 'SOCIAL_EMBED_SERVICE',
  STATSIG_CLIENT_KEY: 'STATSIG_CLIENT_KEY',
  STATSIG_API_URL: 'STATSIG_API_URL',
  STATUS_PAGE_URL: 'STATUS_PAGE_URL',
  VIDEO_SERVICE: 'VIDEO_SERVICE',
  VIDEO_SERVICE_DID: 'VIDEO_SERVICE_DID',
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const processEnvConfigValues: Record<string, string> = {
  ATP_APPVIEW_DID: process.env.EXPO_PUBLIC_ATP_APPVIEW_DID,
  ATP_APPVIEW_URL: process.env.EXPO_PUBLIC_ATP_APPVIEW_URL,
  ATP_PDS_DID: process.env.EXPO_PUBLIC_ATP_PDS_DID,
  ATP_PDS_URL: process.env.EXPO_PUBLIC_ATP_PDS_URL,
  ATP_PUBLIC_APPVIEW_URL: process.env.EXPO_PUBLIC_ATP_PUBLIC_APPVIEW_URL,
  BLUESKY_PROXY_DID: process.env.EXPO_PUBLIC_BLUESKY_PROXY_DID,
  CHAT_PROXY_DID: process.env.EXPO_PUBLIC_CHAT_PROXY_DID,
  CORS_ALLOWED_ORIGINS: process.env.EXPO_PUBLIC_CORS_ALLOWED_ORIGINS,
  DM_SERVICE_DID: process.env.EXPO_PUBLIC_DM_SERVICE_DID,
  GIF_HOST: process.env.EXPO_PUBLIC_GIF_HOST,
  LINK_HOST: process.env.EXPO_PUBLIC_LINK_HOST,
  MOD_SERVICE_DID: process.env.EXPO_PUBLIC_MOD_SERVICE_DID,
  OGCARD_URL: process.env.EXPO_PUBLIC_OGCARD_URL,
  PREVIEW_LINK_META_PROXY: process.env.EXPO_PUBLIC_PREVIEW_LINK_META_PROXY,
  SOCIAL_APP_HOST: process.env.EXPO_PUBLIC_SOCIAL_APP_HOST,
  SOCIAL_APP_URL: process.env.EXPO_PUBLIC_SOCIAL_APP_URL,
  SOCIAL_EMBED_SERVICE: process.env.EXPO_PUBLIC_SOCIAL_EMBED_SERVICE,
  STATSIG_CLIENT_KEY: process.env.EXPO_PUBLIC_STATSIG_CLIENT_KEY,
  STATSIG_API_URL: process.env.EXPO_PUBLIC_STATSIG_API_URL,
  STATUS_PAGE_URL: process.env.EXPO_PUBLIC_STATUS_PAGE_URL,
  VIDEO_SERVICE: process.env.EXPO_PUBLIC_VIDEO_SERVICE,
  VIDEO_SERVICE_DID: process.env.EXPO_PUBLIC_VIDEO_SERVICE_DID,
}

function envToConfig(configValues: Record<string, string>): EnvConfig {
  const resultConfig: EnvConfig = {...EMPTY_CONFIG}
  for (const key in EMPTY_CONFIG) {
    const typedKey = key as keyof EnvConfig
    const envKeyName = `EXPO_PUBLIC_${InternalToEnvName[key]}`
    const resultValue = configValues[envKeyName]
    resultConfig[typedKey] = resultValue
  }
  return resultConfig
}

function fallbackConfig(...configs: EnvConfig[]): EnvConfig {
  const resultConfig: EnvConfig = {...EMPTY_CONFIG}
  for (const key in resultConfig) {
    const typedKey = key as keyof EnvConfig
    const resultValue = resultConfig[typedKey]
    if (!resultValue) {
      for (const config of configs) {
        const fallbackValue = config[typedKey]
        if (fallbackValue) {
          resultConfig[typedKey] = fallbackValue
          break
        }
      }
    }
  }
  logger.info(
    `Fallback environment calculated from ${configs.length} configs: ${resultConfig}`,
  )
  return resultConfig
}

function jsonToEnvConfig(
  json: Record<string, string>,
  ...configs: EnvConfig[]
): EnvConfig {
  const envConfig: EnvConfig = {...DOMAIN_ENVCONFIGS.empty}
  for (const key in DEFAULT_ENVCONFIG) {
    const typedKey = key as keyof EnvConfig
    const jsonKey = InternalToEnvName[key]
    const jsonValue = json[jsonKey]
    if (jsonValue === undefined) {
      for (const config of configs) {
        const defaultValue = config[typedKey]
        if (defaultValue) {
          logger.info(
            `Dynamic environment config didn't define ${key}, using default ${defaultValue}`,
          )
          envConfig[typedKey] = defaultValue
          break
        }
      }
    } else {
      envConfig[typedKey] = jsonValue as EnvConfig[keyof EnvConfig]
    }
  }
  return envConfig
}

const systemEnvs = (Constants?.expoConfig?.extra ?? {
  ['env-config']: {
    production: {...EMPTY_CONFIG},
    staging: {...EMPTY_CONFIG},
    development: {...EMPTY_CONFIG},
  },
})['env-config']
const systemEnvContents = (Constants?.expoConfig?.extra || {})['env-content']

// The defaults as bluesky originally ships them in social-app
const BLUESKY_CONFIG: EnvConfig = {
  APPVIEW_DID: 'did:web:api.bsky.app',
  APPVIEW_URL: 'https://api.bsky.app',
  BSKY_PROXY_DID: 'did:web:api.bsky.app',
  BSKY_SERVICE: 'https://bsky.social',
  BSKY_SERVICE_DID: 'did:web:bsky.social',
  DM_PROXY_DID: 'did:web:api.bsky.chat',
  DM_SERVICE_DID: 'did:web:api.bsky.chat',
  GEOLOCATION_CONFIG_URL: 'https://ip.bsky.app/config',
  GIF_HOST: 't.gifs.bsky.app',
  LINK_HOST: 'https://go.bsky.app',
  MOD_SERVICE_DID: 'did:plc:ar7c4by46qjdydhdevvrndac',
  OGCARD_URL: `https://ogcard.cdn.bsky.app`,
  PREVIEW_LINK_META_PROXY: 'https://cardyb.bsky.app/v1/extract?url=',
  PUBLIC_BSKY_SERVICE: 'https://public.api.bsky.app',
  SOCIAL_APP_HOST: 'bsky.app',
  SOCIAL_APP_URL: 'https://bsky.app',
  SOCIAL_EMBED_SERVICE: 'https://embed.bsky.app',
  STATSIG_CLIENT_KEY: 'client-SXJakO39w9vIhl3D44u8UupyzFl4oZ2qPIkjwcvuPsV',
  STATSIG_API_URL: 'https://events.bsky.app/v2',
  STATUS_PAGE_URL: 'https://status.bsky.app/',
  VIDEO_SERVICE: 'https://video.bsky.app',
  VIDEO_SERVICE_DID: 'did:web:video.bsky.app',
}

const BLUESKY_CONTENT: EnvContent = {
  onboarding: {
    auto_follow_accounts: ['did:plc:z72i7hdynmk6r22z27h6tvur'],
  },
  feeds: {
    named: {
      discover: {
        title: 'Discover',
        uri: 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot',
        type: 'feed',
        pinned: true,
        default: true,
        feedback: true,
      },
      timeline: {
        title: 'Following',
        uri: 'following',
        type: 'timeline',
        pinned: true,
      },
      video: {
        title: 'Videos',
        uri: 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/thevids',
        type: 'feed',
        pinned: true,
        default: true,
        video: true,
        feedback: true,
      },
    },
    log_for_owner_dids: [
      'did:plc:z72i7hdynmk6r22z27h6tvur',
      'did:plc:vpkhqolt662uhesyj6nxm7ys',
      'did:plc:q6gjnaw2blty4crticxkmujt',
    ],
    extra_headers_for_owner_dids: [
      'did:plc:z72i7hdynmk6r22z27h6tvur',
      'did:plc:vpkhqolt662uhesyj6nxm7ys',
      'did:plc:q6gjnaw2blty4crticxkmujt',
    ],
    known_shutdown_feeds: [
      'at://did:plc:wqowuobffl66jv3kpsvo7ak4/app.bsky.feed.generator/the-algorithm',
    ],
    authed_only: [
      'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/with-friends',
      'at://did:plc:tenurhgjptubkk5zf5qhi3og/app.bsky.feed.generator/mutuals',
      'at://did:plc:tenurhgjptubkk5zf5qhi3og/app.bsky.feed.generator/only-posts',
      'at://did:plc:wzsilnxf24ehtmmc3gssy5bu/app.bsky.feed.generator/mentions',
      'at://did:plc:q6gjnaw2blty4crticxkmujt/app.bsky.feed.generator/bangers',
      'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/mutuals',
      'at://did:plc:q6gjnaw2blty4crticxkmujt/app.bsky.feed.generator/my-followers',
    ],
    fallback_to: 'discover',
  },
  links: {
    about: 'https://bsky.social',
    blog: 'https://bsky.social/about/blog',
    jobs: 'https://bsky.social/about/join',
  },
  sample_content: {
    profile: {
      name: 'bsky.app',
    },
    images: {
      default_avatar: 'https://bsky.social/about/images/favicon-32x32.png',
      default_banner:
        'https://bsky.social/about/images/social-card-default-gradient.png',
    },
  },
  embed: {
    default_post: {
      profile_name: 'emilyliu.me',
      did: 'did:plc:vjug55kidv6sye7ykr5faxxn',
      record_type: 'post',
      post_id: '3jzn6g7ixgq2y',
    },
  },
  debug: {
    discover_debug_dids: [
      'did:plc:oisofpd7lj26yvgiivf3lxsi', // hailey.at
      'did:plc:p2cp5gopk7mgjegy6wadk3ep', // samuel.bsky.team
      'did:plc:ragtjsm2j2vknwkz3zp4oxrd', // pfrazee.com
      'did:plc:vpkhqolt662uhesyj6nxm7ys', // why.bsky.team
      'did:plc:3jpt2mvvsumj2r7eqk4gzzjz', // esb.lol
      'did:plc:vjug55kidv6sye7ykr5faxxn', // emilyliu.me
      'did:plc:tgqseeot47ymot4zro244fj3', // iwsmith.bsky.social
      'did:plc:2dzyut5lxna5ljiaasgeuffz', // mrnuma.bsky.social
    ],
  },
}

const BLUESKY_STAGING_CONTENT: EnvContent = {
  ...BLUESKY_CONTENT,
  feeds: {
    ...BLUESKY_CONTENT.feeds,
    named: {
      ...BLUESKY_CONTENT.feeds.named,
      discover: {
        title: 'Discover',
        uri: 'at://did:plc:yofh3kx63drvfljkibw5zuxo/app.bsky.feed.generator/whats-hot',
        type: 'feed',
        pinned: true,
        default: true,
        feedback: true,
      },
      video: {
        title: 'Videos',
        uri: 'at://did:plc:yofh3kx63drvfljkibw5zuxo/app.bsky.feed.generator/thevids',
        type: 'feed',
        pinned: true,
        default: true,
        video: true,
        feedback: true,
      },
    },
  },
}

// This won't work well, but it's there
const EMPTY_CONTENT: EnvContent = {
  onboarding: {
    auto_follow_accounts: [],
  },
  feeds: {
    named: {},
    log_for_owner_dids: [],
    extra_headers_for_owner_dids: [],
    known_shutdown_feeds: [],
    authed_only: [],
    fallback_to: '',
  },
  links: {},
  feedback: {
    postToken: '',
    postUrl: '',
  },
  sample_content: {
    profile: {
      name: '',
    },
    images: {
      default_avatar: '',
      default_banner: '',
    },
  },
  embed: {
    default_post: {
      profile_name: '',
      did: '',
      post_id: '',
    },
  },
  debug: {
    discover_debug_dids: [],
  },
}

// The defaults are only different for some items on staging
const BLUESKY_STAGING_CONFIG: EnvConfig = {
  APPVIEW_DID: BLUESKY_CONFIG.APPVIEW_DID,
  APPVIEW_URL: BLUESKY_CONFIG.APPVIEW_URL,
  BSKY_PROXY_DID: 'did:web:staging.bsky.dev', // use the same proxy as the service
  BSKY_SERVICE: 'https://staging.bsky.dev',
  BSKY_SERVICE_DID: 'did:web:staging.bsky.dev',
  DM_PROXY_DID: BLUESKY_CONFIG.DM_SERVICE_DID, // use the same proxy as the service
  DM_SERVICE_DID: BLUESKY_CONFIG.DM_SERVICE_DID,
  GEOLOCATION_CONFIG_URL: 'https://bsky.app/ipcc', // not sure if staging actually uses this or the bsky one
  GIF_HOST: BLUESKY_CONFIG.GIF_HOST,
  LINK_HOST: BLUESKY_CONFIG.LINK_HOST,
  MOD_SERVICE_DID: 'did:web:mod.staging.bsky.dev',
  OGCARD_URL: BLUESKY_CONFIG.OGCARD_URL,
  PREVIEW_LINK_META_PROXY: 'https://cardyb.staging.bsky.dev/v1/extract?url=',
  PUBLIC_BSKY_SERVICE: BLUESKY_CONFIG.PUBLIC_BSKY_SERVICE,
  SOCIAL_APP_HOST: BLUESKY_CONFIG.SOCIAL_APP_HOST,
  SOCIAL_APP_URL: BLUESKY_CONFIG.SOCIAL_APP_URL,
  SOCIAL_EMBED_SERVICE: BLUESKY_CONFIG.SOCIAL_EMBED_SERVICE,
  STATSIG_CLIENT_KEY: BLUESKY_CONFIG.STATSIG_CLIENT_KEY,
  STATSIG_API_URL: BLUESKY_CONFIG.STATSIG_API_URL,
  STATUS_PAGE_URL: BLUESKY_CONFIG.STATUS_PAGE_URL,
  VIDEO_SERVICE: BLUESKY_CONFIG.VIDEO_SERVICE,
  VIDEO_SERVICE_DID: BLUESKY_CONFIG.VIDEO_SERVICE_DID,
}

// what was passed into EXPO_PUBLIC_ variables in dev runtime or at build time
const PROCESS_ENV_CONFIG = envToConfig(process.env)
// reading from .env.production in this directory or grandparent
const PRODUCTION_CONFIG = envToConfig(systemEnvs.production)
// reading from .env.testing in this directory or grandparent
const STAGING_CONFIG = envToConfig(systemEnvs.staging)
// dev runtime, but falling back to .env in this directory or grandparent
// TODO: should this fall back to local ports? see constants.ts:LOCAL_DEV_SERVICE
const DEVELOPMENT_CONFIG = fallbackConfig(
  PROCESS_ENV_CONFIG,
  envToConfig(systemEnvs.development),
)

export const PRODUCTION_DOMAIN = PRODUCTION_CONFIG.SOCIAL_APP_HOST || 'bsky.app'
export const STAGING_DOMAIN = STAGING_CONFIG.SOCIAL_APP_HOST || null

export const DOMAIN_ENVCONFIGS: Record<string, EnvConfig> = {
  // the original bluesky defaults. This is not currently used (?)
  bluesky: BLUESKY_CONFIG,
  bluesky_staging: BLUESKY_STAGING_CONFIG,
  // the standard environments, baked into builds
  production: PRODUCTION_CONFIG,
  staging: STAGING_CONFIG,
  // env vars if they are present, but otherwise reading from the current environment file
  development: DEVELOPMENT_CONFIG,
  empty: EMPTY_CONFIG,
  process: PROCESS_ENV_CONFIG,
}

const envContentSchema = z.object({
  onboarding: z
    .object({
      auto_follow_accounts: z.array(z.string()).default([]),
    })
    .default({}),
  feeds: z
    .object({
      named: z
        .record(
          z.object({
            title: z.string(),
            uri: z.string(),
            type: z.string(),
            pinned: z.boolean(),
            default: z.boolean().optional(),
            video: z.boolean().optional(),
            feedback: z.boolean().optional(),
          }),
        )
        .default({}),
      log_for_owner_dids: z.array(z.string()).default([]),
      extra_headers_for_owner_dids: z.array(z.string()).default([]),
      known_shutdown_feeds: z.array(z.string()).default([]),
      authed_only: z.array(z.string()).default([]),
      fallback_to: z.string().optional(),
    })
    .default({}),
  links: z
    .object({
      about: z.string().optional(),
      blog: z.string().optional(),
      helpDesk: z.string().optional(),
      jobs: z.string().optional(),
      policyBase: z.string().optional(),
      pdsSupport: z.string().optional(),
    })
    .default({}),
  sample_content: z
    .object({
      profile: z
        .object({
          name: z.string().optional(),
        })
        .optional(),
      images: z
        .object({
          default_avatar: z.string().optional(),
          default_banner: z.string().optional(),
        })
        .optional(),
    })
    .default({}),
  embed: z
    .object({
      default_post: z
        .object({
          profile_name: z.string(),
          did: z.string(),
          record_type: z.string().optional(),
          post_id: z.string(),
        })
        .optional(),
    })
    .default({}),
  feedback: z
    .object({
      postUrl: z.string().optional(),
      postToken: z.string().optional(),
    })
    .default({}),
  debug: z
    .object({
      discover_debug_dids: z.array(z.string()).default([]),
    })
    .default({}),
})

function buildSystemToEnvContent(contentObj: any): EnvContent {
  // Convert build system content object to typed EnvContent
  if (!contentObj || typeof contentObj !== 'object') {
    return EMPTY_CONTENT
  }
  return envContentSchema.parse(contentObj)
}

// Build-time content configurations from build system
const PRODUCTION_CONTENT = buildSystemToEnvContent(
  systemEnvContents?.production,
)
const STAGING_CONTENT = buildSystemToEnvContent(systemEnvContents?.staging)
const DEVELOPMENT_CONTENT = buildSystemToEnvContent(
  systemEnvContents?.development,
)

export const DOMAIN_ENVCONTENTS: Record<string, EnvContent> = {
  // the original bluesky defaults
  bluesky: BLUESKY_CONTENT,
  bluesky_staging: BLUESKY_STAGING_CONTENT,
  // the standard environments, baked into builds
  production: PRODUCTION_CONTENT,
  staging: STAGING_CONTENT,
  // build-time content if present, otherwise fallback to production
  development: DEVELOPMENT_CONTENT,
  empty: EMPTY_CONTENT,
}

const location = window.location
const {protocol, host, hostname} = location || {
  protocol: undefined,
  host: undefined,
  hostname: undefined,
}
const isWeb = protocol === 'http:' || protocol === 'https:'
const isProductionWeb = isWeb && hostname === PRODUCTION_DOMAIN
const isStagingWeb = isWeb && hostname === STAGING_DOMAIN
export const buildProfileName = process.env.EXPO_PUBLIC_ENV || 'development'
const isProductionEnv =
  isProductionWeb || (!isWeb && buildProfileName === 'production')
const isStagingEnv = isStagingWeb || (!isWeb && buildProfileName === 'test')

// NB there's a difference between a staging build and the staging domains
const DEFAULT_ENVCONFIG = __DEV__
  ? fallbackConfig(DEVELOPMENT_CONFIG, PRODUCTION_CONFIG, BLUESKY_CONFIG)
  : // both production and staging social-app should default to their equivalent servers
    isProductionEnv
    ? fallbackConfig(PRODUCTION_CONFIG, BLUESKY_CONFIG)
    : isStagingEnv
      ? fallbackConfig(STAGING_CONFIG, PRODUCTION_CONFIG, BLUESKY_CONFIG)
      : // but any development or other mode should default to the local development first
        fallbackConfig(DEVELOPMENT_CONFIG, PRODUCTION_CONFIG, BLUESKY_CONFIG)

export const SWITCHING_ENABLED = !isProductionEnv

function getFallbackEnvConfig(): EnvConfig {
  // the default env-config to use when one can't be loaded from stored settings
  return __DEV__ ? DOMAIN_ENVCONFIGS.development : determineDomainEnvConfig()
}

function isCustomDomain() {
  if (isProductionEnv) {
    return false
  }
  // Non-production: custom if a custom server has been stored
  const storedHost = device.get(['customServerHost'])
  return !!storedHost
}

export function getStoredEnvConfig(): EnvConfig {
  const storedEnvConfig: EnvConfig = {...EMPTY_CONFIG}
  try {
    if (envConfigStorage && isCustomDomain()) {
      for (const key in EMPTY_CONFIG) {
        const typedKey = key as keyof EnvConfig
        storedEnvConfig[typedKey] = envConfigStorage.get([typedKey]) || ''
      }
    }
  } catch (e) {
    logger.warn('Storage not available, env-config being calculated')
    return getFallbackEnvConfig()
  }
  if (!storedEnvConfig.SOCIAL_APP_HOST) {
    logger.info('No stored env-config, calculating based on environment')
    return getFallbackEnvConfig()
  }
  return storedEnvConfig
}

const events = new EventEmitter()
const EVENT = 'envconfig-updated'
/*
const emitEnvConfigUpdate = (envConfig: EnvConfig) => {
  events.emit(EVENT, envConfig)
}
  */
const onEnvConfigUpdate = (listener: (env_config: EnvConfig) => void) => {
  events.on(EVENT, listener)
  return () => {
    events.off(EVENT, listener)
  }
}

const CONTENT_EVENT = 'envcontent-updated'
const onEnvContentUpdate = (listener: (env_content: EnvContent) => void) => {
  events.on(CONTENT_EVENT, listener)
  return () => {
    events.off(CONTENT_EVENT, listener)
  }
}

export async function fetchEnvConfig(server: string) {
  const serverUrl = new URL(server)
  if (
    !serverUrl ||
    (serverUrl?.pathname && serverUrl?.pathname !== '/') ||
    serverUrl?.search
  ) {
    logger.warn(
      `Could not fetch envConfig from non-root URL of server ${server}: ${JSON.stringify(serverUrl)}`,
    )
    return null
  }
  const configUrl = `${serverUrl}env-config`
  logger.info(`Fetching environment config from ${configUrl}`)
  try {
    const res = await fetch(configUrl)
    if (res.ok) {
      const json = (await res.json()) as Record<string, string>
      logger.info(`Loaded json for environment config: ${JSON.stringify(json)}`)
      const envConfig: EnvConfig = jsonToEnvConfig(json)
      logger.info(
        `Loaded environment config from json with fallback: ${envConfig}`,
      )
      return envConfig
    } else if (res.status === 404) {
      logger.info(`Dynamic environment config not supported by ${serverUrl}`)
    } else {
      logger.error(`Dynamic environment config: lookup failed ${res.status}`)
    }
  } catch (e) {
    logger.error(`Failed to fetch ${configUrl}: ${e}`)
  }
  return null
}

export async function fetchEnvConfigAndContent(server: string): Promise<{
  config?: EnvConfig
  content?: EnvContent
}> {
  // First fetch env-config
  const config = await fetchEnvConfig(server)
  const result: {config?: EnvConfig; content?: EnvContent} = {}

  if (config) {
    result.config = config

    // Now fetch env-content from the appview URL from the config
    const appviewUrl = config.APPVIEW_URL
    if (appviewUrl) {
      const content = await fetchEnvContent(appviewUrl)
      if (content) {
        result.content = content
      }
    }
  }

  return result
}

export async function fetchEnvContent(server: string) {
  const serverUrl = new URL(server)
  if (
    !serverUrl ||
    (serverUrl?.pathname && serverUrl?.pathname !== '/') ||
    serverUrl?.search
  ) {
    logger.warn(
      `Could not fetch envContent from non-root URL of server ${server}: ${JSON.stringify(serverUrl)}`,
    )
    return null
  }
  const contentUrl = `${serverUrl}.well-known/atproto-appview-env-content`
  logger.info(`Fetching environment content from ${contentUrl}`)
  try {
    const res = await fetch(contentUrl)
    if (res.ok) {
      const json = (await res.json()) as Record<string, string>
      logger.info(
        `Loaded json for environment content: ${JSON.stringify(json)}`,
      )
      const envContent: EnvContent = envContentSchema.parse(json)
      logger.info(
        `Loaded environment content from json with fallback: ${envContent}`,
      )
      return envContent
    } else if (res.status === 404) {
      logger.info(`Dynamic environment content not supported by ${serverUrl}`)
    } else {
      logger.error(`Dynamic environment content: lookup failed ${res.status}`)
    }
  } catch (e) {
    logger.error(`Failed to fetch ${contentUrl}: ${e}`)
  }
  return null
}

export function determineDomainEnvConfig(): EnvConfig {
  // determines the envConfig based on the domain name, if present (only on web)
  if (protocol === 'http' || protocol === 'https') {
    logger.info(`Environment config deduction based on ${protocol}://${host}:`)
    if (hostname === PRODUCTION_DOMAIN) {
      logger.info('Using production environment config')
      return DOMAIN_ENVCONFIGS.production
    } else if (STAGING_DOMAIN && hostname === STAGING_DOMAIN) {
      logger.info('Using staging environment config')
      return DOMAIN_ENVCONFIGS.staging
    }
  }
  logger.warn(
    `Falling back to default environment config based on expo env ${buildProfileName}`,
  )
  return DEFAULT_ENVCONFIG
}

export function setStoredEnvConfig(newEnvConfig: EnvConfig) {
  Object.keys(EMPTY_CONFIG).forEach(key => {
    const typedKey = key as keyof EnvConfig
    envConfigStorage.set([typedKey], newEnvConfig[typedKey])
  })
}

export function clearStoredEnvConfig() {
  envConfigStorage.removeMany(
    [],
    Object.keys(EMPTY_CONFIG).map(key => key as keyof EnvConfig),
  )
}

function getFallbackEnvContent(): EnvContent {
  // the default env-content to use when one can't be loaded from stored settings
  return __DEV__ ? DOMAIN_ENVCONTENTS.development : determineDomainEnvContent()
}

export function determineDomainEnvContent(): EnvContent {
  // determines the envContent based on the domain name, if present (only on web)
  if (protocol === 'http' || protocol === 'https') {
    logger.info(`Environment content deduction based on ${protocol}://${host}:`)
    if (hostname === PRODUCTION_DOMAIN) {
      logger.info('Using production environment content')
      return DOMAIN_ENVCONTENTS.production
    } else if (STAGING_DOMAIN && hostname === STAGING_DOMAIN) {
      logger.info('Using staging environment content')
      return DOMAIN_ENVCONTENTS.staging
    }
  }
  logger.warn(
    `Falling back to default environment content based on expo env ${buildProfileName}`,
  )
  return isProductionEnv
    ? DOMAIN_ENVCONTENTS.production
    : isStagingEnv
      ? DOMAIN_ENVCONTENTS.staging
      : DOMAIN_ENVCONTENTS.development
}

export function hasNonemptyStoredEnvContent(): boolean {
  try {
    if (envContentStorage) {
      const stored = envContentStorage.get(['content'])
      // search for non-empty string values or list elements
      if (
        stored &&
        (stored.search(/:\s*"[^"]/) !== -1 ||
          stored.search(/\[\s*"[^"]/) !== -1)
      ) {
        return true
      } else {
        console.log('Found empty stored env-content', stored)
      }
    }
    return false
  } catch (e) {
    logger.warn(
      'Error reading stored env-content, proceeding as if not present',
    )
    return false
  }
}
export function getStoredEnvContent(): EnvContent {
  try {
    if (envContentStorage && isCustomDomain()) {
      const storedContentString = envContentStorage.get(['content'])
      if (storedContentString) {
        return envContentSchema.parse(JSON.parse(storedContentString))
      }
    }
  } catch (e) {
    logger.warn(
      'Storage not available or invalid, env-content being calculated',
    )
    return getFallbackEnvContent()
  }
  logger.info('No stored env-content, calculating based on environment')
  return getFallbackEnvContent()
}

export function setStoredEnvContent(newEnvContent: EnvContent) {
  try {
    envContentStorage.set(['content'], JSON.stringify(newEnvContent))
  } catch (e) {
    logger.warn('Failed to store env-content:', e)
  }
}

export function clearStoredEnvContent() {
  envContentStorage.remove(['content'])
}

export function renderEnvConfig(
  envConfig: EnvConfig,
  indent: number = 0,
): string {
  const indentJoin = indent ? '\n' + ' '.repeat(indent) : ', '
  return (
    '{' +
    Object.keys(EMPTY_CONFIG)
      .map(key => {
        const typedKey = key as keyof EnvConfig
        const value = envConfig[typedKey]
        return `${key}: ${value || ''}`
      })
      .join(indentJoin) +
    '}'
  )
}

export function renderEnvContent(
  envContent: EnvContent,
  indent: number = 0,
): string {
  return JSON.stringify(envContent, null, indent)
}

/**
 * Begin the process of resolving envconfig. This should be called once at
 * app start.
 *
 * THIS METHOD SHOULD NEVER THROW.
 *
 * This method is otherwise not used for any purpose.
 * envConfig is actually resolved statically here, so it synchronously initializes it
 */
export function beginResolveEnvConfig() {
  /**
   * We only use local storage if the current domain (i.e. page doing the request) is not known to be
   * the foodios prod/staging domain. Not that local storage WILL be used if your social app is
   * served from a custom domain and you have manually set your server endpoint to prod/staging.
   */
  if (!isCustomDomain()) {
    logger.info("Non-custom domain: won't load stored env")
    return
  }
  logger.info('Custom domain: attempting to use stored env')
  /**
   * In dev, IP server is unavailable, but if running from bluesky-selfhost-env,
   * we want to use the environment
   */
  let currentSocialHost: string | undefined
  try {
    currentSocialHost = envConfigStorage?.get(['SOCIAL_APP_HOST'])
  } catch (e) {
    // Storage not available yet, will calculate config without storing
    currentSocialHost = undefined
  }

  if (!currentSocialHost) {
    const configToUse = getFallbackEnvConfig()

    if (__DEV__) {
      logger.info('Loading dev env-config, using local environment variables')
    } else {
      logger.info('Loading non-dev env-config, using built-in values')
    }

    // Only store if storage is available
    try {
      if (envConfigStorage) {
        setStoredEnvConfig(configToUse)
      }
    } catch (e) {
      // Storage not available, config will be calculated each time
      logger.info(
        'Storage not available, env-config calculated without persistence',
      )
    }
  } else {
    logger.info(`Env-Config already loaded with ${currentSocialHost}`)
  }
  logger.info(`Env-Config: ${JSON.stringify(getStoredEnvConfig())}`)

  // Initialize env-content similarly
  let currentStoredContent: EnvContent | undefined
  try {
    if (hasNonemptyStoredEnvContent()) {
      currentStoredContent = getStoredEnvContent()
    } else {
      currentStoredContent = undefined
    }
  } catch (e) {
    console.log('Error checking for stored env-content', e)
    currentStoredContent = undefined
  }

  if (!currentStoredContent) {
    const contentToUse = getFallbackEnvContent()

    if (__DEV__) {
      logger.info('Loading dev env-content, using local environment data')
    } else {
      logger.info('Loading non-dev env-content, using built-in values')
    }

    try {
      if (envContentStorage) {
        setStoredEnvContent(contentToUse)
      }
    } catch (e) {
      logger.info(
        'Storage not available, env-content calculated without persistence',
      )
    }
  } else {
    logger.info('Env-Content already loaded')
  }
  logger.info(`Env-Content: ${JSON.stringify(getStoredEnvContent())}`)
  return
}

export const hasRequiredConfig = function (candidate: EnvConfig): boolean {
  // returns whether the given environment config has the essential items
  return Boolean(
    candidate.SOCIAL_APP_HOST &&
      candidate.SOCIAL_APP_URL &&
      candidate.APPVIEW_URL &&
      candidate.BSKY_SERVICE &&
      candidate.PUBLIC_BSKY_SERVICE,
  )
}

// don't include bluesky_staging as it's not actually reachable
export const builtinConfigNames = [
  'bluesky',
  'production',
  'staging',
  'development',
]
export const configLabels: Record<string, string> = {
  bluesky: '🦋 bsky',
  bluesky_staging: '🐛 bsky staging',
  production: '🏠 prod',
  staging: '🧪 staging',
  development: '🏗️ dev',
  custom: '🛠️ custom',
}
export const configTitles: Record<string, string> = {
  bluesky: 'Bluesky',
  bluesky_staging: 'Bluesky Staging',
  production: 'Production',
  staging: 'Staging',
  development: 'Development',
  custom: 'Custom',
}
export const configColors: Record<string, string> = {
  bluesky: 'blue',
  bluesky_staging: 'skyblue',
  production: 'green',
  staging: 'olive',
  development: 'orange',
  custom: 'gray',
}

// Common environment configuration management methods
export async function switchToBuiltinEnvironment(
  envName: string,
  setEnvConfig?: (config: EnvConfig) => void,
  setEnvContent?: (content: EnvContent) => void,
): Promise<{success: boolean; message: string}> {
  const newEnvConfig = DOMAIN_ENVCONFIGS[envName]
  if (newEnvConfig != null && hasRequiredConfig(newEnvConfig)) {
    logger.info(
      `Switching environment config to ${envName}: ${renderEnvConfig(newEnvConfig)}`,
    )
    setStoredEnvConfig(newEnvConfig)
    device.remove(['customServerHost'])
    if (setEnvConfig) setEnvConfig(getStoredEnvConfig())

    const newEnvContent = DOMAIN_ENVCONTENTS[envName]
    if (newEnvContent != null) {
      logger.info(
        `Switching environment content to ${envName}: ${renderEnvContent(newEnvContent)}`,
      )
      setStoredEnvContent(newEnvContent)
      if (setEnvContent) setEnvContent(getStoredEnvContent())
    }

    return {
      success: true,
      message: `Switched environment to ${envName}`,
    }
  } else {
    return {
      success: false,
      message: `Could not find valid environment config named ${envName}`,
    }
  }
}

export async function switchToCustomEnvironment(
  serverName: string,
  setEnvConfig: (config: EnvConfig) => void,
  setEnvContent: (content: EnvContent) => void,
): Promise<{success: boolean; message: string}> {
  const customUrl = serverName.includes('://')
    ? serverName
    : `https://${serverName}`
  const {config: newEnvConfig, content: newEnvContent} =
    await fetchEnvConfigAndContent(customUrl)
  if (newEnvConfig !== null && newEnvConfig !== undefined) {
    logger.info(
      `Switching environment config to custom loaded from ${serverName}: ${renderEnvConfig(newEnvConfig)}`,
    )
    setStoredEnvConfig(newEnvConfig)
    device.set(['customServerHost'], serverName)
    setEnvConfig(getStoredEnvConfig())

    if (newEnvContent !== null && newEnvContent !== undefined) {
      logger.info(
        `Also switching environment content to custom loaded from ${newEnvConfig.SOCIAL_APP_HOST}, updating stored content`,
      )
      logger.info(`New env-content: ${JSON.stringify(newEnvContent)}`)
      setStoredEnvContent(newEnvContent)
      setEnvContent(getStoredEnvContent())
    }

    return {
      success: true,
      message: `Switched environment to custom loaded from ${serverName}`,
    }
  } else {
    return {
      success: false,
      message: `Could not retrieve new config from ${serverName}`,
    }
  }
}

export async function resetStoredEnvironment(
  setEnvConfig: (config: EnvConfig) => void,
): Promise<{success: boolean; message: string}> {
  clearStoredEnvConfig()
  beginResolveEnvConfig()
  setEnvConfig(getStoredEnvConfig())
  return {
    success: true,
    message: 'Reset environment to default',
  }
}

export function getCurrentEnvName(
  envConfig: EnvConfig,
  debug: boolean = false,
): string {
  let possibleMatches = []
  for (const [key, value] of Object.entries(DOMAIN_ENVCONFIGS)) {
    if (JSON.stringify(envConfig) === JSON.stringify(value)) {
      return key
    }
    if (envConfig.SOCIAL_APP_HOST === value.SOCIAL_APP_HOST) {
      possibleMatches.push(key)
    }
  }

  if (debug && possibleMatches.length > 0) {
    logger.info(
      `Current envConfig does not match any built-in config: - possible matches: ${possibleMatches}`,
    )
    const strConfig = renderEnvConfig(envConfig)
    const jsonConfig = JSON.stringify(envConfig)
    const findFirstDiff = (str1: string, str2: string) => {
      const mismatchIndex = [...str1].findIndex(
        (el, index) => el !== str2[index],
      )
      if (mismatchIndex === -1) return {message: 'no mismatch found'}
      return {index: mismatchIndex, char: str2[mismatchIndex]}
    }
    logger.info(`Current config: ${strConfig}`)
    for (const possibleMatch of possibleMatches) {
      const strPossible = renderEnvConfig(DOMAIN_ENVCONFIGS[possibleMatch])
      logger.info(`Possible match: ${possibleMatch}: ${strPossible}`)
      if (strConfig === strPossible) {
        const jsonPossible = JSON.stringify(DOMAIN_ENVCONFIGS[possibleMatch])
        logger.info(`Exact match. JSON: ${jsonPossible}`)
        logger.info(`Expected JSON: ${jsonConfig}`)
        const diff = findFirstDiff(jsonConfig, jsonPossible)
        logger.info(`Differs at: ${JSON.stringify(diff)}`)
        if (diff.index) {
          logger.info(
            `${jsonConfig.slice(diff.index, diff.index + 16)} != ${jsonPossible.slice(diff.index, diff.index + 16)}`,
          )
        }
      } else {
        const diff = findFirstDiff(strConfig, strPossible)
        logger.info(`Mismatch. Differs at: ${JSON.stringify(diff)}`)
        if (diff.index) {
          logger.info(
            `${strConfig.slice(diff.index, diff.index + 16)} != ${strPossible.slice(diff.index, diff.index + 16)}`,
          )
        }
      }
    }
  }

  return 'custom'
}

type Context = {
  envConfig: EnvConfig
  setEnvConfig: React.Dispatch<React.SetStateAction<EnvConfig>>
  envContent: EnvContent
  setEnvContent: React.Dispatch<React.SetStateAction<EnvContent>>
}

const context = React.createContext<Context>({
  envConfig: DEFAULT_ENVCONFIG,
  setEnvConfig: () => {},
  envContent: BLUESKY_CONTENT,
  setEnvContent: () => {},
})

export function Provider({children}: {children: React.ReactNode}) {
  beginResolveEnvConfig()
  const [envConfig, setEnvConfig] = React.useState(() => {
    const initial = getStoredEnvConfig()
    return initial
  })

  const [envContent, setEnvContent] = React.useState(() => {
    const initial = getStoredEnvContent()
    return initial
  })

  React.useEffect(() => {
    return onEnvConfigUpdate(newEnvConfig => {
      setEnvConfig(newEnvConfig!)
      setStoredEnvConfig(newEnvConfig)
    })
  }, [])

  React.useEffect(() => {
    return onEnvContentUpdate(newEnvContent => {
      setEnvContent(newEnvContent!)
      setStoredEnvContent(newEnvContent)
    })
  }, [])

  const ctx = React.useMemo(() => {
    return {
      envConfig,
      setEnvConfig,
      envContent,
      setEnvContent,
    }
  }, [envConfig, setEnvConfig, envContent, setEnvContent])

  return <context.Provider value={ctx}>{children}</context.Provider>
}

export function useEnvConfig() {
  return React.useContext(context)
}

export function useEnvContent() {
  return React.useContext(context)
}
