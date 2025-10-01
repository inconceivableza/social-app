import {timeout} from '#/lib/async/timeout'
import {logger} from '#/logger'
import {clearStorage} from '#/state/persisted'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function reload(reason?: string) {
  window.location.reload()
}

export function checkCanReload(): Boolean {
  return Boolean(window.location)
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
