import type {ImportMetaEnv} from './vite-env.d'

// Minimal EnvContent type for bskyembed (only what we need)
type EnvContent = {
  links: {
    about: string
  }
  embed: {
    default_post: {
      profile_name: string
      did: string
      record_type?: string
      post_id: string
    }
  }
}

const isDevelopment = Object.hasOwn(import.meta, 'env')
  ? import.meta.env.DEV
  : false
const blueskyEnvConfig = {
  VITE_APPVIEW_URL: 'https://api.bsky.app',
  VITE_CARD_URL: 'https://ogcard.cdn.bsky.app',
  VITE_EMBED_URL: 'https://embed.bsky.app',
  VITE_LINK_URL: 'https://go.bsky.app',
  VITE_PUBLIC_APPVIEW_URL: 'https://public.api.bsky.app',
  VITE_SOCIAL_APP_HOST: 'bsky.app',
  VITE_SOCIAL_APP_NAME: 'Bluesky',
  VITE_SOCIAL_APP_URL: 'https://bsky.app',
}

const blueskyEnvContent: EnvContent = {
  links: {
    about: 'https://bsky.social/about',
  },
  embed: {
    default_post: {
      profile_name: 'emilyliu.me',
      did: 'did:plc:vjug55kidv6sye7ykr5faxxn',
      post_id: '3jzn6g7ixgq2y',
    },
  },
}

function fallbackConfig(
  potentialValue: unknown,
  fallbackValue: string,
): string {
  if (typeof potentialValue !== 'string') return fallbackValue
  return potentialValue
}
const devEnvConfig = {
  VITE_APPVIEW_URL: fallbackConfig(
    import.meta.env.VITE_APPVIEW_URL,
    blueskyEnvConfig.VITE_APPVIEW_URL,
  ),
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
let contentCache: EnvContent | null = null

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

function loadEnvContent(): EnvContent {
  if (contentCache) {
    return contentCache
  }
  if (isDevelopment) {
    contentCache = blueskyEnvContent
  } else {
    try {
      // Get the AppView URL from the already loaded config
      const config = configCache || loadEnvConfig()
      const appviewUrl = config.VITE_APPVIEW_URL
      const request = new XMLHttpRequest()
      request.open(
        'GET',
        `${appviewUrl}/.well-known/atproto-appview-env-content`,
        false,
      )
      request.send()
      if (request.status === 200) {
        contentCache = JSON.parse(request.responseText) as EnvContent
      } else {
        throw new Error('No env-content available from AppView or local')
      }
    } catch (error) {
      console.error('Failed to load env-content:', error)
      contentCache = blueskyEnvContent
    }
  }
  if (contentCache !== null) {
    return contentCache
  } else {
    throw Error('Could not load env-content')
  }
}

export const envConfig = loadEnvConfig()
export const envContent = loadEnvContent()

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
  return envContent.links.about
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

export function getAppviewUrl(): string {
  return getEnvConfigSync().VITE_APPVIEW_URL
}

export function getDefaultPost(): string {
  if (!contentCache) {
    throw new Error('Content not loaded yet')
  }
  const post = contentCache.embed.default_post
  return `${getSocialAppUrl()}/profile/${post.profile_name}/${post.record_type || 'post'}/${post.post_id}`
}

const componentTypeMap = {
  post: 'app.bsky.feed.post',
  recipePost: 'app.foodios.feed.recipePost',
}

export function getDefaultPostUri(): string {
  if (!contentCache) {
    throw new Error('Content not loaded yet')
  }
  const post = contentCache.embed.default_post
  const componentType =
    !post.record_type || post.record_type === 'post'
      ? componentTypeMap.post
      : post.record_type == 'recipePost'
        ? componentTypeMap.recipePost
        : null
  if (componentType === null) {
    throw new Error('Unknown record type')
  }
  return `at://${post.did}/${componentType}/${post.post_id}`
}
