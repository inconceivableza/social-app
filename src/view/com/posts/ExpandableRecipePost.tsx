import {useMemo, useState} from 'react'
import {View} from 'react-native'
import {
  type AppFoodiosFeedDefs,
  type AppFoodiosFeedRecipeRevision,
} from '@atproto/api'
import {RichText as RichTextAPI} from '@atproto/api'
import {msg, plural, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import type React from 'react'

import {atoms as a, atoms, useTheme} from '#/alf'
import {Accordion} from '#/components/Accordion'
import {ShowMoreTextButton} from '#/components/Post/ShowMoreTextButton'
import {RichText} from '#/components/RichText'
import {Text} from '#/components/Typography'
import {
  dedupHierarchyOptions,
  pathToHierarchyOption,
  recipeCategories,
  recipeCuisines,
  recipeDiets,
} from '../composer/state/dataRecipe'
import {type NutritionElement, nutritionFields} from '../recipe/NutritionFields'
import {RecipeAttributionDisplay} from '../recipe/RecipeAttributionDisplay'

export function ExpandableRecipePost({
  revision,
}: {
  revision: AppFoodiosFeedDefs.RecipeRevisionView
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  return (
    <View>
      <ExpandedRecipePost revision={revision} expanded={isExpanded} />
      {!isExpanded && (
        <ShowMoreTextButton
          style={[a.text_md]}
          onPress={() => {
            setIsExpanded(true)
          }}
        />
      )}
    </View>
  )
}

export function ExpandedRecipePost({
  revision,
  expanded,
  titleComponent,
}: {
  revision: AppFoodiosFeedDefs.RecipeRevisionView
  expanded: boolean
  titleComponent?: React.ReactNode
}) {
  // TODO: include embeds - currently added by wrappers
  // TODO: count lines - if too long truncate unless expanded
  const record = revision.revisionContent
  const t = useTheme()
  const {_} = useLingui()
  const richText = useMemo(() => {
    return new RichTextAPI({
      text: revision.revisionContent.text,
      facets: revision.revisionContent.facets,
    })
  }, [revision])
  return (
    <View style={[a.gap_xs]}>
      <View style={[a.flex_row]}>
        <View style={{justifyContent: 'center', marginRight: 'auto'}}>
          <Text emoji style={[a.text_xl, a.font_bold]}>
            {record.name}
          </Text>
        </View>

        {titleComponent}
      </View>
      <View style={a.gap_xs}>
        {record.recipeCategory?.length ? (
          <View style={[a.flex_row, a.align_center, a.gap_sm]}>
            <Text>{`${plural(record.recipeCategory.length, {
              one: 'Category',
              other: 'Categories',
            })}:`}</Text>
            {/* TODO: make these clickable */}
            <View style={[t.atoms.bg_contrast_100, a.p_xs, a.rounded_xs]}>
              {record.recipeCategory.map(path => {
                const option = pathToHierarchyOption(path, recipeCategories)
                return option && <Text>{_(option.label)}</Text>
              })}
            </View>
          </View>
        ) : null}

        {record.suitableForDiet?.length ? (
          <View style={[a.flex_row, a.align_center, a.gap_sm]}>
            <Text>{`${plural(record.suitableForDiet.length, {
              one: 'Suitable for diet',
              other: 'Suitable for diets',
            })}:`}</Text>
            {/* TODO: make these clickable */}
            <View style={[t.atoms.bg_contrast_100, a.p_xs, a.rounded_xs]}>
              {record.suitableForDiet.map(path => {
                const option = pathToHierarchyOption(path, recipeDiets)
                return option && <Text>{_(option.label)}</Text>
              })}
            </View>
          </View>
        ) : null}

        {record.recipeCuisine?.length ? (
          <View style={[a.flex_row, a.align_center, a.gap_sm]}>
            <Text>{`${plural(record.recipeCuisine?.length ?? 0, {
              one: 'Cuisine',
              other: 'Cuisines',
            })}:`}</Text>
            {/* TODO: make these clickable */}
            <View style={[a.flex_row, a.gap_xs, a.flex_wrap]}>
              {dedupHierarchyOptions(
                (record.recipeCuisine ?? []).flatMap(path => {
                  const option = pathToHierarchyOption(path, recipeCuisines)
                  return option ? [option] : []
                }),
              ).map(opt => (
                <View
                  style={[t.atoms.bg_contrast_100, a.p_xs, a.rounded_xs]}
                  key={opt.id}>
                  <Text>{_(opt.label)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
      <View>
        <RichText
          enableTags
          testID="postText"
          value={richText}
          style={[a.flex_1, a.text_md]}
          shouldProxyLinks={true}
        />
      </View>
      {expanded && (
        <View style={[a.gap_xs]}>
          <View>
            {/* TODO replace labels with icons */}
            {record.prepTime ? (
              <View>
                <Text>{`${_(msg`Prep:`)} ${plural(record.prepTime, {
                  one: '# minute',
                  other: '# minutes',
                })}`}</Text>
              </View>
            ) : null}

            {record.cookingTime ? (
              <View>
                <Text>{`${_(msg`Cook:`)} ${record.cookingTime} ${_(msg`minutes`)}`}</Text>
              </View>
            ) : null}

            {record.recipeYield ? (
              <View>
                <Text>{`${_(msg`Yield:`)} ${record.recipeYield.quantity} ${record.recipeYield.unit}`}</Text>
              </View>
            ) : null}
          </View>
          <View>
            <Text style={[a.text_lg, t.atoms.text_contrast_medium]}>
              <Trans context="recipe">Ingredients</Trans>
            </Text>
          </View>
          <View style={[a.ml_sm]}>
            {record.ingredients.map((ingredient, i) => {
              return (
                <View key={i} style={[a.flex_row, a.gap_sm]}>
                  <Text
                    emoji>{`${ingredient.quantity} ${ingredient.unit} ${ingredient.name}`}</Text>
                </View>
              )
            })}
          </View>
          <View>
            <Text style={[a.text_lg, t.atoms.text_contrast_medium]}>
              <Trans context="recipe">Instructions</Trans>
            </Text>
          </View>
          <View>
            {record.instructionSections.map(
              ({name, instructions}, sectionIdx) => {
                return (
                  <View key={sectionIdx} style={[a.gap_sm]}>
                    {name && (
                      <Text emoji style={[a.font_bold]}>
                        {name}
                      </Text>
                    )}
                    <View style={[a.ml_sm]}>
                      {instructions.map((instruction, instructionIdx) => (
                        <View key={instructionIdx}>
                          <Text emoji>
                            {instructionIdx + 1 + '. ' + instruction.text}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )
              },
            )}
          </View>
          {record.nutrition && (
            <Accordion heading={_(msg`Nutritional Information`)}>
              <NutritionView nutrition={record.nutrition} />
            </Accordion>
          )}

          {record.attribution && (
            <Accordion heading={_(msg`Attribution`)}>
              <RecipeAttributionDisplay attribution={record.attribution} />
            </Accordion>
          )}
        </View>
      )}
    </View>
  )
}

function NutritionView({
  nutrition,
}: {
  nutrition: AppFoodiosFeedRecipeRevision.Nutrition
}) {
  return (
    <View style={[atoms.gap_xs]}>
      {nutritionFields.map(field => (
        <NutritionalValue {...field} nutrition={nutrition} key={field.field} />
      ))}
    </View>
  )
}

function NutritionalValue({
  nutrition,
  field,
  label,
  unit,
  subFields,
}: NutritionElement & {nutrition: AppFoodiosFeedRecipeRevision.Nutrition}) {
  const {_} = useLingui()
  const value = nutrition[field]
  if (!value) {
    return null
  }
  return (
    <View key={field} style={atoms.gap_xs}>
      <Text>{`${_(label)}: ${value}${_(unit)}`}</Text>
      {subFields && (
        <View style={[atoms.pl_sm, atoms.gap_xs]}>
          {subFields.map(subField => (
            <NutritionalValue
              {...subField}
              nutrition={nutrition}
              key={`${field}/${subField.field}`}
            />
          ))}
        </View>
      )}
    </View>
  )
}
