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

import {logger} from '#/logger'
import {env_config as envConfigStorage, type EnvConfig} from '#/storage'

export type {EnvConfig}

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
  GIF_SERVICE: '',
  HELP_DESK_URL: '',
  POLICY_BASE_URL: '',
  PREVIEW_LINK_META_PROXY: '',
  PUBLIC_BSKY_SERVICE: '',
  SOCIAL_APP_HOST: '',
  SOCIAL_APP_URL: '',
  SOCIAL_EMBED_SERVICE: '',
  STATUS_PAGE_URL: '',
  VIDEO_SERVICE: '',
  VIDEO_SERVICE_DID: '',
}

const InternalToEnvName: Record<string, string> = {
  APPVIEW_URL: 'EXPO_PUBLIC_ATP_APPVIEW_URL',
  BSKY_SERVICE: 'EXPO_PUBLIC_ATP_PDS_URL',
  GIF_SERVICE: 'EXPO_PUBLIC_GIF_SERVICE',
  HELP_DESK_URL: 'EXPO_PUBLIC_SOCIAL_HELP_DESK_URL',
  POLICY_BASE_URL: 'EXPO_PUBLIC_SOCIAL_POLICY_BASE_URL',
  PREVIEW_LINK_META_PROXY: 'EXPO_PUBLIC_PREVIEW_LINK_META_PROXY',
  PUBLIC_BSKY_SERVICE: 'EXPO_PUBLIC_ATP_PUBLIC_APPVIEW_URL',
  SOCIAL_APP_HOST: 'EXPO_PUBLIC_SOCIAL_APP_HOST', // plan to use to detect host match with env
  SOCIAL_APP_URL: 'EXPO_PUBLIC_SOCIAL_APP_URL',
  SOCIAL_EMBED_SERVICE: 'EXPO_PUBLIC_SOCIAL_EMBED_SERVICE',
  STATUS_PAGE_URL: 'EXPO_PUBLIC_STATUS_PAGE_URL',
  VIDEO_SERVICE: 'EXPO_PUBLIC_VIDEO_SERVICE',
  VIDEO_SERVICE_DID: 'EXPO_PUBLIC_VIDEO_SERVICE_DID',
}

const processEnvConfigValues: Record<string, string> = {
  ATP_APPVIEW_URL: process.env.EXPO_PUBLIC_ATP_APPVIEW_URL,
  ATP_PDS_HOST: process.env.EXPO_PUBLIC_ATP_PDS_HOST,
  ATP_PUBLIC_APPVIEW_URL: process.env.EXPO_PUBLIC_ATP_PUBLIC_APPVIEW_URL,
  CORS_ALLOWED_ORIGINS: process.env.EXPO_PUBLIC_CORS_ALLOWED_ORIGINS,
  GIF_SERVICE: process.env.EXPO_PUBLIC_GIF_SERVICE,
  LINK_HOST: process.env.EXPO_PUBLIC_LINK_HOST,
  OGCARD_URL: process.env.EXPO_PUBLIC_OGCARD_URL,
  PREVIEW_LINK_META_PROXY: process.env.EXPO_PUBLIC_PREVIEW_LINK_META_PROXY,
  SOCIAL_APP_HOST: process.env.EXPO_PUBLIC_SOCIAL_APP_HOST,
  SOCIAL_APP_URL: process.env.EXPO_PUBLIC_SOCIAL_APP_URL,
  SOCIAL_EMBED_SERVICE: process.env.EXPO_PUBLIC_SOCIAL_EMBED_SERVICE,
  SOCIAL_HELP_DESK_URL: process.env.EXPO_PUBLIC_SOCIAL_HELP_DESK_URL,
  SOCIAL_POLICY_BASE_URL: process.env.EXPO_PUBLIC_SOCIAL_POLICY_BASE_URL,
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

// The defaults as bluesky originally ships them in social-app
const BLUESKY_CONFIG: EnvConfig = {
  APPVIEW_URL: 'https://api.bsky.app',
  BSKY_SERVICE: 'https://bsky.social',
  GIF_SERVICE: 'https://gifs.bsky.app',
  HELP_DESK_URL: `https://blueskyweb.zendesk.com/hc/${HELP_DESK_LANG}`,
  POLICY_BASE_URL: 'https://bsky.social/about/support',
  PREVIEW_LINK_META_PROXY: 'https://cardyb.bsky.app/v1/extract?url=',
  PUBLIC_BSKY_SERVICE: 'https://public.api.bsky.app',
  SOCIAL_APP_HOST: 'bsky.app',
  SOCIAL_APP_URL: 'https://bsky.app',
  SOCIAL_EMBED_SERVICE: 'https://embed.bsky.app',
  STATUS_PAGE_URL: 'https://status.bsky.app/',
  VIDEO_SERVICE: 'https://video.bsky.app',
  VIDEO_SERVICE_DID: 'did:web:video.bsky.app',
}

// The defaults are only different for some items on staging
const BLUESKY_STAGING_CONFIG: EnvConfig = {
  APPVIEW_URL: BLUESKY_CONFIG.APPVIEW_URL,
  BSKY_SERVICE: 'https://staging.bsky.dev',
  GIF_SERVICE: BLUESKY_CONFIG.GIF_SERVICE,
  HELP_DESK_URL: BLUESKY_CONFIG.HELP_DESK_URL,
  POLICY_BASE_URL: 'https://staging.bsky.dev/about/support',
  PREVIEW_LINK_META_PROXY: 'https://cardyb.staging.bsky.dev/v1/extract?url=',
  PUBLIC_BSKY_SERVICE: BLUESKY_CONFIG.PUBLIC_BSKY_SERVICE,
  SOCIAL_APP_HOST: BLUESKY_CONFIG.SOCIAL_APP_HOST,
  SOCIAL_APP_URL: BLUESKY_CONFIG.SOCIAL_APP_URL,
  SOCIAL_EMBED_SERVICE: BLUESKY_CONFIG.SOCIAL_EMBED_SERVICE,
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

// NB there's a difference between a staging build and the staging domains
const DEFAULT_ENVCONFIG = __DEV__
  ? fallbackConfig(DEVELOPMENT_CONFIG, PRODUCTION_CONFIG, BLUESKY_CONFIG)
  : fallbackConfig(PRODUCTION_CONFIG, BLUESKY_CONFIG)

export function getStoredEnvConfig(): EnvConfig {
  const storedEnvConfig: EnvConfig = {...EMPTY_CONFIG}
  for (const key in EMPTY_CONFIG) {
    const typedKey = key as keyof EnvConfig
    storedEnvConfig[typedKey] = envConfigStorage.get([typedKey]) || ''
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

export async function fetchEnvConfig(server: string) {
  const serverUrl = URL.parse(server)
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
  logger.info(`Fetching environment config from ${serverUrl}`)
  try {
    const res = await fetch(`${serverUrl}env-config`)
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
    logger.error(`Failed to fetch ${serverUrl}: ${e}`)
  }
  return null
}

export function determineDomainEnvConfig(): EnvConfig {
  // determines the envConfig based on the domain name, if present (only on web)
  const location = window.location
  const {protocol, host, hostname} = location
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
  logger.warn('Falling back to default production environment config')
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

// TODO: how to load from the server on startup without bootstrapping issues
/*
async function getEnvConfig(): Promise<EnvConfig> {
  const staticEnvConfig = determineDomainEnvConfig()
  const fetchedEnvConfig = await fetchEnvConfig(location.toString())
  if (fetchedEnvConfig !== null) {
    return fetchedEnvConfig
  }
  return staticEnvConfig
}
*/

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
  const currentSocialHost = envConfigStorage.get(['SOCIAL_APP_HOST'])
  if (!currentSocialHost) {
    if (__DEV__) {
      logger.info('Loading dev environment, using local environment variables')
      setStoredEnvConfig(DOMAIN_ENVCONFIGS.development)
    } else {
      logger.info('Loading non-dev environment, using built-in values')
      setStoredEnvConfig(determineDomainEnvConfig())
    }
  } else {
    logger.info(`Environment Config already loaded with ${currentSocialHost}`)
  }
  logger.info(`Environment Config: ${JSON.stringify(getStoredEnvConfig())}`)
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

type Context = {
  envConfig: EnvConfig
  setEnvConfig: React.Dispatch<React.SetStateAction<EnvConfig>>
}

const context = React.createContext<Context>({
  envConfig: DEFAULT_ENVCONFIG,
  setEnvConfig: () => {},
})

export function Provider({children}: {children: React.ReactNode}) {
  beginResolveEnvConfig()
  const [envConfig, setEnvConfig] = React.useState(() => {
    const initial = getStoredEnvConfig()
    return initial
  })

  React.useEffect(() => {
    return onEnvConfigUpdate(newEnvConfig => {
      setEnvConfig(newEnvConfig!)
      setStoredEnvConfig(newEnvConfig)
    })
  }, [])

  const ctx = React.useMemo(() => {
    return {
      envConfig,
      setEnvConfig,
    }
  }, [envConfig, setEnvConfig])

  return <context.Provider value={ctx}>{children}</context.Provider>
}

export function useEnvConfig() {
  return React.useContext(context)
}
