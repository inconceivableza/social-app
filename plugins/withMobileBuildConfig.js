const {withDangerousMod} = require('@expo/config-plugins')
const fs = require('fs')
const path = require('path')

function withMobileBuildConfig(config) {
  // Generate iOS config
  config = withDangerousMod(config, [
    'ios',
    async config => {
      const projectRoot = config.modRequest.projectRoot
      await generateiOSConfig(projectRoot, config)

      // Copy missing assets for notification sounds into the main app bundle
      // This should not be needed but this plugin seems to have have affected Expo's automatic asset copying
      const platformProjectRoot = config.modRequest.platformProjectRoot
      const platformProjectName = config.modRequest.projectName
      const mainAppDir = path.join(platformProjectRoot, platformProjectName)

      const soundFiles = ['dm.aiff', 'dm.mp3', 'timer.aiff', 'timer.mp3']
      for (const soundFile of soundFiles) {
        const targetPath = path.join(mainAppDir, soundFile)
        if (!fs.existsSync(targetPath)) {
          const sourcePath = path.join(projectRoot, 'assets', soundFile)
          if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, targetPath)
            console.log(`Fixed missing notification sound: ${soundFile}`)
          }
        }
      }
      return config
    },
  ])

  // Generate Android config
  config = withDangerousMod(config, [
    'android',
    async config => {
      const projectRoot = config.modRequest.projectRoot
      await generateAndroidConfig(projectRoot, config)
      return config
    },
  ])

  return config
}

// Helper functions for dynamic generation
function getSwiftType(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return '[String]'
    const firstElement = value[0]
    if (typeof firstElement === 'object' && firstElement !== null) {
      return '[[String: Any]]'
    }
    return '[String]'
  }
  if (typeof value === 'boolean') return 'Bool'
  if (typeof value === 'number')
    return Number.isInteger(value) ? 'Int' : 'Double'
  return 'String'
}

function getKotlinType(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return 'List<String>'
    const firstElement = value[0]
    if (typeof firstElement === 'object' && firstElement !== null) {
      return 'List<Map<String, Any>>'
    }
    return 'List<String>'
  }
  if (typeof value === 'boolean') return 'Boolean'
  if (typeof value === 'number')
    return Number.isInteger(value) ? 'Int' : 'Double'
  return 'String'
}

function formatSwiftValue(value) {
  if (value === null || value === undefined) {
    return '""'
  }
  if (typeof value === 'string') {
    return `"${value.replace(/"/g, '\\"')}"`
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (typeof value === 'number') {
    return value.toString()
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    if (typeof value[0] === 'object' && value[0] !== null) {
      // Array of objects
      const formattedObjects = value.map(obj => {
        const pairs = Object.entries(obj).map(
          ([k, v]) => `"${k}": ${formatSwiftValue(v)}`,
        )
        return `[${pairs.join(', ')}]`
      })
      return `[${formattedObjects.join(', ')}]`
    } else {
      // Array of primitives
      const formattedItems = value.map(item => formatSwiftValue(item))
      return `[${formattedItems.join(', ')}]`
    }
  }
  return '""'
}

function formatKotlinValue(value) {
  if (value === null || value === undefined) {
    return '""'
  }
  if (typeof value === 'string') {
    return `"${value.replace(/"/g, '\\"')}"`
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (typeof value === 'number') {
    return value.toString()
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return 'listOf()'
    if (typeof value[0] === 'object' && value[0] !== null) {
      // Array of objects
      const formattedObjects = value.map(obj => {
        const pairs = Object.entries(obj).map(
          ([k, v]) => `"${k}" to ${formatKotlinValue(v)}`,
        )
        return `mapOf(${pairs.join(', ')})`
      })
      return `listOf(${formattedObjects.join(', ')})`
    } else {
      // Array of primitives
      const formattedItems = value.map(item => formatKotlinValue(item))
      return `listOf(${formattedItems.join(', ')})`
    }
  }
  return '""'
}

function generateSwiftStruct(name, obj, indent = '    ') {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return ''
  }

  const structName = name.charAt(0).toUpperCase() + name.slice(1)
  let result = `${indent}struct ${structName} {\n`

  // Generate nested structs first
  const nestedStructs = []
  Object.entries(obj).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      nestedStructs.push(generateSwiftStruct(key, value, indent + '    '))
    }
  })

  // Add properties
  Object.entries(obj).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Reference to nested struct
      const nestedStructName = key.charAt(0).toUpperCase() + key.slice(1)
      result += `${indent}    let ${key} = ${nestedStructName}()\n`
    } else {
      // Direct property
      const swiftType = getSwiftType(value)
      const swiftValue = formatSwiftValue(value)
      result += `${indent}    let ${key}: ${swiftType} = ${swiftValue}\n`
    }
  })

  // Add nested struct definitions
  if (nestedStructs.length > 0) {
    result += '\n'
    result += nestedStructs.join('\n')
  }

  result += `${indent}}\n`
  return result
}

function generateKotlinObject(name, obj, indent = '    ') {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return ''
  }

  const objectName = name.charAt(0).toUpperCase() + name.slice(1)
  let result = `${indent}object ${objectName} {\n`

  // First, generate all nested objects (define them before they're referenced)
  const nestedObjects = []
  Object.entries(obj).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      nestedObjects.push(generateKotlinObject(key, value, indent + '    '))
    }
  })

  // Add nested objects first
  if (nestedObjects.length > 0) {
    result += nestedObjects.join('\n') + '\n'
  }

  // Then generate properties that reference the nested objects
  Object.entries(obj).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Reference to nested object (now defined above)
      const nestedObjectName = key.charAt(0).toUpperCase() + key.slice(1)
      result += `${indent}    val ${key} = ${nestedObjectName}\n`
    } else {
      // Direct property
      const kotlinType = getKotlinType(value)
      const kotlinValue = formatKotlinValue(value)
      if (typeof value === 'string' || Array.isArray(value)) {
        result += `${indent}    val ${key}: ${kotlinType} = ${kotlinValue}\n`
      } else {
        result += `${indent}    const val ${key}: ${kotlinType} = ${kotlinValue}\n`
      }
    }
  })

  result += `${indent}}\n`
  return result
}

async function generateiOSConfig(projectRoot, config) {
  const {branding, 'env-config': envConfig} = config.extra || {}
  const currentEnv = process.env.NODE_ENV || 'production'
  const environmentConfig = envConfig?.[currentEnv] || {}

  // Strip EXPO_PUBLIC_ prefix from envConfig keys
  const processedEnvConfig = {}
  Object.entries(environmentConfig).forEach(([key, value]) => {
    const newKey = key.startsWith('EXPO_PUBLIC_')
      ? key.replace('EXPO_PUBLIC_', '')
      : key
    processedEnvConfig[newKey] = value
  })

  const configData = {
    branding: branding || {},
    envConfig: processedEnvConfig,
  }

  // Generate Swift structs dynamically
  let swiftConfig = `
// Auto-generated configuration from app.config.js
import Foundation

struct MobileBuildConfig {
    static let branding = Branding()
    static let envConfig = EnvConfig()

${generateSwiftStruct('branding', configData.branding)}
${generateSwiftStruct('envConfig', configData.envConfig)}
}
`

  // Write to iOS modules and ios directories
  const iosConfigPaths = [
    'modules/BlueskyClip/MobileBuildConfig.swift',
    'modules/BlueskyNSE/MobileBuildConfig.swift',
    'modules/Share-with-Bluesky/MobileBuildConfig.swift',
    'modules/expo-bluesky-swiss-army/ios/SharedPrefs/MobileBuildConfig.swift',
    'modules/expo-background-notification-handler/ios/MobileBuildConfig.swift',
    'ios/BlueskyClip/MobileBuildConfig.swift',
    'ios/BlueskyNSE/MobileBuildConfig.swift',
    'ios/Share-with-Bluesky/MobileBuildConfig.swift',
  ]

  for (const relativePath of iosConfigPaths) {
    const fullPath = path.join(projectRoot, relativePath)
    const dir = path.dirname(fullPath)

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {recursive: true})
    }

    fs.writeFileSync(fullPath, swiftConfig)
  }

  console.log('Generated iOS MobileBuildConfig for:', iosConfigPaths)
}

async function generateAndroidConfig(projectRoot, config) {
  const {branding, 'env-config': envConfig} = config.extra || {}
  const currentEnv = process.env.NODE_ENV || 'production'
  const environmentConfig = envConfig?.[currentEnv] || {}

  // Strip EXPO_PUBLIC_ prefix from envConfig keys
  const processedEnvConfig = {}
  Object.entries(environmentConfig).forEach(([key, value]) => {
    const newKey = key.startsWith('EXPO_PUBLIC_')
      ? key.replace('EXPO_PUBLIC_', '')
      : key
    processedEnvConfig[newKey] = value
  })

  const configData = {
    branding: branding || {},
    envConfig: processedEnvConfig,
  }

  // Define Android modules with their correct package names
  const androidModules = [
    {
      path: 'modules/expo-bluesky-swiss-army/android/src/main/java/expo/modules/blueskyswissarmy/MobileBuildConfig.kt',
      packageName: 'expo.modules.blueskyswissarmy',
    },
    {
      path: 'modules/expo-background-notification-handler/android/src/main/java/expo/modules/backgroundnotificationhandler/MobileBuildConfig.kt',
      packageName: 'expo.modules.backgroundnotificationhandler',
    },
    {
      path: 'modules/expo-receive-android-intents/android/src/main/java/xyz/blueskyweb/app/exporeceiveandroidintents/MobileBuildConfig.kt',
      packageName: 'xyz.blueskyweb.app.exporeceiveandroidintents',
    },
  ]

  // Generate and write config for each module
  for (const module of androidModules) {
    // Generate Kotlin objects dynamically with correct package
    const kotlinConfig = `
// Auto-generated configuration from app.config.js
package ${module.packageName}

object MobileBuildConfig {
${generateKotlinObject('branding', configData.branding)}
${generateKotlinObject('envConfig', configData.envConfig)}

    val branding = Branding
    val envConfig = EnvConfig
}
`

    const fullPath = path.join(projectRoot, module.path)
    const dir = path.dirname(fullPath)

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {recursive: true})
    }

    fs.writeFileSync(fullPath, kotlinConfig)
  }

  const generatedPaths = androidModules.map(m => m.path)
  console.log('Generated Android MobileBuildConfig for:', generatedPaths)
}

module.exports = withMobileBuildConfig
