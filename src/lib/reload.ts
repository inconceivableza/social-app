import {DevSettings} from 'react-native'

export function reload(reason?: string) {
  DevSettings?.reload(reason)
}

export function canReload(): Boolean {
  return Boolean(DevSettings) && Boolean(DevSettings.reload)
}
