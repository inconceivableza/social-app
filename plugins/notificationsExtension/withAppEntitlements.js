const {withEntitlementsPlist} = require('@expo/config-plugins')

const withAppEntitlements = config => {
  // eslint-disable-next-line no-shadow
  return withEntitlementsPlist(config, async config => {
    config.modResults['com.apple.security.application-groups'] = [
      config.extra.branding.code.apple_groups,
    ]
    return config
  })
}

module.exports = {withAppEntitlements}
