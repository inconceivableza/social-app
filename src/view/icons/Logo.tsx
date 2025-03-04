import React from 'react'
import {StyleSheet, TextProps} from 'react-native'
import Svg, {PathProps, SvgProps, Path} from 'react-native-svg'
import {Image} from 'expo-image'

import {colors} from '#/lib/styles'
import {useKawaiiMode} from '#/state/preferences/kawaii'

const ratio = 57 / 64

type Props = {
  fill?: PathProps['fill']
  style?: TextProps['style']
} & Omit<SvgProps, 'style'>

export const Logo = React.forwardRef(function LogoImpl(props: Props, ref) {
  const {fill, ...rest} = props
  const gradient = fill === 'sky'
  const styles = StyleSheet.flatten(props.style)
  const _fill = gradient ? 'url(#sky)' : fill || styles?.color || colors.orange1
  // @ts-ignore it's fiiiiine
  const size = parseInt(rest.width || 32)

  const isKawaii = useKawaiiMode()

  if (isKawaii) {
    return (
      <Image
        source={
          size > 100
            ? require('../../../assets/kawaii.png')
            : require('../../../assets/kawaii_smol.png')
        }
        accessibilityLabel="Foodios"
        accessibilityHint=""
        accessibilityIgnoresInvertColors
        style={[{height: size, aspectRatio: 1.4}]}
      />
    )
  }

  return (
    <Svg
      fill="none"
      // @ts-ignore it's fiiiiine
      ref={ref}
      viewBox="0 0 512 512"
      {...rest}
      style={[{width: size, height: size * ratio}, styles]}><Path id="logo" display="inline" fill={_fill} fillOpacity="1" stroke="none" strokeWidth="30.575" strokeLinejoin="round" strokeDasharray="none" strokeOpacity="1" d="m 182.61744,37.046636 c -2.3791,-3.6068 -5.3395,-7.9766 -5.7892,-12.3628 -0.3065,-2.9877 0.8078,-5.8023 2.7013,-8.0822 9.4796,-11.4115996 34.254,-15.2787996 48.6532,-16.3391996 3.8519,-0.4267 8.0601,-0.2294 11.9351,-0.1238 14.1813,0.3866 35.565,4.1986 45.6035,14.9569996 2.609,2.7959 4.9516,6.5065 4.6913,10.472 -0.3271,4.9913 -4.1087,8.6242 -7.6116,11.7321 l 30.4969,11.7769 c 28.7604,9.96 43.9447,15.7773 76.9277,32.9965 24.4015,16.7285 49.7737,29.903004 74.0937,46.084104 18.828,21.2438 -6.4379,44.3405 -22.8656,57.0104 18.3938,32.7049 28.9039,70.7341 24.5349,108.3826 -6.6168,72.5195 -58.8434,132.547 -119.7809,167.9138 -52.2459,23.4349 -166.7265,24.0038 -221.4156,0 -60.937598,-35.3668 -113.163498,-95.3943 -119.7809979,-167.9138 -4.36830001,-37.6485 6.1411999,-75.6777 24.5348999,-108.3826 -16.4277,-12.6699 -41.6936,-35.7666 -22.8650999,-57.0104 24.3188999,-16.1811 49.6923999,-29.355604 74.0931999,-46.084104 32.982798,-17.2192 48.167398,-23.0365 76.926798,-32.9965 z" /></Svg>
  )
})
