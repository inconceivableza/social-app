import {View} from 'react-native'
import {type $Typed, type AppFoodiosFeedRecipeRevision} from '@atproto/api'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {InlineLinkText} from '#/components/Link'
import {Text} from '#/components/Typography'

export type Attribution = Exclude<
  AppFoodiosFeedRecipeRevision.Record['attribution'],
  undefined
>

interface RecipeAttributionDisplayProps {
  attribution: Attribution
}

const licenseLabels: Record<string, string> = {
  licenseAllRights: 'All Rights Reserved',
  licenseCreativeCommonsBy: 'CC BY 4.0 (Attribution)',
  licenseCreativeCommonsBySa: 'CC BY-SA 4.0 (Attribution-ShareAlike)',
  licenseCreativeCommonsByNc: 'CC BY-NC 4.0 (Attribution-NonCommercial)',
  licenseCreativeCommonsByNcSa:
    'CC BY-NC-SA 4.0 (Attribution-NonCommercial-ShareAlike)',
  licensePublicDomain: 'Public Domain',
}

const publicationTypeLabels: Record<string, string> = {
  publicationTypeBook: 'Book',
  publicationTypeMagazine: 'Magazine',
}

export function RecipeAttributionDisplay({
  attribution,
}: RecipeAttributionDisplayProps) {
  const t = useTheme()

  if (!attribution) {
    return null
  }

  return (
    <View style={[a.gap_xs]}>
      <Text style={[a.font_bold, t.atoms.text_contrast_medium]}>
        <Trans context="recipe">Attribution</Trans>
      </Text>
      <View style={[a.ml_sm, a.gap_xs]}>
        <AttributionContent attribution={attribution} />
      </View>
    </View>
  )
}

function AttributionContent({attribution}: {attribution: Attribution}) {
  switch (attribution.type) {
    case 'original':
      return <OriginalAttributionDisplay value={attribution} />
    case 'person':
      return <PersonAttributionDisplay value={attribution} />
    case 'publication':
      return <PublicationAttributionDisplay value={attribution} />
    case 'website':
      return <WebsiteAttributionDisplay value={attribution} />
    case 'show':
      return <ShowAttributionDisplay value={attribution} />
    case 'product':
      return <ProductAttributionDisplay value={attribution} />
    default:
      return null
  }
}

function OriginalAttributionDisplay({
  value,
}: {
  value: $Typed<AppFoodiosFeedRecipeRevision.OriginalAttribution>
}) {
  const {_} = useLingui()
  const licenseLabel =
    licenseLabels[value.license.licenseType] ?? _(msg`Unknown`)

  return (
    <View style={[a.gap_xs]}>
      <Text>
        <Trans context="recipe attribution">Original recipe</Trans>
      </Text>
      <Text>{`${_(msg`License`)}: ${licenseLabel}`}</Text>
      {value.url && (
        <InlineLinkText
          label={_(msg`Attribution link`)}
          to={value.url}
          style={[a.text_sm]}>
          {value.url}
        </InlineLinkText>
      )}
    </View>
  )
}

function PersonAttributionDisplay({
  value,
}: {
  value: $Typed<AppFoodiosFeedRecipeRevision.PersonAttribution>
}) {
  const {_} = useLingui()

  return (
    <View style={[a.gap_xs]}>
      <Text>
        <Trans context="recipe attribution">From person</Trans>: {value.name}
      </Text>
      {value.url && (
        <InlineLinkText
          label={_(msg`Attribution link`)}
          to={value.url}
          style={[a.text_sm]}>
          {value.url}
        </InlineLinkText>
      )}
      {value.notes && <Text style={[a.text_sm, a.italic]}>{value.notes}</Text>}
    </View>
  )
}

function PublicationAttributionDisplay({
  value,
}: {
  value: $Typed<AppFoodiosFeedRecipeRevision.PublicationAttribution>
}) {
  const {_} = useLingui()
  const pubTypeLabel =
    publicationTypeLabels[value.publicationType.publicationType] ??
    _(msg`Unknown`)

  return (
    <View style={[a.gap_xs]}>
      <Text>
        <Trans context="recipe attribution">From publication</Trans>:{' '}
        {value.title}
      </Text>
      <Text>{`${_(msg`Author`)}: ${value.author}`}</Text>
      <Text>{`${_(msg`Type`)}: ${pubTypeLabel}`}</Text>
      {value.publisher && (
        <Text>{`${_(msg`Publisher`)}: ${value.publisher}`}</Text>
      )}
      {value.isbn && <Text>{`${_(msg`ISBN`)}: ${value.isbn}`}</Text>}
      {value.page && <Text>{`${_(msg`Page`)}: ${value.page}`}</Text>}
      {value.url && (
        <InlineLinkText
          label={_(msg`Attribution link`)}
          to={value.url}
          style={[a.text_sm]}>
          {value.url}
        </InlineLinkText>
      )}
      {value.notes && <Text style={[a.text_sm, a.italic]}>{value.notes}</Text>}
    </View>
  )
}

function WebsiteAttributionDisplay({
  value,
}: {
  value: $Typed<AppFoodiosFeedRecipeRevision.WebsiteAttribution>
}) {
  const {_} = useLingui()
  const licenseType = value.license?.licenseType
  const licenseLabel = licenseType ? licenseLabels[licenseType] : null

  return (
    <View style={[a.gap_xs]}>
      <Text>
        <Trans context="recipe attribution">From website</Trans>: {value.name}
      </Text>
      {licenseLabel && <Text>{`${_(msg`License`)}: ${licenseLabel}`}</Text>}
      <InlineLinkText
        label={_(msg`Attribution link`)}
        to={value.url}
        style={[a.text_sm]}>
        {value.url}
      </InlineLinkText>
      {value.notes && <Text style={[a.text_sm, a.italic]}>{value.notes}</Text>}
    </View>
  )
}

function ShowAttributionDisplay({
  value,
}: {
  value: $Typed<AppFoodiosFeedRecipeRevision.ShowAttribution>
}) {
  const {_} = useLingui()

  return (
    <View style={[a.gap_xs]}>
      <Text>
        <Trans context="recipe attribution">From TV show</Trans>: {value.title}
      </Text>
      {value.episode && <Text>{`${_(msg`Episode`)}: ${value.episode}`}</Text>}
      <Text>{`${_(msg`Network`)}: ${value.network}`}</Text>
      {value.airDate && <Text>{`${_(msg`Air date`)}: ${value.airDate}`}</Text>}
      {value.url && (
        <InlineLinkText
          label={_(msg`Attribution link`)}
          to={value.url}
          style={[a.text_sm]}>
          {value.url}
        </InlineLinkText>
      )}
      {value.notes && <Text style={[a.text_sm, a.italic]}>{value.notes}</Text>}
    </View>
  )
}

function ProductAttributionDisplay({
  value,
}: {
  value: $Typed<AppFoodiosFeedRecipeRevision.ProductAttribution>
}) {
  const {_} = useLingui()

  return (
    <View style={[a.gap_xs]}>
      <Text>
        <Trans context="recipe attribution">From product</Trans>: {value.brand}{' '}
        {value.name}
      </Text>
      {value.upc && <Text>{`${_(msg`UPC`)}: ${value.upc}`}</Text>}
      {value.url && (
        <InlineLinkText
          label={_(msg`Attribution link`)}
          to={value.url}
          style={[a.text_sm]}>
          {value.url}
        </InlineLinkText>
      )}
      {value.notes && <Text style={[a.text_sm, a.italic]}>{value.notes}</Text>}
    </View>
  )
}
