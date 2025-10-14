import React from 'react'
import Svg, {Path} from 'react-native-svg'

import {colors} from '#/lib/styles'
import {type Props, useCommonSVGProps} from './icons/common'

export function getHalfStars(rating: number) {
  if (rating < 0) return 0
  if (rating > 5) return 10
  return Math.round(rating * 2)
}

export function halveStars(rating: number | undefined) {
  if (typeof rating === 'undefined') return undefined
  return rating / 2
}

function createStarsSVG(rating: number, fill: string = '') {
  const width = 96,
    height = 18
  const Star_Filled_Prefix = 'M12.902,1.568'
  const Star_Filled_Path =
    'a1,1,0,0,0,-1.804,0l-2.643,5.517l-6.085,0.799a1,1,0,0,0,-0.557,1.718l4.45,4.207l-1.117,6.008a1,1,0,0,0,1.458,1.063l5.396,-2.918l5.396,2.918a1,1,0,0,0,1.459,-1.063l-1.117,-6.008l4.45,-4.207a1,1,0,0,0,-0.558,-1.718l-6.085,-0.8l-2.643,-5.516z'
  const Star_Empty_Prefix = 'M12,1'
  const Star_Empty_Path =
    'a1,1,0,0,1,0.902,0.568l2.643,5.517l6.085,0.799a1,1,0,0,1,0.557,1.718l-4.45,4.207l1.118,6.008a1,1,0,0,1,-1.46,1.063l-5.395,-2.918l-5.396,2.918a1,1,0,0,1,-1.459,-1.063l1.117,-6.008l-4.45,-4.207a1,1,0,0,1,0.558,-1.718l6.085,-0.8l2.643,-5.516a1,1,0,0,1,0.902,-0.568zm0,3.315l-1.975,4.123a1,1,0,0,1,-0.772,0.56l-4.538,0.595l3.317,3.137a1,1,0,0,1,0.296,0.91l-0.834,4.485l4.03,-2.179a1,1,0,0,1,0.952,0l4.03,2.179l-0.834,-4.485a1,1,0,0,1,0.296,-0.91l3.317,-3.137l-4.538,-0.596a1,1,0,0,1,-0.772,-0.56l-1.975,-4.121z'
  const Star_Half_Filled_Prefix = 'M11.989347,0.99928977'
  const Star_Half_Filled_Path =
    'l0,0.026a1,1,0,0,0,-0.207,0a1,1,0,0,0,-0.677,0.543l-2.644,5.516l-6.086,0.799a1,1,0,0,0,-0.556,1.72l4.449,4.206l-1.116,6.008a1,1,0,0,0,1.457,1.063l5.389,-2.914l5.386,2.914a1,1,0,0,0,1.459,-1.063l-1.116,-6.008l4.449,-4.206a1,1,0,0,0,-0.556,-1.72l-6.086,-0.799l-2.644,-5.516a1,1,0,0,0,-0.901,-0.569zm0.017,3.354l1.958,4.084a1,1,0,0,0,0.771,0.561l4.539,0.594l-3.318,3.139a1,1,0,0,0,-0.296,0.909l0.835,4.485l-4.031,-2.179a1,1,0,0,0,-0.458,-0.105l0,-11.488z'
  const adjustment = (i: number) => `m${(i - 2) * 25 + 2},0` // would naturally be 24 but this gives a little extra spacing without overrun
  const Star_Filled = (i: number) =>
    `${Star_Filled_Prefix}${adjustment(i)}${Star_Filled_Path}`
  const Star_Empty = (i: number) =>
    `${Star_Empty_Prefix}${adjustment(i)}${Star_Empty_Path}`
  const Star_Half_Filled = (i: number) =>
    `${Star_Half_Filled_Prefix}${adjustment(i)}${Star_Half_Filled_Path}`
  const halfStars = getHalfStars(rating)
  const paths = [1, 2, 3, 4, 5].map(i => {
    return i * 2 <= halfStars
      ? Star_Filled(i - 1)
      : i * 2 - 1 <= halfStars
        ? Star_Half_Filled(i - 1)
        : Star_Empty(i - 1)
  })
  return React.forwardRef<Svg, Props>(function LogoImpl(props, ref) {
    const {
      fill: propsFill,
      width: propsWidth,
      height: propsHeight,
      style,
      gradient,
      ...rest
    } = useCommonSVGProps(props)

    return (
      <Svg
        fill="none"
        {...rest}
        ref={ref}
        viewBox="0 0 24 24"
        width={width || propsWidth}
        height={height || propsHeight}
        style={[style]}>
        {gradient}
        {paths.map((path, i) => (
          <Path
            key={i}
            fill={fill || propsFill}
            fillRule="evenodd"
            clipRule="evenodd"
            d={path}
          />
        ))}
      </Svg>
    )
  })
}
const starsSVG = new Map(
  [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(r => [r, createStarsSVG(r)]),
)
export const unratedSVG = createStarsSVG(5, colors.gray3)
export const getStarsSVG = (rating: number) => {
  const roundedRating =
    rating === undefined ? undefined : starsSVG.get(Math.round(rating * 2) / 2)
  return roundedRating ?? unratedSVG
}
