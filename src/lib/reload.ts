import {DevSettings} from 'react-native'

import {timeout} from '#/lib/async/timeout'
import {logger} from '#/logger'
import {clearStorage} from '#/state/persisted'

export function reload(reason?: string) {
  DevSettings?.reload(reason)
}

export function checkCanReload(): Boolean {
  // the reload function exists but if __DEV__ isn't defined, it does nothing
  // See https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/Utilities/DevSettings.js
  return Boolean(DevSettings) && Boolean(DevSettings.reload) && __DEV__
}

export const canReload = checkCanReload()

export async function doDelayedReload(
  reason: string,
  infoMessage: string,
  warnMessage: string,
): Promise<void> {
  const reloadDelay = 3
  await clearStorage()
  if (canReload) {
    logger.info(`${infoMessage} in ${reloadDelay}...`)
    await timeout(reloadDelay * 1000)
    reload(reason)
  } else {
    logger.warn(warnMessage)
  }
}
