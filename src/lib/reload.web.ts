// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function reload(reason?: string) {
  window.location.reload()
}

export function canReload(): Boolean {
  return Boolean(window.location)
}
