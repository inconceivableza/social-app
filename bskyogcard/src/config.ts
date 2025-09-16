import {envInt, envStr} from '@atproto/common'

export type Config = {
  service: ServiceConfig
}

export type ServiceConfig = {
  port: number
  version?: string
  appviewUrl: string
  originVerify?: string
  socialappName?: string
}

export type Environment = {
  port?: number
  version?: string
  appviewUrl?: string
  originVerify?: string
  socialappName?: string
}

export const readEnv = (): Environment => {
  return {
    port: envInt('CARD_PORT'),
    version: envStr('CARD_VERSION'),
    appviewUrl: envStr('CARD_APPVIEW_URL'),
    originVerify: envStr('CARD_ORIGIN_VERIFY'),
    socialappName: envStr('SOCIAL_APP_NAME'),
  }
}

export const envToCfg = (env: Environment): Config => {
  const serviceCfg: ServiceConfig = {
    port: env.port ?? 3000,
    version: env.version,
    appviewUrl: env.appviewUrl ?? 'https://api.bsky.app',
    originVerify: env.originVerify,
    socialappName: env.socialappName ?? 'Bluesky',
  }
  return {
    service: serviceCfg,
  }
}
