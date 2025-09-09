import {DevSettings} from 'react-native'

export function reload(reason?: string) {
  DevSettings?.reload(reason)
}

export function checkCanReload(): Boolean {
  // the reload function exists but if __DEV__ isn't defined, it does nothing
  // See https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/Utilities/DevSettings.js
  return Boolean(DevSettings) && Boolean(DevSettings.reload) && __DEV__
}

export const canReload = checkCanReload()
