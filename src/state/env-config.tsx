// Allows configuration of domains and URLs within the atproto ecosystem
// Order of overriding (highest defined variable overrides lower):
/*

**Constant Resolution**

The tricky question: How can we have builds that are independent of the domain configuration?
- production should automatically use the right staging domains without environment variables
- staging could have a flag that triggers all the right staging domains
- development should allow configuring this much more dynamically?

On the web, we could detect that we're using the production/staging domain, and follow suit...
- when running in a container, that shouldn't require anything more for production and staging
- when running dev in a container, we should supply config from the go server under a dynamic URL
  * this should use the base URL to work out where to fetch it from
  * these values are read by the server once on startup, so it will require restarting to change them
  * they are loaded once by the web browser on page load, and should not be cached
- when running dev from source, we should use environment variables from process.env.EXPO_PUBLIC_*
  * it would help to automatically set these up based on the bluesky-selfhost-env environment

For mobile, produce separate builds with production/staging/a-particular-development-setup hardcoded
- it's not worth trying to load these dynamically and the rights restrictions would break anyway
- we should include the target server variant in the build name
- when running mobile from dev, presumably the same environment variables as in web will work
  * it would be expedient to just set the social-app's env-config URL, and then read the config as in the container version
  * in this case, the app should read it once from the URL on startup

Notes on expo's environment reading:

* expo follows the dotenv order of precedence, and so does the go server:
  - .env.{development|test|production}.local
  - .env.local
  - .env.{development|test|production}
  - .env
  - the actual system environment variables, which at runtime will be:
      - defined by docker-compose.yaml when running in a docker container
      - whatever is in the environment when running from source on the host

* For builds served from go, usually running in docker containers, the aim is to have the same docker image.
  - If the web app detects production or staging domain, it will use the corresponding config, which is baked in
  - If it detects a non-standard domain, it will query that domain for the config
  - This does mean that a proxy domain could be set up that reconfigures which services etc to use

* If builds are produced without defining the environment variables, the config will use the Bluesky defaults
  - Defaults elsewhere in the code have been moved here and should just reference this config

**Tasks**

* Work out how mobile build filenames are determined and what they should be and where they should go
  - EAS_LOCAL_BUILD_ARTIFACTS_DIR is relevant
  - You can't control the output filename. We could use a temporary artifacts dir and then move and rename
  - Filename:
    * Production build: ${app_name}-${version}-${date}-${build_number}.${ext}
    * Other build: ${app_name}-${version}-${date}-${build_number}-${social_app_domain}.${ext}
* Verify how profiles work in eas, and how these correspond to the dotenv order of precedence, NODE_ENV etc
  - We should have development (own domain names), staging (set), production (set)
  - Distinguish between build variants and target servers
    - In source code, expo provides __DEV__ to indicate development mode or not
    - The selected expo environment is present in `EXPO_PUBLIC_ENV`
    - We could support different app ids / names based on build variants, to allow side-by-side installs
    - Build variants are configured in eas.json; TODO: this needs cleaning up
    - That's different from builds that target different servers...
      - We could have development + staging + production servers, orthogonally from build variants
      - If running locally, you can configure ngrok to tunnel things back to your domain
  - Development should also support running from source with easy switches
* Decide whether non-production mobile builds should support dynamically retrieved config variables
  - This is probably a good idea as it means the web and mobile versions will behave the same
  - But it might create iOS (or android) permissions issues. Hopefully this won't be an issue for test builds
* How to handle secret environment variables

*/

// This is based on geolocation, but doesn't use Storage as it shouldn't be persisted

import React from 'react'
import Constants from 'expo-constants'
import EventEmitter from 'eventemitter3'

// import {logger} from '#/logger'
const logger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
}
import {
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
const HELP_DESK_LANG = 'en-us'

const EMPTY_CONFIG: EnvConfig = {
  APPVIEW_URL: '',
  BSKY_SERVICE: '',
  GIF_HOST: '',
  HELP_DESK_URL: '',
  LINK_HOST: '',
  OGCARD_URL: '',
  POLICY_BASE_URL: '',
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

const InternalToEnvName: Record<string, string> = {
  APPVIEW_URL: 'EXPO_PUBLIC_ATP_APPVIEW_URL',
  BSKY_SERVICE: 'EXPO_PUBLIC_ATP_PDS_URL',
  GIF_HOST: 'EXPO_PUBLIC_GIF_HOST',
  HELP_DESK_URL: 'EXPO_PUBLIC_SOCIAL_HELP_DESK_URL',
  LINK_HOST: 'EXPO_PUBLIC_LINK_HOST',
  OGCARD_URL: 'EXPO_PUBLIC_OGCARD_URL',
  POLICY_BASE_URL: 'EXPO_PUBLIC_SOCIAL_POLICY_BASE_URL',
  PREVIEW_LINK_META_PROXY: 'EXPO_PUBLIC_PREVIEW_LINK_META_PROXY',
  PUBLIC_BSKY_SERVICE: 'EXPO_PUBLIC_ATP_PUBLIC_APPVIEW_URL',
  SOCIAL_APP_HOST: 'EXPO_PUBLIC_SOCIAL_APP_HOST', // plan to use to detect host match with env
  SOCIAL_APP_URL: 'EXPO_PUBLIC_SOCIAL_APP_URL',
  SOCIAL_EMBED_SERVICE: 'EXPO_PUBLIC_SOCIAL_EMBED_SERVICE',
  STATSIG_CLIENT_KEY: 'EXPO_PUBLIC_STATSIG_CLIENT_KEY',
  STATSIG_API_URL: 'EXPO_PUBLIC_STATSIG_API_URL',
  STATUS_PAGE_URL: 'EXPO_PUBLIC_STATUS_PAGE_URL',
  VIDEO_SERVICE: 'EXPO_PUBLIC_VIDEO_SERVICE',
  VIDEO_SERVICE_DID: 'EXPO_PUBLIC_VIDEO_SERVICE_DID',
}

const processEnvConfigValues: Record<string, string> = {
  ATP_APPVIEW_URL: process.env.EXPO_PUBLIC_ATP_APPVIEW_URL,
  ATP_PDS_HOST: process.env.EXPO_PUBLIC_ATP_PDS_HOST,
  ATP_PUBLIC_APPVIEW_URL: process.env.EXPO_PUBLIC_ATP_PUBLIC_APPVIEW_URL,
  CORS_ALLOWED_ORIGINS: process.env.EXPO_PUBLIC_CORS_ALLOWED_ORIGINS,
  GIF_HOST: process.env.EXPO_PUBLIC_GIF_HOST,
  LINK_HOST: process.env.EXPO_PUBLIC_LINK_HOST,
  OGCARD_URL: process.env.EXPO_PUBLIC_OGCARD_URL,
  PREVIEW_LINK_META_PROXY: process.env.EXPO_PUBLIC_PREVIEW_LINK_META_PROXY,
  SOCIAL_APP_HOST: process.env.EXPO_PUBLIC_SOCIAL_APP_HOST,
  SOCIAL_APP_URL: process.env.EXPO_PUBLIC_SOCIAL_APP_URL,
  SOCIAL_EMBED_SERVICE: process.env.EXPO_PUBLIC_SOCIAL_EMBED_SERVICE,
  SOCIAL_HELP_DESK_URL: process.env.EXPO_PUBLIC_SOCIAL_HELP_DESK_URL,
  SOCIAL_POLICY_BASE_URL: process.env.EXPO_PUBLIC_SOCIAL_POLICY_BASE_URL,
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
    const envKeyName = InternalToEnvName[key]
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
    const jsonValue = json[key]
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

const systemEnvs = (Constants?.expoConfig?.extra || {})['env-config']
const systemEnvContents = (Constants?.expoConfig?.extra || {})['env-content']

// The defaults as bluesky originally ships them in social-app
const BLUESKY_CONFIG: EnvConfig = {
  APPVIEW_URL: 'https://api.bsky.app',
  BSKY_SERVICE: 'https://bsky.social',
  GIF_HOST: 't.gifs.bsky.app',
  HELP_DESK_URL: `https://blueskyweb.zendesk.com/hc/${HELP_DESK_LANG}`,
  LINK_HOST: 'https://go.bsky.app',
  OGCARD_URL: `https://ogcard.cdn.bsky.app`,
  POLICY_BASE_URL: 'https://bsky.social/about/support',
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
  atproto_accounts: {
    follow: {},
  },
  onboarding: {
    auto_follow_accounts: ['did:plc:z72i7hdynmk6r22z27h6tvur'],
  },
  feeds: {
    named: {
      discover:
        'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot',
      video:
        'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/thevids',
    },
    recommended: {
      discover: {
        type: 'feed',
        value:
          'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot',
        pinned: true,
      },
      timeline: {type: 'timeline', value: 'following', pinned: true},
      video: {
        type: 'feed',
        value:
          'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/thevids',
        pinned: true,
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
    video: [
      'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/thevids',
      'at://did:plc:yofh3kx63drvfljkibw5zuxo/app.bsky.feed.generator/thevids',
    ],
    feedback_feeds: [
      'feedgen|at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot',
      'feedgen|at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/thevids',
      'feedgen|at://did:plc:yofh3kx63drvfljkibw5zuxo/app.bsky.feed.generator/whats-hot',
      'feedgen|at://did:plc:yofh3kx63drvfljkibw5zuxo/app.bsky.feed.generator/thevids',
    ],
    default_feeds: {
      'whats-hot':
        'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot',
      thevids:
        'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/thevids',
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
      video:
        'at://did:plc:yofh3kx63drvfljkibw5zuxo/app.bsky.feed.generator/thevids',
    },
    recommended: {
      ...BLUESKY_CONTENT.feeds.recommended,
      video: {
        type: 'feed',
        value:
          'at://did:plc:yofh3kx63drvfljkibw5zuxo/app.bsky.feed.generator/thevids',
        pinned: true,
      },
    },
    video: [
      'at://did:plc:yofh3kx63drvfljkibw5zuxo/app.bsky.feed.generator/thevids',
    ],
    default_feeds: {
      'whats-hot':
        'at://did:plc:yofh3kx63drvfljkibw5zuxo/app.bsky.feed.generator/whats-hot',
      thevids:
        'at://did:plc:yofh3kx63drvfljkibw5zuxo/app.bsky.feed.generator/thevids',
    },
  },
}

// The defaults are only different for some items on staging
const BLUESKY_STAGING_CONFIG: EnvConfig = {
  APPVIEW_URL: BLUESKY_CONFIG.APPVIEW_URL,
  BSKY_SERVICE: 'https://staging.bsky.dev',
  GIF_HOST: BLUESKY_CONFIG.GIF_HOST,
  HELP_DESK_URL: BLUESKY_CONFIG.HELP_DESK_URL,
  LINK_HOST: BLUESKY_CONFIG.LINK_HOST,
  OGCARD_URL: BLUESKY_CONFIG.OGCARD_URL,
  POLICY_BASE_URL: 'https://staging.bsky.dev/about/support',
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
const PROCESS_ENV_CONFIG = envToConfig(processEnvConfigValues)
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

export const PRODUCTION_DOMAIN =
  systemEnvs.production?.SOCIAL_APP_HOST || 'bsky.app'
export const STAGING_DOMAIN = systemEnvs.staging?.SOCIAL_APP_HOST || null

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

function buildSystemToEnvContent(contentObj: any): EnvContent {
  // Convert build system content object to typed EnvContent
  if (!contentObj || typeof contentObj !== 'object') {
    return BLUESKY_CONTENT
  }
  return jsonToEnvContent(contentObj)
}

function fallbackContent(...contents: EnvContent[]): EnvContent {
  // Merge multiple content objects with later ones taking precedence
  function mergeContentObjects<T>(target: T, source: any): T {
    if (
      source === undefined ||
      source === null ||
      typeof target !== 'object' ||
      target === null ||
      Array.isArray(target)
    ) {
      return target
    }

    const result = {...target} as T

    if (
      typeof source === 'object' &&
      source !== null &&
      !Array.isArray(source)
    ) {
      for (const key in target) {
        if (source[key] !== undefined) {
          if (
            typeof target[key] === 'object' &&
            target[key] !== null &&
            !Array.isArray(target[key])
          ) {
            result[key] = mergeContentObjects(target[key], source[key])
          } else {
            result[key] = source[key]
          }
        }
      }
    }

    return result
  }

  let result = {...BLUESKY_CONTENT}
  for (const content of contents) {
    if (content) {
      result = mergeContentObjects(result, content)
    }
  }
  return result
}

// Build-time content configurations from build system
const PRODUCTION_CONTENT = buildSystemToEnvContent(
  systemEnvContents?.production,
)
const STAGING_CONTENT = buildSystemToEnvContent(systemEnvContents?.staging)
const DEVELOPMENT_CONTENT = fallbackContent(
  buildSystemToEnvContent(systemEnvContents?.development),
  PRODUCTION_CONTENT,
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
  empty: BLUESKY_CONTENT,
}

const location = window.location
const {protocol, host, hostname} = location || {
  protocol: undefined,
  host: undefined,
  hostname: undefined,
}
const isWeb = protocol === 'http' || protocol === 'https'
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

export function getStoredEnvConfig(): EnvConfig {
  const storedEnvConfig: EnvConfig = {...EMPTY_CONFIG}
  try {
    if (envConfigStorage) {
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
      const envConfig: EnvConfig = jsonToEnvConfig(
        json,
        DOMAIN_ENVCONFIGS.development,
        DOMAIN_ENVCONFIGS.production,
        DOMAIN_ENVCONFIGS.bluesky,
      )
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

function jsonToEnvContent(json: Record<string, any>): EnvContent {
  function mergeNestedContent<T>(
    jsonValue: any,
    defaultValue: T,
    path: string = '',
  ): T {
    // If jsonValue exists and matches the expected structure, use it
    if (jsonValue !== undefined && jsonValue !== null) {
      if (
        typeof defaultValue === 'object' &&
        defaultValue !== null &&
        !Array.isArray(defaultValue)
      ) {
        // Handle nested objects recursively
        const result = {} as T
        for (const key in defaultValue) {
          const currentPath = path ? `${path}.${key}` : key
          const nestedJsonValue = jsonValue[key]
          result[key] = mergeNestedContent(
            defaultValue[key],
            nestedJsonValue,
            currentPath,
          )
        }
        return result
      } else {
        // For primitive values, use jsonValue if it exists
        return jsonValue as T
      }
    }
    return defaultValue
  }

  return mergeNestedContent(json, BLUESKY_CONTENT)
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
      const envContent: EnvContent = jsonToEnvContent(json)
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

export function getStoredEnvContent(): EnvContent {
  try {
    if (envContentStorage) {
      const storedContentString = envContentStorage.get(['content'])
      if (storedContentString) {
        return JSON.parse(storedContentString) as EnvContent
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
        return `${key}: ${envConfig[typedKey]}`
      })
      .join(indentJoin) +
    '}'
  )
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
    currentStoredContent = getStoredEnvContent()
    // Check if we have meaningful content (not just default empty structure)
    if (
      !currentStoredContent ||
      Object.keys(currentStoredContent.atproto_accounts.follow).length === 0
    ) {
      currentStoredContent = undefined
    }
  } catch (e) {
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
