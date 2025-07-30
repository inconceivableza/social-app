import {describe, expect, it} from '@jest/globals'

import {
  isPossiblyAUrl,
  isTrustedUrl,
  linkRequiresWarning,
  splitApexDomain,
} from '../../../src/lib/strings/url-helpers'

describe('linkRequiresWarning', () => {
  type Case = [string, string, boolean]

  const cases: Case[] = [
    ['http://example.com', 'http://example.com', false],
    ['http://example.com', 'example.com', false],
    ['http://example.com', 'example.com/page', false],
    ['http://example.com', '', true],
    ['http://example.com', 'other.com', true],
    ['http://example.com', 'http://other.com', true],
    ['http://example.com', 'some label', true],
    ['http://example.com', 'example.com more', true],
    ['http://example.com', 'http://example.co', true],
    ['http://example.co', 'http://example.com', true],
    ['http://example.com', 'example.co', true],
    ['http://example.co', 'example.com', true],
    ['http://site.pages.dev', 'http://site.page', true],
    ['http://site.page', 'http://site.pages.dev', true],
    ['http://site.pages.dev', 'site.page', true],
    ['http://site.page', 'site.pages.dev', true],
    ['http://site.pages.dev', 'http://site.pages', true],
    ['http://site.pages', 'http://site.pages.dev', true],
    ['http://site.pages.dev', 'site.pages', true],
    ['http://site.pages', 'site.pages.dev', true],
    ['http://mysky.local.app/profile/bob.test/post/3kbeuduu7m22v', 'my post', false],
    ['https://mysky.local.social/profile/bob.test/post/3kbeuduu7m22v', 'my post', false],
    ['http://mysky.local.app/', 'bluesky', false],
    ['https://mysky.local.social/', 'bluesky', false],
    [
      'http://mysky.local.app/profile/bob.test/post/3kbeuduu7m22v',
      'http://mysky.local.app/profile/bob.test/post/3kbeuduu7m22v',
      false,
    ],
    [
      'https://mysky.local.social/profile/bob.test/post/3kbeuduu7m22v',
      'http://mysky.local.app/profile/bob.test/post/3kbeuduu7m22v',
      false,
    ],
    [
      'http://mysky.local.app/',
      'http://mysky.local.app/profile/bob.test/post/3kbeuduu7m22v',
      false,
    ],
    [
      'https://mysky.local.social/',
      'http://mysky.local.app/profile/bob.test/post/3kbeuduu7m22v',
      false,
    ],
    [
      'http://mysky.local.app/profile/bob.test/post/3kbeuduu7m22v',
      'https://google.com',
      true,
    ],
    [
      'https://mysky.local.social/profile/bob.test/post/3kbeuduu7m22v',
      'https://google.com',
      true,
    ],
    ['http://mysky.local.app/', 'https://google.com', true],
    ['https://mysky.local.social/', 'https://google.com', true],

    // case insensitive
    ['https://Example.com', 'example.com', false],
    ['https://example.com', 'Example.com', false],

    // bad uri inputs, default to true
    ['', '', true],
    ['example.com', 'example.com', true],
    ['/profile', 'Username', false],
    ['#', 'Show More', false],
    ['https://docs.mysky.local.app', 'https://docs.mysky.local.app', false],
    ['https://mysky.local.social/compose/intent?text=test', 'Compose a post', false],
  ]

  it.each(cases)(
    'given input uri %p and text %p, returns %p',
    (uri, text, expected) => {
      const output = linkRequiresWarning(uri, text)
      expect(output).toEqual(expected)
    },
  )
})

describe('isPossiblyAUrl', () => {
  type Case = [string, boolean]
  const cases: Case[] = [
    ['', false],
    ['text', false],
    ['some text', false],
    ['some text', false],
    ['some domain.com', false],
    ['domain.com', true],
    [' domain.com', true],
    ['domain.com ', true],
    [' domain.com ', true],
    ['http://domain.com', true],
    [' http://domain.com', true],
    ['http://domain.com ', true],
    [' http://domain.com ', true],
    ['https://domain.com', true],
    [' https://domain.com', true],
    ['https://domain.com ', true],
    [' https://domain.com ', true],
    ['http://domain.com/foo', true],
    ['http://domain.com stuff', true],
  ]

  it.each(cases)('given input uri %p, returns %p', (str, expected) => {
    const output = isPossiblyAUrl(str)
    expect(output).toEqual(expected)
  })
})

describe('splitApexDomain', () => {
  type Case = [string, string, string]
  const cases: Case[] = [
    ['', '', ''],
    ['example.com', '', 'example.com'],
    ['foo.example.com', 'foo.', 'example.com'],
    ['foo.bar.example.com', 'foo.bar.', 'example.com'],
    ['example.co.uk', '', 'example.co.uk'],
    ['foo.example.co.uk', 'foo.', 'example.co.uk'],
    ['example.nonsense', '', 'example.nonsense'],
    ['foo.example.nonsense', '', 'foo.example.nonsense'],
    ['foo.bar.example.nonsense', '', 'foo.bar.example.nonsense'],
    ['example.com.example.com', 'example.com.', 'example.com'],
  ]

  it.each(cases)(
    'given input uri %p, returns %p,%p',
    (str, expected1, expected2) => {
      const output = splitApexDomain(str)
      expect(output[0]).toEqual(expected1)
      expect(output[1]).toEqual(expected2)
    },
  )
})

describe('isTrustedUrl', () => {
  const cases = [
    ['#', true],
    ['#profile', true],
    ['/', true],
    ['/profile', true],
    ['/profile/', true],
    ['/profile/bob.test', true],
    ['https://mysky.local.social', true],
    ['https://mysky.local.social/', true],
    ['https://mysky.local.social/profile/bob.test', true],
    ['https://www.mysky.local.app', true],
    ['https://www.mysky.local.app/', true],
    ['https://docs.mysky.local.app', true],
    ['https://pds.mysky.local.social', true],
    ['https://pds.mysky.local.social/blog', true],
    ['https://blueskyweb.xyz', true],
    ['https://blueskyweb.zendesk.com', true],
    ['http://mysky.local.app', true],
    ['http://pds.mysky.local.social', true],
    ['http://blueskyweb.xyz', true],
    ['http://blueskyweb.zendesk.com', true],
    ['https://google.com', false],
    ['https://docs.google.com', false],
    ['https://google.com/#', false],
    ['https://blueskywebxzendesk.com', false],
  ]

  it.each(cases)('given input uri %p, returns %p', (str, expected) => {
    const output = isTrustedUrl(str)
    expect(output).toEqual(expected)
  })
})
