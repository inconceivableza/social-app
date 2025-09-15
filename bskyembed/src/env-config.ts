import type {ImportMetaEnv} from './vite-env.d'

const isDevelopment = Object.hasOwn(import.meta, 'env')
  ? import.meta.env.DEV
  : false
const blueskyEnvConfig = {
  VITE_CARD_URL: 'https://ogcard.cdn.bsky.app',
  VITE_EMBED_URL: 'https://embed.bsky.app',
  VITE_LINK_URL: 'https://go.bsky.app',
  VITE_PUBLIC_APPVIEW_URL: 'https://public.api.bsky.app',
  VITE_SOCIAL_APP_ABOUT: 'https://bsky.social/about',
  VITE_SOCIAL_APP_HOST: 'bsky.app',
  VITE_SOCIAL_APP_NAME: 'Bluesky',
  VITE_SOCIAL_APP_URL: 'https://bsky.app',
}
function fallbackConfig(
  potentialValue: unknown,
  fallbackValue: string,
): string {
  if (typeof potentialValue !== 'string') return fallbackValue
  return potentialValue
}
const devEnvConfig = {
  VITE_CARD_URL: fallbackConfig(
    import.meta.env.VITE_CARD_URL,
    blueskyEnvConfig.VITE_CARD_URL,
  ),
  VITE_EMBED_URL: fallbackConfig(
    import.meta.env.VITE_EMBED_URL,
    blueskyEnvConfig.VITE_EMBED_URL,
  ),
  VITE_LINK_URL: fallbackConfig(
    import.meta.env.VITE_LINK_URL,
    blueskyEnvConfig.VITE_LINK_URL,
  ),
  VITE_PUBLIC_APPVIEW_URL: fallbackConfig(
    import.meta.env.VITE_PUBLIC_APPVIEW_URL,
    blueskyEnvConfig.VITE_PUBLIC_APPVIEW_URL,
  ),
  VITE_SOCIAL_APP_ABOUT: fallbackConfig(
    import.meta.env.VITE_SOCIAL_APP_ABOUT,
    blueskyEnvConfig.VITE_SOCIAL_APP_ABOUT,
  ),
  VITE_SOCIAL_APP_HOST: fallbackConfig(
    import.meta.env.VITE_SOCIAL_APP_HOST,
    blueskyEnvConfig.VITE_SOCIAL_APP_HOST,
  ),
  VITE_SOCIAL_APP_NAME: fallbackConfig(
    import.meta.env.VITE_SOCIAL_APP_NAME,
    blueskyEnvConfig.VITE_SOCIAL_APP_NAME,
  ),
  VITE_SOCIAL_APP_URL: fallbackConfig(
    import.meta.env.VITE_SOCIAL_APP_URL,
    blueskyEnvConfig.VITE_SOCIAL_APP_URL,
  ),
}

let configCache: ImportMetaEnv | null = null

function loadEnvConfig(): ImportMetaEnv {
  if (configCache) {
    return configCache
  }
  if (isDevelopment) {
    configCache = devEnvConfig
  } else {
    try {
      const request = new XMLHttpRequest()
      request.open('GET', '/env-config.json', false) // deliberately synchronous as needs to work like an import
      request.send()
      if (request.status != 200) {
        throw new Error(
          `Env-config fetch failed: ${request.status} ${request.statusText}`,
        )
      }
      configCache = JSON.parse(request.responseText) as ImportMetaEnv
    } catch (error) {
      console.error('Failed to load env-config:', error)
      // FIXME: not sure what this will do
      configCache = devEnvConfig
    }
  }
  if (configCache !== null) {
    return configCache
  } else {
    throw Error('Could not load env-config')
  }
}

export const envConfig = loadEnvConfig()

export function getEnvConfig(): ImportMetaEnv {
  const cfg = envConfig
  return cfg
}

export function getEnvConfigSync(): ImportMetaEnv {
  if (configCache) return configCache
  throw new Error('Config not loaded yet')
}

export function getCardUrl(): string {
  return getEnvConfigSync().VITE_CARD_URL
}

export function getEmbedUrl(): string {
  return getEnvConfigSync().VITE_EMBED_URL
}

export function getLinkUrl(): string {
  return getEnvConfigSync().VITE_LINK_URL
}

export function getPublicAppviewUrl(): string {
  return getEnvConfigSync().VITE_PUBLIC_APPVIEW_URL
}

export function getSocialAppAbout(): string {
  return getEnvConfigSync().VITE_SOCIAL_APP_ABOUT
}

export function getSocialAppHost(): string {
  return getEnvConfigSync().VITE_SOCIAL_APP_HOST
}

export function getSocialAppName(): string {
  return getEnvConfigSync().VITE_SOCIAL_APP_NAME
}

export function getSocialAppUrl(): string {
  return getEnvConfigSync().VITE_SOCIAL_APP_URL
}
