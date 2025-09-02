import {DevSettings} from 'react-native'

export function reload(reason?: string) {
  DevSettings?.reload(reason)
}

export function checkCanReload(): Boolean {
  return Boolean(DevSettings) && Boolean(DevSettings.reload)
}

export const canReload = checkCanReload()
