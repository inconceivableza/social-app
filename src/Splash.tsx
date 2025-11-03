import React, {useCallback, useEffect} from 'react'
import {
  AccessibilityInfo,
  Image as RNImage,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native'
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import Svg, {ClipPath, Defs, G, Path, Rect} from 'react-native-svg'
import {Image} from 'expo-image'
import * as SplashScreen from 'expo-splash-screen'

import {Logotype} from '#/view/icons/Logotype'
// @ts-ignore
import splashImagePointer from '../assets/splash.png'
// @ts-ignore
import darkSplashImagePointer from '../assets/splash-dark.png'
const splashImageUri = RNImage.resolveAssetSource(splashImagePointer).uri
const darkSplashImageUri = RNImage.resolveAssetSource(
  darkSplashImagePointer,
).uri

export const Logo = React.forwardRef(function LogoImpl(props: SvgProps, ref) {
  const width = 1000
  const height = width * (67 / 64)
  return (
    <Svg
      fill="none"
      // @ts-ignore it's fiiiiine
      ref={ref}
      viewBox="0 0 512 512"
      style={[{width, height}, props.style]}>
      <Defs id="defs8">
        <ClipPath clipPathUnits="userSpaceOnUse" id="clipPath1">
          <Rect
            opacity="0.5"
            fill="#b0b0b0"
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
          fill="#e88627"
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

type Props = {
  isReady: boolean
}

export function Splash(props: React.PropsWithChildren<Props>) {
  'use no memo'
  const insets = useSafeAreaInsets()
  const intro = useSharedValue(0)
  const outroLogo = useSharedValue(0)
  const outroApp = useSharedValue(0)
  const outroAppOpacity = useSharedValue(0)
  const [isAnimationComplete, setIsAnimationComplete] = React.useState(false)
  const [isImageLoaded, setIsImageLoaded] = React.useState(false)
  const [isLayoutReady, setIsLayoutReady] = React.useState(false)
  const [reduceMotion, setReduceMotion] = React.useState<boolean | undefined>(
    false,
  )
  const isReady =
    props.isReady &&
    isImageLoaded &&
    isLayoutReady &&
    reduceMotion !== undefined

  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === 'dark'

  const logoAnimation = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(intro.get(), [0, 1], [0.8, 1], 'clamp'),
        },
        {
          scale: interpolate(
            outroLogo.get(),
            [0, 0.08, 1],
            [1, 0.8, 500],
            'clamp',
          ),
        },
      ],
      opacity: interpolate(intro.get(), [0, 1], [0, 1], 'clamp'),
    }
  })
  const bottomLogoAnimation = useAnimatedStyle(() => {
    return {
      opacity: interpolate(intro.get(), [0, 1], [0, 1], 'clamp'),
    }
  })
  const reducedLogoAnimation = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(intro.get(), [0, 1], [0.8, 1], 'clamp'),
        },
      ],
      opacity: interpolate(intro.get(), [0, 1], [0, 1], 'clamp'),
    }
  })

  const logoWrapperAnimation = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        outroAppOpacity.get(),
        [0, 0.1, 0.2, 1],
        [1, 1, 0, 0],
        'clamp',
      ),
    }
  })

  const appAnimation = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(outroApp.get(), [0, 1], [1.1, 1], 'clamp'),
        },
      ],
      opacity: interpolate(
        outroAppOpacity.get(),
        [0, 0.1, 0.2, 1],
        [0, 0, 1, 1],
        'clamp',
      ),
    }
  })

  const onFinish = useCallback(() => setIsAnimationComplete(true), [])
  const onLayout = useCallback(() => setIsLayoutReady(true), [])
  const onLoadEnd = useCallback(() => setIsImageLoaded(true), [])

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync()
        .then(() => {
          intro.set(() =>
            withTiming(
              1,
              {duration: 400, easing: Easing.out(Easing.cubic)},
              async () => {
                // set these values to check animation at specific point
                outroLogo.set(() =>
                  withTiming(
                    1,
                    {duration: 1200, easing: Easing.in(Easing.cubic)},
                    () => {
                      runOnJS(onFinish)()
                    },
                  ),
                )
                outroApp.set(() =>
                  withTiming(1, {
                    duration: 1200,
                    easing: Easing.inOut(Easing.cubic),
                  }),
                )
                outroAppOpacity.set(() =>
                  withTiming(1, {
                    duration: 1200,
                    easing: Easing.in(Easing.cubic),
                  }),
                )
              },
            ),
          )
        })
        .catch(() => {})
    }
  }, [onFinish, intro, outroLogo, outroApp, outroAppOpacity, isReady])

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
  }, [])

  const logoAnimations =
    reduceMotion === true ? reducedLogoAnimation : logoAnimation
  // special off-spec color for dark mode
  const logoBg = isDarkMode ? '#0F1824' : '#fff'

  return (
    <View style={{flex: 1}} onLayout={onLayout}>
      {!isAnimationComplete && (
        <View style={StyleSheet.absoluteFillObject}>
          <Image
            accessibilityIgnoresInvertColors
            onLoadEnd={onLoadEnd}
            source={{uri: isDarkMode ? darkSplashImageUri : splashImageUri}}
            style={StyleSheet.absoluteFillObject}
          />

          <Animated.View
            style={[
              bottomLogoAnimation,
              {
                position: 'absolute',
                bottom: insets.bottom + 40,
                left: 0,
                right: 0,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
              },
            ]}>
            <Logotype fill="#fff" width={90} />
          </Animated.View>
        </View>
      )}

      {isReady && (
        <>
          <Animated.View style={[{flex: 1}, appAnimation]}>
            {props.children}
          </Animated.View>

          {!isAnimationComplete && (
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                logoWrapperAnimation,
                {
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  transform: [{translateY: -(insets.top / 2)}, {scale: 0.1}], // scale from 1000px to 100px
                },
              ]}>
              <Animated.View style={[logoAnimations]}>
                <Logo fill={logoBg} />
              </Animated.View>
            </Animated.View>
          )}
        </>
      )}
    </View>
  )
}
