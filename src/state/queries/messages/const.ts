import {envConfig} from '#/lib/constants'

export const DM_SERVICE_HEADERS = {
  // DM service DID now loaded from env-config: DM_SERVICE_DID
  // This should also be moved out of branding.code.chat_api_did
  'atproto-proxy': `${envConfig.DM_SERVICE_DID}#bsky_chat`,
}
