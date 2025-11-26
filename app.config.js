const pkg = require('./package.json')
const dotenvx = require('@dotenvx/dotenvx')
const fs = require('node:fs')
const path = require('node:path')

const blueskyBranding = {
  code: {
    app_slug_scheme: 'bluesky',
    apple_groups: 'group.app.bsky',
    apple_team_id: 'B3LX46C5HS',
    chat_api_did: 'did:web:api.bsky.chat#bsky_chat',
    // these ios_${plugin}_name variables are not to set the target name (which is the source directory) but the suffix to the web_package_id used for the bundleId
    ios_clip_name: 'BlueskyClip',
    ios_nse_name: 'BlueskyNSE',
    ios_share_with_name: 'Share-with-Bluesky',
    expo_project_owner: 'blueskysocial',
    expo_project_id: '87ab4766-b66c-489c-98ca-65e740fa205b',
    google_service_project_name: 'blueskyweb',
    sentry_project_organization: 'blueskyweb',
    updates_url: 'https://updates.bsky.app/manifest',
    web_bundle_name: 'bskyweb',
    web_package_id: 'xyz.blueskyweb.app',
    web_package_path: 'xyz/blueskyweb',
  },
  naming: {
    app_name: 'Bluesky',
    spoken_name: 'Blue Sky',
  },
  styling: {
    additional_color_defs: [],
    android_splash_background_color_dark: '#402911',
    android_splash_background_color_light: '#e88627',
    background_color: '#E88627',
    ios_splash_background_color_dark: '#371f06',
    map_color_names: [],
  },
  verbage: {
    app_description: 'the social internet',
    app_emoji: '🦋',
    profile_description_placeholder: 'e.g. Artist, dog-lover, and avid reader.',
    post_prompt: "What's up?",
  },
}

module.exports = function (_config) {
  /**
   * App version number. Should be incremented as part of a release cycle.
   */
  const VERSION = pkg.version

  /**
   * Uses built-in Expo env vars
   *
   * @see https://docs.expo.dev/build-reference/variables/#built-in-environment-variables
   */
  const PLATFORM = process.env.EAS_BUILD_PLATFORM

  const IS_TESTFLIGHT = process.env.EXPO_PUBLIC_ENV === 'testflight'
  const IS_PREVIEW = process.env.EXPO_PUBLIC_ENV === 'preview'
  const IS_PRODUCTION = process.env.EXPO_PUBLIC_ENV === 'production'
  const IS_DEV = !(IS_TESTFLIGHT || IS_PREVIEW || IS_PRODUCTION)
  const USE_LOCAL_CERTS = !IS_PRODUCTION

  const defaultEnvPath = __dirname
  function ifExists(pathname) {
    return fs.existsSync(pathname) ? pathname : null
  }
  function findExisting(filename) {
    return ifExists(path.join(defaultEnvPath, filename))
      ? path.join(defaultEnvPath, filename)
      : null
  }

  const brandingPath = findExisting(path.join('conf', 'branding.json'))
  const branding = brandingPath
    ? JSON.parse(fs.readFileSync(brandingPath).toString('utf-8'))
    : blueskyBranding

  const envFilenames = {
    production: '.env.production',
    staging: '.env.test',
    development: '.env',
  }
  const envConfigs = Object.fromEntries(
    Object.entries(envFilenames).map(([profileName, envBasename]) => {
      const envFilename = findExisting(envBasename)
      if (envFilename === null) {
        console.warn(envBasename, 'not found')
      }
      const envSource = envFilename
        ? fs.readFileSync(envFilename).toString('utf-8')
        : ''
      const envValues = envSource
        ? dotenvx.parse(envSource, {processEnv: {}})
        : {}
      return [profileName, {envFilename, profileName, ...envValues}]
    }),
  )

  const envContentFilenames = {
    production: 'env-content.production.json',
    staging: 'env-content.test.json',
    development: 'env-content.json',
  }
  const envContentConfigs = Object.fromEntries(
    Object.entries(envContentFilenames).map(
      ([profileName, contentBasename]) => {
        const contentFilename = findExisting(
          path.join(defaultEnvPath, 'submodules', 'atproto', contentBasename),
        )
        const contentSource = contentFilename
          ? fs.readFileSync(contentFilename).toString('utf-8')
          : '{}'
        let contentValues = {}
        try {
          contentValues = JSON.parse(contentSource)
        } catch (e) {
          console.warn(
            `Failed to parse env-content file ${contentBasename}:`,
            e,
          )
          contentValues = {}
        }
        return [profileName, {contentFilename, profileName, ...contentValues}]
      },
    ),
  )

  const getVariantPackageName = packageName => {
    if (IS_DEV) {
      return packageName + '.dev'
    } else if (IS_TESTFLIGHT) {
      return packageName + '.testflight'
    } else if (IS_PREVIEW) {
      return packageName + '.preview'
    }
    return packageName
  }

  const getVariantAppName = name => {
    if (IS_DEV) {
      return name + ' (Dev)'
    } else if (IS_TESTFLIGHT) {
      return name + ' (Testflight)'
    } else if (IS_PREVIEW) {
      return name + ' (Preview)'
    }
    return name
  }

  const getVariantGoogleServicesFilename = name => {
    // bluesky-selfhost-env's generate-social-env.py can auto-generate examples of these
    // it relies on the same naming as in getVariantPackageName above
    if (IS_DEV) {
      return name.replace('.json', '.development.json')
    } else if (IS_TESTFLIGHT) {
      return name.replace('.json', '.testflight.json')
    } else if (IS_PREVIEW) {
      return name.replace('.json', '.preview.json')
    } else if (IS_PRODUCTION) {
      return name.replace('.json', '.production.json')
    }
    return name
  }

  const getVariantIconFilename = name => {
    // these need to be generated by the branding toolkit, so avoid if not present
    const suffix = IS_DEV
      ? '.development'
      : IS_TESTFLIGHT
        ? '.testflight'
        : IS_PREVIEW
          ? '.preview'
          : null
    if (!suffix) return name
    const ext = path.extname(name)
    const variantName = name.replace(ext, suffix + ext, 1)
    return ifExists(variantName) ? variantName : name
  }

  const getAssociatedDomainConfig = function (envVarName, defaultValue) {
    const expoName = 'EXPO_PUBLIC_' + envVarName
    if (IS_PRODUCTION) return envConfigs.production[expoName] || defaultValue
    else if (IS_PREVIEW || IS_TESTFLIGHT)
      return envConfigs.staging[expoName] || defaultValue
    else return envConfigs.development[expoName] || defaultValue
  }
  // for side-by-side installs, this associates the app with the default target URLs
  const ASSOCIATED_SOCIAL_APP_HOST = getAssociatedDomainConfig(
    'SOCIAL_APP_HOST',
    'bsky.app',
  )
  const ASSOCIATED_LINK_HOST = getAssociatedDomainConfig(
    'LINK_HOST',
    'go.bsky.app',
  )
  const ASSOCIATED_DOMAINS = [
    'applinks:' + ASSOCIATED_SOCIAL_APP_HOST,
    'appclips:' + ASSOCIATED_SOCIAL_APP_HOST,
    'appclips:' + ASSOCIATED_LINK_HOST, // Allows App Clip to work when scanning QR codes
    // When testing local services, enter an ngrok (et al) domain here. It must use a standard HTTP/HTTPS port.
    ...(IS_DEV || IS_TESTFLIGHT ? [] : []),
  ]

  const UPDATES_CHANNEL = IS_TESTFLIGHT
    ? 'testflight'
    : IS_PRODUCTION
      ? 'production'
      : undefined
  const UPDATES_ENABLED = !!UPDATES_CHANNEL

  const USE_SENTRY = Boolean(process.env.SENTRY_AUTH_TOKEN)
  const basePackageName = getVariantPackageName(branding.code.web_package_id)

  return {
    expo: {
      version: VERSION,
      name: getVariantAppName(branding.naming.app_name),
      slug: branding.code.app_slug_scheme,
      scheme: branding.code.app_slug_scheme,
      owner: branding.code.expo_project_owner,
      runtimeVersion: {
        policy: 'appVersion',
      },
      icon: getVariantIconFilename(
        './assets/app-icons/ios_icon_default_next.png',
      ),
      userInterfaceStyle: 'automatic',
      primaryColor: '#1083fe',
      newArchEnabled: false,
      ios: {
        supportsTablet: false,
        bundleIdentifier: basePackageName,
        config: {
          usesNonExemptEncryption: false,
        },
        infoPlist: {
          UIBackgroundModes: ['remote-notification'],
          NSCameraUsageDescription:
            'Used for profile pictures, posts, and other kinds of content.',
          NSMicrophoneUsageDescription:
            'Used for posts and other kinds of content.',
          NSPhotoLibraryAddUsageDescription:
            'Used to save images to your library.',
          NSPhotoLibraryUsageDescription:
            'Used for profile pictures, posts, and other kinds of content',
          CFBundleSpokenName: branding.naming.spoken_name,
          CFBundleLocalizations: [
            'en',
            'an',
            'ast',
            'ca',
            'cy',
            'da',
            'de',
            'el',
            'eo',
            'es',
            'eu',
            'fi',
            'fr',
            'fy',
            'ga',
            'gd',
            'gl',
            'hi',
            'hu',
            'ia',
            'id',
            'it',
            'ja',
            'km',
            'ko',
            'ne',
            'nl',
            'pl',
            'pt-BR',
            'pt-PT',
            'ro',
            'ru',
            'sv',
            'th',
            'tr',
            'uk',
            'vi',
            'yue',
            'zh-Hans',
            'zh-Hant',
          ],
          UIDesignRequiresCompatibility: true,
        },
        associatedDomains: ASSOCIATED_DOMAINS,
        entitlements: {
          'com.apple.developer.kernel.increased-memory-limit': true,
          'com.apple.developer.kernel.extended-virtual-addressing': true,
          'com.apple.security.application-groups': [branding.code.apple_groups],
        },
        privacyManifests: {
          NSPrivacyCollectedDataTypes: [
            {
              NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeCrashData',
              NSPrivacyCollectedDataTypeLinked: false,
              NSPrivacyCollectedDataTypeTracking: false,
              NSPrivacyCollectedDataTypePurposes: [
                'NSPrivacyCollectedDataTypePurposeAppFunctionality',
              ],
            },
            {
              NSPrivacyCollectedDataType:
                'NSPrivacyCollectedDataTypePerformanceData',
              NSPrivacyCollectedDataTypeLinked: false,
              NSPrivacyCollectedDataTypeTracking: false,
              NSPrivacyCollectedDataTypePurposes: [
                'NSPrivacyCollectedDataTypePurposeAppFunctionality',
              ],
            },
            {
              NSPrivacyCollectedDataType:
                'NSPrivacyCollectedDataTypeOtherDiagnosticData',
              NSPrivacyCollectedDataTypeLinked: false,
              NSPrivacyCollectedDataTypeTracking: false,
              NSPrivacyCollectedDataTypePurposes: [
                'NSPrivacyCollectedDataTypePurposeAppFunctionality',
              ],
            },
          ],
          NSPrivacyAccessedAPITypes: [
            {
              NSPrivacyAccessedAPIType:
                'NSPrivacyAccessedAPICategoryFileTimestamp',
              NSPrivacyAccessedAPITypeReasons: ['C617.1', '3B52.1', '0A2A.1'],
            },
            {
              NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
              NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'],
            },
            {
              NSPrivacyAccessedAPIType:
                'NSPrivacyAccessedAPICategorySystemBootTime',
              NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
            },
            {
              NSPrivacyAccessedAPIType:
                'NSPrivacyAccessedAPICategoryUserDefaults',
              NSPrivacyAccessedAPITypeReasons: ['CA92.1', '1C8F.1'],
            },
          ],
        },
      },
      androidStatusBar: {
        barStyle: 'light-content',
      },
      // Dark nav bar in light mode is better than light nav bar in dark mode
      androidNavigationBar: {
        barStyle: 'light-content',
      },
      android: {
        icon: getVariantIconFilename(
          './assets/app-icons/android_icon_default_next.png',
        ),
        adaptiveIcon: {
          foregroundImage: getVariantIconFilename(
            './assets/icon-android-foreground.png',
          ),
          monochromeImage: getVariantIconFilename(
            './assets/icon-android-foreground.png',
          ),
          backgroundImage: './assets/icon-android-background.png',
          backgroundColor: branding.styling.background_color,
        },
        googleServicesFile: getVariantGoogleServicesFilename(
          './google-services.json',
        ),
        package: basePackageName,
        intentFilters: [
          {
            action: 'VIEW',
            autoVerify: true,
            data: [
              {
                scheme: 'https',
                host: ASSOCIATED_SOCIAL_APP_HOST,
              },
              IS_DEV && {
                scheme: 'http',
                host: 'localhost:19006',
              },
            ],
            category: ['BROWSABLE', 'DEFAULT'],
          },
        ],
      },
      web: {
        favicon: getVariantIconFilename('./assets/favicon.png'),
      },
      updates: {
        url: branding.code.updates_url,
        enabled: branding.code.updates_url && UPDATES_ENABLED,
        fallbackToCacheTimeout: 30000,
        codeSigningCertificate: UPDATES_ENABLED
          ? './code-signing/certificate.pem'
          : undefined,
        codeSigningMetadata: UPDATES_ENABLED
          ? {
              keyid: 'main',
              alg: 'rsa-v1_5-sha256',
            }
          : undefined,
        checkAutomatically: 'NEVER',
        channel: UPDATES_CHANNEL,
      },
      plugins: [
        'expo-video',
        'expo-localization',
        'expo-web-browser',
        [
          'react-native-edge-to-edge',
          {android: {enforceNavigationBarContrast: false}},
        ],
        USE_SENTRY && [
          '@sentry/react-native/expo',
          {
            organization: branding.code.sentry_project_organization,
            project: 'app',
            url: 'https://sentry.io',
          },
        ],
        [
          'expo-build-properties',
          {
            ios: {
              deploymentTarget: '15.1',
              buildReactNativeFromSource: true,
            },
            android: {
              compileSdkVersion: 35,
              targetSdkVersion: 35,
              buildToolsVersion: '35.0.0',
            },
          },
        ],
        [
          'expo-notifications',
          {
            icon: getVariantIconFilename(
              './assets/icon-android-notification.png',
            ),
            color: '#1185fe',
            sounds:
              PLATFORM === 'ios'
                ? ['assets/dm.aiff', 'assets/timer.aiff']
                : ['assets/dm.mp3', 'assets/timer.mp3'],
          },
        ],
        'react-native-compressor',
        [
          '@bitdrift/react-native',
          {
            networkInstrumentation: true,
          },
        ],
        './plugins/starterPackAppClipExtension/withStarterPackAppClip.js',
        './plugins/withGradleJVMHeapSizeIncrease.js',
        './plugins/withAndroidManifestLargeHeapPlugin.js',
        './plugins/withAndroidManifestFCMIconPlugin.js',
        './plugins/withAndroidManifestIntentQueriesPlugin.js',
        './plugins/withAndroidStylesAccentColorPlugin.js',
        './plugins/withAndroidDayNightThemePlugin.js',
        './plugins/withAndroidNoJitpackPlugin.js',
        USE_LOCAL_CERTS && ['./plugins/withAndroidUserInstalledCerts.js'],
        './plugins/shareExtension/withShareExtensions.js',
        './plugins/notificationsExtension/withNotificationsExtension.js',
        './plugins/withMobileBuildConfig.js',
        [
          'expo-font',
          {
            fonts: [
              './assets/fonts/inter/InterVariable.woff2',
              './assets/fonts/inter/InterVariable-Italic.woff2',
              // Android only
              './assets/fonts/inter/Inter-Regular.otf',
              './assets/fonts/inter/Inter-Italic.otf',
              './assets/fonts/inter/Inter-Medium.otf',
              './assets/fonts/inter/Inter-MediumItalic.otf',
              './assets/fonts/inter/Inter-SemiBold.otf',
              './assets/fonts/inter/Inter-SemiBoldItalic.otf',
              './assets/fonts/inter/Inter-Bold.otf',
              './assets/fonts/inter/Inter-BoldItalic.otf',
            ],
          },
        ],
        [
          'expo-splash-screen',
          {
            ios: {
              enableFullScreenImage_legacy: true,
              backgroundColor: '#ffffff',
              image: getVariantIconFilename('./assets/splash.png'),
              resizeMode: 'cover',
              dark: {
                enableFullScreenImage_legacy: true,
                backgroundColor:
                  branding.styling.ios_splash_background_color_dark,
                image: getVariantIconFilename('./assets/splash-dark.png'),
                resizeMode: 'cover',
              },
            },
            android: {
              backgroundColor:
                branding.styling.android_splash_background_color_light,
              image: getVariantIconFilename('./assets/splash-android-icon.png'),
              imageWidth: 150,
              dark: {
                backgroundColor:
                  branding.styling.android_splash_background_color_dark,
                image: getVariantIconFilename(
                  './assets/splash-android-icon-dark.png',
                ),
                imageWidth: 150,
              },
            },
          },
        ],
        [
          '@mozzius/expo-dynamic-app-icon',
          {
            /**
             * Default set
             */
            default_light: {
              ios: getVariantIconFilename(
                './assets/app-icons/ios_icon_default_light.png',
              ),
              android: getVariantIconFilename(
                './assets/app-icons/android_icon_default_light.png',
              ),
              prerendered: true,
            },
            default_dark: {
              ios: getVariantIconFilename(
                './assets/app-icons/ios_icon_default_dark.png',
              ),
              android: getVariantIconFilename(
                './assets/app-icons/android_icon_default_dark.png',
              ),
              prerendered: true,
            },
            next: {
              ios: getVariantIconFilename(
                './assets/app-icons/ios_icon_default_next.png',
              ),
              android: getVariantIconFilename(
                './assets/app-icons/android_icon_default_next.png',
              ),
              prerendered: true,
            },

            /**
             * Bluesky+ core set
             */
            core_aurora: {
              ios: getVariantIconFilename(
                './assets/app-icons/ios_icon_core_aurora.png',
              ),
              android: getVariantIconFilename(
                './assets/app-icons/android_icon_core_aurora.png',
              ),
              prerendered: true,
            },
            core_bonfire: {
              ios: getVariantIconFilename(
                './assets/app-icons/ios_icon_core_bonfire.png',
              ),
              android: getVariantIconFilename(
                './assets/app-icons/android_icon_core_bonfire.png',
              ),
              prerendered: true,
            },
            core_sunrise: {
              ios: getVariantIconFilename(
                './assets/app-icons/ios_icon_core_sunrise.png',
              ),
              android: getVariantIconFilename(
                './assets/app-icons/android_icon_core_sunrise.png',
              ),
              prerendered: true,
            },
            core_sunset: {
              ios: getVariantIconFilename(
                './assets/app-icons/ios_icon_core_sunset.png',
              ),
              android: getVariantIconFilename(
                './assets/app-icons/android_icon_core_sunset.png',
              ),
              prerendered: true,
            },
            core_midnight: {
              ios: getVariantIconFilename(
                './assets/app-icons/ios_icon_core_midnight.png',
              ),
              android: getVariantIconFilename(
                './assets/app-icons/android_icon_core_midnight.png',
              ),
              prerendered: true,
            },
            core_flat_blue: {
              ios: getVariantIconFilename(
                './assets/app-icons/ios_icon_core_flat_blue.png',
              ),
              android: getVariantIconFilename(
                './assets/app-icons/android_icon_core_flat_blue.png',
              ),
              prerendered: true,
            },
            core_flat_white: {
              ios: getVariantIconFilename(
                './assets/app-icons/ios_icon_core_flat_white.png',
              ),
              android: getVariantIconFilename(
                './assets/app-icons/android_icon_core_flat_white.png',
              ),
              prerendered: true,
            },
            core_flat_black: {
              ios: getVariantIconFilename(
                './assets/app-icons/ios_icon_core_flat_black.png',
              ),
              android: getVariantIconFilename(
                './assets/app-icons/android_icon_core_flat_black.png',
              ),
              prerendered: true,
            },
            core_classic: {
              ios: getVariantIconFilename(
                './assets/app-icons/ios_icon_core_classic.png',
              ),
              android: getVariantIconFilename(
                './assets/app-icons/android_icon_core_classic.png',
              ),
              prerendered: true,
            },
          },
        ],
        ['expo-screen-orientation', {initialOrientation: 'PORTRAIT_UP'}],
        ['expo-location'],
      ].filter(Boolean),
      extra: {
        eas: {
          build: {
            experimental: {
              ios: {
                appExtensions: [
                  {
                    targetName: 'Share-with-Bluesky',
                    bundleIdentifier: `${basePackageName}.${branding.code.ios_share_with_name}`,
                    entitlements: {
                      'com.apple.security.application-groups': [
                        branding.code.apple_groups,
                      ],
                    },
                  },
                  {
                    targetName: 'BlueskyNSE',
                    bundleIdentifier: `${basePackageName}.${branding.code.ios_nse_name}`,
                    entitlements: {
                      'com.apple.security.application-groups': [
                        branding.code.apple_groups,
                      ],
                    },
                  },
                  {
                    targetName: 'BlueskyClip',
                    bundleIdentifier: `${basePackageName}.${branding.code.ios_clip_name}`,
                  },
                ],
              },
            },
          },
          projectId: branding.code.expo_project_id,
        },
        branding: branding,
        'env-config': envConfigs,
        'env-content': envContentConfigs,
      },
    },
  }
}
