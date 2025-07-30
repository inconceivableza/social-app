import {IsValidHandle, validateServiceHandle} from '#/lib/strings/handles'

describe('handle validation', () => {
  const valid = [
    ['ali', 'pds.mysky.local.social'],
    ['alice', 'pds.mysky.local.social'],
    ['a-lice', 'pds.mysky.local.social'],
    ['a-----lice', 'pds.mysky.local.social'],
    ['123', 'pds.mysky.local.social'],
    ['123456789012345678', 'pds.mysky.local.social'],
    ['alice', 'custom-pds.com'],
    ['alice', 'my-custom-pds-with-long-name.social'],
    ['123456789012345678', 'my-custom-pds-with-long-name.social'],
  ]
  it.each(valid)(`should be valid: %s.%s`, (handle, service) => {
    const result = validateServiceHandle(handle, service)
    expect(result.overall).toEqual(true)
  })

  const invalid = [
    ['al', 'pds.mysky.local.social', 'frontLength'],
    ['-alice', 'pds.mysky.local.social', 'hyphenStartOrEnd'],
    ['alice-', 'pds.mysky.local.social', 'hyphenStartOrEnd'],
    ['%%%', 'pds.mysky.local.social', 'handleChars'],
    ['1234567890123456789', 'pds.mysky.local.social', 'frontLength'],
    [
      '1234567890123456789',
      'my-custom-pds-with-long-name.social',
      'frontLength',
    ],
    ['al', 'my-custom-pds-with-long-name.social', 'frontLength'],
    ['a'.repeat(300), 'toolong.com', 'totalLength'],
  ] satisfies [string, string, keyof IsValidHandle][]
  it.each(invalid)(
    `should be invalid: %s.%s due to %s`,
    (handle, service, expectedError) => {
      const result = validateServiceHandle(handle, service)
      expect(result.overall).toEqual(false)
      expect(result[expectedError]).toEqual(false)
    },
  )
})
