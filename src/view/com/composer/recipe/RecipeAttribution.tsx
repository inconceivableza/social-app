import React, { useMemo } from 'react'
import { View } from 'react-native'
import { msg, Trans } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { $Typed, AppFoodiosFeedDefs, AppFoodiosFeedRecipeRevision } from '@atproto/api'

import { atoms as a, useTheme } from '#/alf'
import { Button, ButtonIcon, ButtonText } from '#/components/Button'
import * as TextField from '#/components/forms/TextField'
import { NumberField } from '#/components/forms/NumberField'
import * as Select from "#/components/Select"

// TODO: localization

export type Attribution = Exclude<AppFoodiosFeedRecipeRevision.Record["attribution"], undefined>
// | $Typed AppFoodiosFeedRecipeRevision.OriginalAttribution
// | AppFoodiosFeedRecipeRevision.PersonAttribution
// | AppFoodiosFeedRecipeRevision.PublicationAttribution
// | AppFoodiosFeedRecipeRevision.WebsiteAttribution
// | AppFoodiosFeedRecipeRevision.ShowAttribution
// | AppFoodiosFeedRecipeRevision.ProductAttribution

type AttributionType =
  | 'original'
  | 'person'
  | 'publication'
  | 'website'
  | 'show'
  | 'product'

interface RecipeAttributionProps {
  value?: Attribution
  onChange: (attribution: Attribution | undefined) => void
}

const attributionTypeLabels: Record<AttributionType, string> = {
  original: 'Original',
  person: 'Person',
  publication: 'Publication',
  website: 'Website',
  show: 'TV Show',
  product: 'Product',
}

const licenseOptions = [
  {
    id: 'app.foodios.feed.defs#licenseAllRights',
    label: 'All Rights Reserved',
    value: 'licenseAllRights',
  },
  {
    id: 'app.foodios.feed.defs#licenseCreativeCommonsBy',
    label: 'CC BY 4.0 (Attribution)',
    value: 'licenseCreativeCommonsBy',
  },
  {
    id: 'app.foodios.feed.defs#licenseCreativeCommonsBySa',
    label: 'CC BY-SA 4.0 (Attribution-ShareAlike)',
    value: 'licenseCreativeCommonsBySa',
  },
  {
    id: 'app.foodios.feed.defs#licenseCreativeCommonsByNc',
    label: 'CC BY-NC 4.0 (Attribution-NonCommercial)',
    value: 'licenseCreativeCommonsByNc',
  },
  {
    id: 'app.foodios.feed.defs#licenseCreativeCommonsByNcSa',
    label: 'CC BY-NC-SA 4.0 (Attribution-NonCommercial-ShareAlike)',
    value: 'licenseCreativeCommonsByNcSa',
  },
  {
    id: 'app.foodios.feed.defs#licensePublicDomain',
    label: 'Public Domain',
    value: 'licensePublicDomain',
  },
]

const publicationTypeOptions = [
  {
    id: 'app.foodios.feed.defs#publicationTypeBook',
    label: 'Book',
    value: 'publicationTypeBook',
  },
  {
    id: 'app.foodios.feed.defs#publicationTypeMagazine',
    label: 'Magazine',
    value: 'publicationTypeMagazine',
  },
]

export function RecipeAttribution({ value, onChange }: RecipeAttributionProps) {
  const { _ } = useLingui()
  const t = useTheme()

  const currentType: AttributionType | undefined = value?.type

  const handleTypeChange = (type: AttributionType) => {
    // Create a new attribution object with the selected type
    switch (type) {
      case 'original':
        onChange({
          $type: 'app.foodios.feed.recipeRevision#originalAttribution',
          type: 'original',
          license: {
            $type: 'app.foodios.feed.defs#licenseAllRights',
            licenseType: 'licenseAllRights',
          },
        })
        break
      case 'person':
        onChange({
          $type: 'app.foodios.feed.recipeRevision#personAttribution',
          type: 'person',
          name: '',
        })
        break
      case 'publication':
        onChange({
          $type: 'app.foodios.feed.recipeRevision#publicationAttribution',
          type: 'publication',
          publicationType: {
            $type: 'app.foodios.feed.defs#publicationTypeBook',
            publicationType: 'publicationTypeBook',
          },
          title: '',
          author: '',
        })
        break
      case 'website':
        onChange({
          $type: 'app.foodios.feed.recipeRevision#websiteAttribution',
          type: 'website',
          name: '',
          url: '',
        })
        break
      case 'show':
        onChange({
          $type: 'app.foodios.feed.recipeRevision#showAttribution',
          type: 'show',
          title: '',
          network: '',
        })
        break
      case 'product':
        onChange({
          $type: 'app.foodios.feed.recipeRevision#productAttribution',
          type: 'product',
          brand: '',
          name: '',
        })
        break
    }
  }

  const handleClear = () => {
    onChange(undefined)
  }

  console.log(currentType)

  return (
    <View key={currentType} style={[a.gap_md]}>
      <View style={[a.flex_row, a.align_center, a.gap_sm]}>
        <View style={[a.flex_1]}>
          <Select.Root value={currentType} onValueChange={(value) => handleTypeChange(value as AttributionType)}>
            <Select.Trigger label={_(msg`Recipe attribution`)}>
              {({ props }) => <Button label={props.accessibilityLabel} {...props}
                color="secondary"
                size="small"
                variant="solid"

                style={[
                  a.pr_xs,
                  a.pl_sm,
                ]}
              >

                <Select.ValueText
                  placeholder={_(msg`Attribution type`)}
                  style={[t.atoms.text_contrast_medium]}
                />
                <Select.Icon style={[t.atoms.text_contrast_medium]} />

              </Button>}

            </Select.Trigger>
            <Select.Content
              renderItem={({ label, value }) => (
                <Select.Item value={value} label={_(label)}>
                  <Select.ItemText><Trans>{label}</Trans></Select.ItemText>
                </Select.Item>
              )}
              items={(Object.entries(attributionTypeLabels) as [
                AttributionType,
                string,
              ][]).map(([value, label]) => ({ value, label }))}
            />
          </Select.Root>

        </View>
        {currentType && (
          <Button
            label={_(msg`Clear attribution`)}
            variant="outline"
            color="negative"
            size="small"
            onPress={handleClear}>
            <ButtonText>
              <Trans>Clear</Trans>
            </ButtonText>
          </Button>
        )}
      </View>

      {value && <AttributionFields value={value} onChange={onChange} />}
    </View>
  )
}

function AttributionFields({
  value,
  onChange,
}: {
  value: Attribution
  onChange: (attribution: Attribution) => void
}) {

  switch (value.type) {
    case 'original':
      return <OriginalAttributionFields value={value} onChange={onChange} />
    case 'person':
      return <PersonAttributionFields value={value} onChange={onChange} />
    case 'publication':
      return (
        <PublicationAttributionFields value={value} onChange={onChange} />
      )
    case 'website':
      return <WebsiteAttributionFields value={value} onChange={onChange} />
    case 'show':
      return <ShowAttributionFields value={value} onChange={onChange} />
    case 'product':
      return <ProductAttributionFields value={value} onChange={onChange} />
    default:
      return null
  }
}

function OriginalAttributionFields({
  value,
  onChange,
}: {
  value: $Typed<AppFoodiosFeedRecipeRevision.OriginalAttribution>
  onChange: (attribution: $Typed<AppFoodiosFeedRecipeRevision.OriginalAttribution>) => void
}) {
  const { _ } = useLingui()
  const t = useTheme()

  const selectedLicense = useMemo(() => {
    if (!value.license || typeof value.license.$type !== 'string') return
    return value.license.$type
  }, [value.license])

  const handleLicenseChange = (licenseId: string) => {
    const license = licenseOptions.find(opt => opt.id === licenseId)
    if (!license) return

    onChange({
      ...value,
      license: {
        $type: licenseId as any,
        licenseType: license.value as any,
      },
    })
  }

  return (
    <View style={[a.gap_sm]}>
      <Select.Root value={selectedLicense} onValueChange={handleLicenseChange}>
        <Select.Trigger label={_(msg`License type`)}>
          {({ props }) => <Button label={props.accessibilityLabel} {...props}
            color="secondary"
            size="small"
            variant="solid"

            style={[
              a.pr_xs,
              a.pl_sm,
            ]}
          >

            <Select.ValueText
              placeholder={_(msg`License type`)}
              style={[t.atoms.text_contrast_medium]}
            />
            <Select.Icon style={[t.atoms.text_contrast_medium]} />

          </Button>}

        </Select.Trigger>
        <Select.Content
          renderItem={({ label, id }) => (
            <Select.Item value={id} label={_(label)}>
              <Select.ItemText><Trans>{label}</Trans></Select.ItemText>
            </Select.Item>
          )}
          items={licenseOptions}
        />
      </Select.Root>

      <TextField.Root>
        <TextField.Input
          label={_(msg`URL (optional)`)}
          defaultValue={value.url}
          onChangeText={url => onChange({ ...value, url })}
        />
      </TextField.Root>
    </View>
  )
}

function PersonAttributionFields({
  value,
  onChange,
}: {
  value: $Typed<AppFoodiosFeedRecipeRevision.PersonAttribution>
  onChange: (attribution: $Typed<AppFoodiosFeedRecipeRevision.PersonAttribution>) => void
}) {
  const { _ } = useLingui()

  return (
    <View style={[a.gap_sm]}>
      <TextField.Root>
        <TextField.Input
          label={_(msg`Name`)}
          defaultValue={value.name}
          onChangeText={name => onChange({ ...value, name })}
        />
      </TextField.Root>
      <TextField.Root>
        <TextField.Input
          label={_(msg`URL (optional)`)}
          defaultValue={value.url}
          onChangeText={url => onChange({ ...value, url })}
        />
      </TextField.Root>
      <TextField.Root>
        <TextField.Input
          label={_(msg`Notes (optional)`)}
          defaultValue={value.notes}
          onChangeText={notes => onChange({ ...value, notes })}
          multiline
        />
      </TextField.Root>
    </View>
  )
}

function PublicationAttributionFields({
  value,
  onChange,
}: {
  value: $Typed<AppFoodiosFeedRecipeRevision.PublicationAttribution>
  onChange: (
    attribution: $Typed<AppFoodiosFeedRecipeRevision.PublicationAttribution>,
  ) => void
}) {
  const { _ } = useLingui()
  const t = useTheme()

  const selectedPublicationType = useMemo(() => {
    if (!value.publicationType || typeof value.publicationType.$type !== 'string')
      return
    return value.publicationType.$type
  }, [value.publicationType])

  const handlePublicationTypeChange = (typeId: string) => {
    const pubType = publicationTypeOptions.find(opt => opt.id === typeId)
    if (!pubType) return

    onChange({
      ...value,
      publicationType: {
        $type: typeId as any,
        publicationType: pubType.value as any,
      },
    })
  }

  return (
    <View style={[a.gap_sm]}>
      <Select.Root value={selectedPublicationType} onValueChange={handlePublicationTypeChange}>
        <Select.Trigger label={_(msg`Publication type`)}>
          {({ props }) => <Button label={props.accessibilityLabel} {...props}
            color="secondary"
            size="small"
            variant="solid"

            style={[
              a.pr_xs,
              a.pl_sm,
            ]}
          >
            <Select.ValueText
              placeholder={_(msg`Publication type`)}
              style={[t.atoms.text_contrast_medium]}
            />
            <Select.Icon style={[t.atoms.text_contrast_medium]} />

          </Button>}

        </Select.Trigger>
        <Select.Content
          renderItem={({ label, id }) => (
            <Select.Item value={id} label={_(label)}>
              <Select.ItemText><Trans>{label}</Trans></Select.ItemText>
            </Select.Item>
          )}
          items={publicationTypeOptions}
        />
      </Select.Root>
      <TextField.Root>
        <TextField.Input
          label={_(msg`Title`)}
          defaultValue={value.title}
          onChangeText={title => onChange({ ...value, title })}
        />
      </TextField.Root>
      <TextField.Root>
        <TextField.Input
          label={_(msg`Author`)}
          defaultValue={value.author}
          onChangeText={author => onChange({ ...value, author })}
        />
      </TextField.Root>
      <TextField.Root>
        <TextField.Input
          label={_(msg`Publisher (optional)`)}
          defaultValue={value.publisher}
          onChangeText={publisher => onChange({ ...value, publisher })}
        />
      </TextField.Root>
      <TextField.Root>
        <TextField.Input
          label={_(msg`ISBN (optional)`)}
          defaultValue={value.isbn}
          onChangeText={isbn => onChange({ ...value, isbn })}
        />
      </TextField.Root>
      <NumberField
        label={_(msg`Page (optional)`)}
        defaultValue={value.page?.toString()}
        onChange={page => onChange({ ...value, page: page ? parseInt(page) : undefined })}
      />
      <TextField.Root>
        <TextField.Input
          label={_(msg`URL (optional)`)}
          defaultValue={value.url}
          onChangeText={url => onChange({ ...value, url })}
        />
      </TextField.Root>
      <TextField.Root>
        <TextField.Input
          label={_(msg`Notes (optional)`)}
          defaultValue={value.notes}
          onChangeText={notes => onChange({ ...value, notes })}
          multiline
        />
      </TextField.Root>
    </View>
  )
}

function WebsiteAttributionFields({
  value,
  onChange,
}: {
  value: $Typed<AppFoodiosFeedRecipeRevision.WebsiteAttribution>
  onChange: (attribution: $Typed<AppFoodiosFeedRecipeRevision.WebsiteAttribution>) => void
}) {
  const { _ } = useLingui()

  return (
    <View style={[a.gap_sm]}>
      <TextField.Root>
        <TextField.Input
          label={_(msg`Website name`)}
          defaultValue={value.name}
          onChangeText={name => onChange({ ...value, name })}
        />
      </TextField.Root>
      <TextField.Root>
        <TextField.Input
          label={_(msg`URL`)}
          defaultValue={value.url}
          onChangeText={url => onChange({ ...value, url })}
        />
      </TextField.Root>
      <TextField.Root>
        <TextField.Input
          label={_(msg`Notes (optional)`)}
          defaultValue={value.notes}
          onChangeText={notes => onChange({ ...value, notes })}
          multiline
        />
      </TextField.Root>
    </View>
  )
}

function ShowAttributionFields({
  value,
  onChange,
}: {
  value: $Typed<AppFoodiosFeedRecipeRevision.ShowAttribution>
  onChange: (attribution: $Typed<AppFoodiosFeedRecipeRevision.ShowAttribution>) => void
}) {
  const { _ } = useLingui()

  return (
    <View style={[a.gap_sm]}>
      <TextField.Root>
        <TextField.Input
          label={_(msg`Show title`)}
          defaultValue={value.title}
          onChangeText={title => onChange({ ...value, title })}
        />
      </TextField.Root>
      <TextField.Root>
        <TextField.Input
          label={_(msg`Episode (optional)`)}
          defaultValue={value.episode}
          onChangeText={episode => onChange({ ...value, episode })}
        />
      </TextField.Root>
      <TextField.Root>
        <TextField.Input
          label={_(msg`Network`)}
          defaultValue={value.network}
          onChangeText={network => onChange({ ...value, network })}
        />
      </TextField.Root>
      <TextField.Root>
        <TextField.Input
          label={_(msg`Air date (optional)`)}
          defaultValue={value.airDate}
          onChangeText={airDate => onChange({ ...value, airDate })}
          placeholder="YYYY-MM-DD"
        />
      </TextField.Root>
      <TextField.Root>
        <TextField.Input
          label={_(msg`URL (optional)`)}
          defaultValue={value.url}
          onChangeText={url => onChange({ ...value, url })}
        />
      </TextField.Root>
      <TextField.Root>
        <TextField.Input
          label={_(msg`Notes (optional)`)}
          defaultValue={value.notes}
          onChangeText={notes => onChange({ ...value, notes })}
          multiline
        />
      </TextField.Root>
    </View>
  )
}

function ProductAttributionFields({
  value,
  onChange,
}: {
  value: $Typed<AppFoodiosFeedRecipeRevision.ProductAttribution>
  onChange: (attribution: $Typed<AppFoodiosFeedRecipeRevision.ProductAttribution>) => void
}) {
  const { _ } = useLingui()

  return (
    <View style={[a.gap_sm]}>
      <TextField.Root>
        <TextField.Input
          label={_(msg`Brand`)}
          defaultValue={value.brand}
          onChangeText={brand => onChange({ ...value, brand })}
        />
      </TextField.Root>
      <TextField.Root>
        <TextField.Input
          label={_(msg`Product name`)}
          defaultValue={value.name}
          onChangeText={name => onChange({ ...value, name })}
        />
      </TextField.Root>
      <TextField.Root>
        <TextField.Input
          label={_(msg`UPC (optional)`)}
          defaultValue={value.upc}
          onChangeText={upc => onChange({ ...value, upc })}
        />
      </TextField.Root>
      <TextField.Root>
        <TextField.Input
          label={_(msg`URL (optional)`)}
          defaultValue={value.url}
          onChangeText={url => onChange({ ...value, url })}
        />
      </TextField.Root>
      <TextField.Root>
        <TextField.Input
          label={_(msg`Notes (optional)`)}
          defaultValue={value.notes}
          onChangeText={notes => onChange({ ...value, notes })}
          multiline
        />
      </TextField.Root>
    </View>
  )
}
