import React from 'react'
import {StyleSheet, type TextProps} from 'react-native'
import Svg, {ClipPath, Defs, G, Path, Rect} from 'react-native-svg'
import {Image} from 'expo-image'

import {branding} from '#/lib/constants'
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
        accessibilityLabel={branding.naming.app_name}
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
      style={[{width: size, height: size * ratio}, styles]}>
      <Defs id="defs8">
        <ClipPath clipPathUnits="userSpaceOnUse" id="clipPath1">
          <Rect
            opacity="0.5"
            fill={_fill}
            strokeWidth="1.79104"
            id="rect2"
            width="1200"
            height="447.7612"
            x="1964.0001"
            y="918.18048"
          />
        </ClipPath>
      </Defs>
      <G id="layer1" transform="translate(-1144,-1514.3454)">
        <Path
          id="logo"
          display="inline"
          fill={_fill}
          fillOpacity="1"
          stroke="none"
          strokeWidth="30.575"
          strokeLinejoin="round"
          strokeDasharray="none"
          strokeOpacity="1"
          d="M 1326.6174,1551.392 C 1324.2383,1547.7852 1321.2779,1543.4154 1320.8282,1539.0292 1320.5217,1536.0416 1321.636,1533.2269 1323.5295,1530.947 1333.0091,1519.5354 1357.7835,1515.6682 1372.1827,1514.6078 1376.0346,1514.1811 1380.2428,1514.3784 1384.1178,1514.484 1398.2991,1514.8706 1419.6828,1518.6826 1429.7213,1529.441 1432.3303,1532.2369 1434.6729,1535.9475 1434.4126,1539.913 1434.0855,1544.9043 1430.3039,1548.5372 1426.801,1551.6451 L 1457.2979,1563.422 C 1486.0583,1573.382 1501.2426,1579.1994 1534.2256,1596.4185 1558.6271,1613.147 1583.9993,1626.3215 1608.3193,1642.5027 1627.1473,1663.7463 1601.8814,1686.8431 1585.4537,1699.513 1603.8475,1732.2179 1614.3576,1770.2471 1609.9886,1807.8956 1603.3718,1880.415 1551.1452,1940.4426 1490.2077,1975.8094 1437.9618,1999.2442 1323.4812,1999.8131 1268.7921,1975.8094 1207.8545,1940.4426 1155.6286,1880.415 1149.0111,1807.8956 1144.6428,1770.2471 1155.1523,1732.2179 1173.546,1699.513 1157.1183,1686.8431 1131.8524,1663.7463 1150.6809,1642.5027 1174.9998,1626.3215 1200.3733,1613.147 1224.7741,1596.4185 1257.7569,1579.1994 1272.9415,1573.382 1301.7009,1563.422 Z"
        />
      </G>
    </Svg>
  )
})
