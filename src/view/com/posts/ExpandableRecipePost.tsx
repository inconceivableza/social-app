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
      {!!(
        record.recipeCategory?.length ||
        record.suitableForDiet?.length ||
        record.recipeCuisine?.length
      ) && (
        <View style={[a.gap_xs, a.py_sm]}>
          {record.recipeCategory?.length ? (
            <View style={[a.flex_row, a.align_baseline, a.gap_sm]}>
              <Text style={[a.font_medium]}>{`${plural(
                record.recipeCategory.length,
                {
                  one: 'Category',
                  other: 'Categories',
                },
              )}:`}</Text>
              <View style={[a.flex_row, a.gap_xs, a.flex_wrap, a.flex_1]}>
                {dedupHierarchyOptions(
                  record.recipeCategory.flatMap(path => {
                    const option = pathToHierarchyOption(path, recipeCategories)
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

          {record.suitableForDiet?.length ? (
            <View style={[a.flex_row, a.align_baseline, a.gap_sm]}>
              <Text style={[a.font_medium]}>{`${plural(
                record.suitableForDiet.length,
                {
                  one: 'Suitable for diet',
                  other: 'Suitable for diets',
                },
              )}:`}</Text>
              <View style={[a.flex_row, a.gap_xs, a.flex_wrap, a.flex_1]}>
                {dedupHierarchyOptions(
                  record.suitableForDiet.flatMap(path => {
                    const option = pathToHierarchyOption(path, recipeDiets)
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

          {record.recipeCuisine?.length ? (
            <View style={[a.flex_row, a.align_baseline, a.gap_sm]}>
              <Text style={[a.font_medium]}>{`${plural(
                record.recipeCuisine.length,
                {
                  one: 'Cuisine',
                  other: 'Cuisines',
                },
              )}:`}</Text>
              <View style={[a.flex_row, a.gap_xs, a.flex_wrap, a.flex_1]}>
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
      )}
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
              <View style={[a.py_2xs, a.flex_row, a.align_baseline, a.gap_sm]}>
                <Text style={[a.font_medium]}>{`${_(msg`Prep:`)}`}</Text>
                <View style={[a.flex_row, a.gap_xs, a.flex_wrap, a.flex_1]}>
                  <Text>{`${plural(record.prepTime, {
                    one: '# minute',
                    other: '# minutes',
                  })}`}</Text>
                </View>
              </View>
            ) : null}

            {record.cookingTime ? (
              <View style={[a.py_2xs, a.flex_row, a.align_baseline, a.gap_sm]}>
                <Text style={[a.font_medium]}>{`${_(msg`Cook:`)}`}</Text>
                <View style={[a.flex_row, a.gap_xs, a.flex_wrap, a.flex_1]}>
                  <Text>{`${record.cookingTime} ${_(msg`minutes`)}`}</Text>
                </View>
              </View>
            ) : null}

            {record.recipeYield ? (
              <View style={[a.py_2xs, a.flex_row, a.align_baseline, a.gap_sm]}>
                <Text style={[a.font_medium]}>{`${_(msg`Yield:`)}`}</Text>
                <View style={[a.flex_row, a.gap_xs, a.flex_wrap, a.flex_1]}>
                  <Text>{`${record.recipeYield.quantity} ${record.recipeYield.unit}`}</Text>
                </View>
              </View>
            ) : null}
          </View>
          <View>
            <Text style={[a.text_lg, t.atoms.text_contrast_medium]}>
              <Trans context="recipe">Ingredients</Trans>
            </Text>
          </View>
          <View style={a.gap_sm}>
            {record.ingredientSections.map((section, i) => {
              return <IngredientsSection key={i} section={section} />
            })}
          </View>
          <View>
            <Text style={[a.text_lg, t.atoms.text_contrast_medium]}>
              <Trans context="recipe">Instructions</Trans>
            </Text>
          </View>
          <View style={a.gap_xs}>
            {record.instructionSections.map(
              ({name, instructions}, sectionIdx) => {
                return (
                  <View key={sectionIdx} style={a.gap_xs}>
                    {name && (
                      <Text emoji style={[a.font_bold]}>
                        {name}
                      </Text>
                    )}
                    <View style={[a.ml_sm]}>
                      {instructions.map((instruction, instructionIdx) => (
                        <View key={instructionIdx} style={[a.py_xs]}>
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

function IngredientsSection({
  section,
}: {
  section: AppFoodiosFeedRecipeRevision.IngredientSection
}) {
  return (
    <View style={a.gap_xs}>
      {section.name && (
        <Text emoji style={[a.font_bold]}>
          {section.name}
        </Text>
      )}
      <View style={[a.ml_sm]}>
        {section.ingredients.map((ingredient, i) => {
          return (
            <View key={i} style={[a.flex_row, a.gap_sm, a.py_xs]}>
              <Text emoji>
                {[ingredient.quantity, ingredient.unit, ingredient.name]
                  .filter(Boolean)
                  .join(' ')}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

// TODO licensing website

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
  const hasSubFields =
    (subFields || []).map(subfield => nutrition[subfield.field]).filter(Boolean)
      .length > 0
  if (!value && !hasSubFields) {
    return null
  }
  return (
    <View key={field} style={atoms.gap_xs}>
      {value && <Text>{`${_(label)}: ${value}${_(unit)}`}</Text>}
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
