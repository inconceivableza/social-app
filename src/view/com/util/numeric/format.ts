import {type I18n} from '@lingui/core'

export const formatCount = (i18n: I18n, num: number) => {
  return i18n.number(num, {
    notation: 'compact',
    maximumFractionDigits: 1,
    // @ts-expect-error - roundingMode not in the types
    roundingMode: 'trunc',
  })
}

export const formatRating = (
  i18n: I18n,
  rating: number,
  reviewers: number | undefined,
) => {
  // undefined reviewers means this is actually a rating rather than an aggregate
  const ratingStr = i18n.number(rating, {
    notation: 'compact',
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
    // @ts-expect-error - roundingMode not in the types
    roundingMode: 'trunc',
  })
  const reviewersStr =
    reviewers === undefined
      ? null
      : i18n.number(reviewers, {
          notation: 'compact',
          maximumFractionDigits: 0,
          // @ts-expect-error - roundingMode not in the types
          roundingMode: 'trunc',
        })
  return !reviewersStr ? ratingStr : `${ratingStr} (${reviewersStr})`
}
