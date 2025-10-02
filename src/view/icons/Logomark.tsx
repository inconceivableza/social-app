import Svg, {G, Path, type PathProps, type SvgProps} from 'react-native-svg'

import {usePalette} from '#/lib/hooks/usePalette'

const ratio = 54 / 61

export function Logomark({
  fill,
  ...rest
}: {fill?: PathProps['fill']} & SvgProps) {
  const pal = usePalette('default')
  // @ts-ignore it's fiiiiine
  const size = parseInt(rest.width || 32)

  return (
    <Svg
      fill="none"
      viewBox="0 0 512 512"
      {...rest}
      width={size}
      height={Number(size) * ratio}>
      <G id="layer1" transform="translate(-1144,-1514.3454)">
        <Path
          id="logo"
          display="inline"
          fill={fill || pal.text.color}
          fillOpacity="1"
          stroke="none"
          strokeWidth="30.575"
          strokeLinejoin="round"
          strokeDasharray="none"
          strokeOpacity="1"
          d="m 1326.6174,1551.392 c -2.3791,-3.6068 -5.3395,-7.9766 -5.7892,-12.3628 -0.3065,-2.9876 0.8078,-5.8023 2.7013,-8.0822 9.4796,-11.4116 34.254,-15.2788 48.6532,-16.3392 3.8519,-0.4267 8.0601,-0.2294 11.9351,-0.1238 14.1813,0.3866 35.565,4.1986 45.6035,14.957 2.609,2.7959 4.9516,6.5065 4.6913,10.472 -0.3271,4.9913 -4.1087,8.6242 -7.6116,11.7321 l 30.4969,11.7769 c 28.7604,9.96 43.9447,15.7774 76.9277,32.9965 24.4015,16.7285 49.7737,29.903 74.0937,46.0842 18.828,21.2436 -6.4379,44.3404 -22.8656,57.0103 18.3938,32.7049 28.9039,70.7341 24.5349,108.3826 -6.6168,72.5194 -58.8434,132.547 -119.7809,167.9138 -52.2459,23.4348 -166.7265,24.0037 -221.4156,0 -60.9376,-35.3668 -113.1635,-95.3944 -119.781,-167.9138 -4.3683,-37.6485 6.1412,-75.6777 24.5349,-108.3826 -16.4277,-12.6699 -41.6936,-35.7667 -22.8651,-57.0103 24.3189,-16.1812 49.6924,-29.3557 74.0932,-46.0842 32.9828,-17.2191 48.1674,-23.0365 76.9268,-32.9965 z"
        />
      </G>
    </Svg>
  )
}
