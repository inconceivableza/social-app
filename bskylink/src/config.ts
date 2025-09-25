import {envInt, envList, envStr} from '@atproto/common'
import * as fs from 'fs'
import * as path from 'path'
import {fileURLToPath} from 'url'

// default path for branding.json is parent directory of the src/dist directory
const defaultEnvPath = path.dirname(
  path.dirname(fileURLToPath(import.meta.url)),
)

function ifExists(pathname: string): string | null {
  return fs.existsSync(pathname) ? pathname : null
}

function findExisting(filename: string): string | null {
  return ifExists(path.join(defaultEnvPath, filename)) ? filename : null
}

interface Branding {
  code: {
    apple_team_id?: string
    web_package_id?: string
    ios_clip_name?: string
    [key: string]: any
  }
  atproto_accounts: object | null
  naming: object | null
  styling: object | null
  verbage: object | null
}

function readBranding(): Branding {
  const brandingPath = findExisting('branding.json')
  return brandingPath
    ? JSON.parse(fs.readFileSync(brandingPath).toString('utf-8'))
    : {code: {}, atproto_accounts: {}, naming: {}, styling: {}, verbage: {}}
}

export type Config = {
  service: ServiceConfig
  db: DbConfig
}

export type ServiceConfig = {
  port: number
  version?: string
  hostnames: string[]
  appHostname: string
  appId: string
  appClipId: string
}

export type DbConfig = {
  url: string
  migrationUrl?: string
  pool: DbPoolConfig
  schema?: string
}

export type DbPoolConfig = {
  size: number
  maxUses: number
  idleTimeoutMs: number
}

export type Environment = {
  port?: number
  version?: string
  hostnames: string[]
  appId?: string
  appClipId?: string
  appHostname?: string
  dbPostgresUrl?: string
  dbPostgresMigrationUrl?: string
  dbPostgresSchema?: string
  dbPostgresPoolSize?: number
  dbPostgresPoolMaxUses?: number
  dbPostgresPoolIdleTimeoutMs?: number
}

export const readEnv = (): Environment => {
  const branding = readBranding()
  const teamId = branding.code?.apple_team_id || 'B3LX46C5HS'
  const packageId = branding.code?.web_package_id || 'xyz.blueskyweb.app'
  const clipName = branding.code?.ios_clip_name || 'BlueskyClip'
  const appId = `${teamId}.${packageId}`
  const appClipId = `${teamId}.${packageId}.${clipName}`
  return {
    port: envInt('LINK_PORT'),
    version: envStr('LINK_VERSION'),
    hostnames: envList('LINK_HOSTNAMES'),
    appHostname: envStr('LINK_APP_HOSTNAME'),
    appId: appId,
    appClipId: appClipId,
    dbPostgresUrl: envStr('LINK_DB_POSTGRES_URL'),
    dbPostgresMigrationUrl: envStr('LINK_DB_POSTGRES_MIGRATION_URL'),
    dbPostgresSchema: envStr('LINK_DB_POSTGRES_SCHEMA'),
    dbPostgresPoolSize: envInt('LINK_DB_POSTGRES_POOL_SIZE'),
    dbPostgresPoolMaxUses: envInt('LINK_DB_POSTGRES_POOL_MAX_USES'),
    dbPostgresPoolIdleTimeoutMs: envInt(
      'LINK_DB_POSTGRES_POOL_IDLE_TIMEOUT_MS',
    ),
  }
}

export const envToCfg = (env: Environment): Config => {
  const serviceCfg: ServiceConfig = {
    port: env.port ?? 3000,
    version: env.version,
    hostnames: env.hostnames,
    appId: env.appId || 'B3LX46C5HS.xyz.blueskyweb.app',
    appClipId: env.appClipId || 'B3LX46C5HS.xyz.blueskyweb.BlueskyClip',
    appHostname: env.appHostname || 'bsky.app',
  }
  if (!env.dbPostgresUrl) {
    throw new Error('Must configure postgres url (LINK_DB_POSTGRES_URL)')
  }
  const dbCfg: DbConfig = {
    url: env.dbPostgresUrl,
    migrationUrl: env.dbPostgresMigrationUrl,
    schema: env.dbPostgresSchema,
    pool: {
      idleTimeoutMs: env.dbPostgresPoolIdleTimeoutMs ?? 10000,
      maxUses: env.dbPostgresPoolMaxUses ?? Infinity,
      size: env.dbPostgresPoolSize ?? 10,
    },
  }
  return {
    service: serviceCfg,
    db: dbCfg,
  }
}
