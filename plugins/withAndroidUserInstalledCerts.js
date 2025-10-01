const {AndroidConfig, withAndroidManifest} = require('@expo/config-plugins')
const {Paths} = require('@expo/config-plugins/build/android')
const path = require('path')
const fs = require('fs')

const withNetworkSecurityConfig = config => {
  return withAndroidManifest(config, async config => {
    const androidManifest = config.modResults
    const mainApplication =
      AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest)

    // Add the networkSecurityConfig attribute to the application tag
    mainApplication.$['android:networkSecurityConfig'] =
      '@xml/network_security_config'

    // Ensure the network_security_config.xml file is copied to the native project
    const src_file_path = path.join(__dirname, 'network_security_config.xml')
    const res_file_path = path.join(
      await Paths.getResourceFolderAsync(config.modRequest.projectRoot),
      'xml', // The 'xml' subfolder within 'res'
      'network_security_config.xml',
    )
    const res_dir = path.resolve(res_file_path, '..')
    if (!fs.existsSync(res_dir)) {
      fs.mkdirSync(res_dir)
    }
    fs.copyFileSync(src_file_path, res_file_path)

    return config
  })
}

module.exports = withNetworkSecurityConfig
