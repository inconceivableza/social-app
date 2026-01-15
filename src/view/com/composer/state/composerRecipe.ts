import {useMemo, useReducer} from 'react'
import {
  AppBskyEmbedImages,
  type AppBskyFeedDefs,
  type AppFoodiosFeedRecipeRevision,
  RichText,
} from '@atproto/api'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import _ from 'lodash'
import {nanoid} from 'nanoid/non-secure'
import z from 'zod'

import {type RecipePostView} from '#/lib/api/feed/utils'
import {type SelfLabel} from '#/lib/moderation'
import {isNative} from '#/platform/detection'
import {type Attribution} from '../recipe/RecipeAttribution'
import {type EmbedAction, type EmbedDraft, embedReducer} from './composer'
import {
  type HierarchyOption,
  recipeCategories,
  recipeCuisines,
  recipeDiets,
} from './dataRecipe'

type TaggedUnion<Tag extends string, O extends object> = {
  [K in keyof O]: Record<Tag, K> & O[K]
}[keyof O]
interface IngredientDraft {
  id: string
  name: string
  quantity: string
  unit: string
}
interface IngredientSectionDraft {
  id: string
  name?: string
  ingredients: IngredientDraft[]
}

interface InstructionDraft {
  id: string
  text: string
  embed?: EmbedDraft
}

interface InstructionSectionDraft {
  id: string
  name?: string
  instructions: InstructionDraft[]
}

type NutritionDraft = Omit<AppFoodiosFeedRecipeRevision.Nutrition, '$type'>

export interface RecipePostDraft {
  id: string
  name: string
  text: RichText
  ingredientSections: IngredientSectionDraft[]
  instructionSections: InstructionSectionDraft[]
  prepTime?: string
  cookTime?: string
  recipeCuisines?: HierarchyOption[]
  recipeCategories?: HierarchyOption[]
  recipeDiets?: HierarchyOption[]
  recipeYield?: {quantity?: string; unit: string}
  nutrition?: NutritionDraft
  attribution?: Attribution
  embed: EmbedDraft
  labels: SelfLabel[]
  tags?: string[]
}

export type RecipeComposerAction =
  | TaggedUnion<
      'type',
      {
        update_name: {value: string}
        update_main_text: {value: RichText}
        add_instruction_section: {prevSectionId: string}
        remove_instruction_section: {sectionId: string}
        edit_instruction_section_name: {sectionId: string; value: string}
        add_instruction: {sectionId: string}
        edit_instruction_text: {
          value: string
          sectionId: string
          instructionId: string
        }
        remove_instruction: {sectionId: string; instructionId: string}
        add_ingredient_section: {prevSectionId: string}
        remove_ingredient_section: {sectionId: string}
        edit_ingredient_section_name: {sectionId: string; value: string}
        add_ingredient: {sectionId: string}
        edit_ingredient: {
          value: string
          prop: keyof IngredientDraft
          sectionId: string
          ingredientId: string
        }
        remove_ingredient: {sectionId: string; ingredientId: string}
        add_element: {
          field: 'recipeCuisines' | 'recipeCategories' | 'recipeDiets'
          value: HierarchyOption
        }
        remove_element: {
          field: 'recipeCuisines' | 'recipeCategories' | 'recipeDiets'
          value: HierarchyOption
        }
        set_prep_time: {value: string}
        set_cook_time: {value: string}
        set_yield: {field: 'quantity' | 'unit'; value: string}
        set_nutrition_serving: {field: 'quantity' | 'unit'; value: string}
        update_nutrition: {
          field: Exclude<keyof NutritionDraft, 'servingSize'>
          value: string
        }
        clear_nutrition: {}
        update_attribution: {value?: Attribution}
      }
    >
  | EmbedAction

function findById<T extends {id: string}>(arr: T[], id: string) {
  const result = arr.find(section => section.id === id)
  if (!result) {
    throw new Error('Invalid id ' + id)
  }
  return result
}

function recipePostReducer(
  state: RecipePostDraft,
  action: RecipeComposerAction,
): RecipePostDraft {
  state = _.cloneDeep(state)
  switch (action.type) {
    case 'update_name':
      state.name = action.value
      return state
    case 'update_main_text':
      state.text = action.value
      return state
    case 'add_instruction_section': {
      const sections = state.instructionSections
      const sectionIdx = sections.findIndex(
        section => section.id === action.prevSectionId,
      )
      if (sectionIdx < 0) {
        throw new Error('Invalid section id ' + action.prevSectionId)
      }
      sections.splice(
        sectionIdx,
        1,
        sections[sectionIdx],
        newInstructionSection(),
      )
      return state
    }
    case 'edit_instruction_section_name': {
      const section = findById(state.instructionSections, action.sectionId)
      section.name = action.value
      return state
    }
    case 'add_instruction': {
      const section = findById(state.instructionSections, action.sectionId)
      section.instructions.push(newInstruction())
      return state
    }
    case 'edit_instruction_text': {
      const section = findById(state.instructionSections, action.sectionId)
      const instruction = findById(section.instructions, action.instructionId)
      instruction.text = action.value
      return state
    }
    case 'remove_instruction_section': {
      const sections = state.instructionSections
      const idx = sections.findIndex(({id}) => id === action.sectionId)
      if (idx < 0) {
        throw new Error('Invalid section id ' + action.sectionId)
      }
      sections.splice(idx, 1)
      // If there's one remaining section, remove the name so that we revert to the simple view
      if (sections.length === 1) {
        delete sections[0].name
      }
      if (!sections.length) {
        sections.push(newInstructionSection())
      }
      return state
    }
    case 'remove_instruction': {
      const section = findById(state.instructionSections, action.sectionId)
      const idx = section.instructions.findIndex(
        ({id}) => id === action.instructionId,
      )
      if (idx < 0) {
        throw new Error('Invalid instruction id ' + action.sectionId)
      }
      section.instructions.splice(idx, 1)
      if (!section.instructions.length) {
        section.instructions.push(newInstruction())
      }
      return state
    }
    case 'add_ingredient_section': {
      const sections = state.ingredientSections
      const sectionIdx = sections.findIndex(
        section => section.id === action.prevSectionId,
      )
      if (sectionIdx < 0) {
        throw new Error('Invalid section id ' + action.prevSectionId)
      }
      sections.splice(
        sectionIdx,
        1,
        sections[sectionIdx],
        newIngredientSection(),
      )
      return state
    }
    case 'remove_ingredient_section': {
      const sections = state.ingredientSections
      const idx = sections.findIndex(({id}) => id === action.sectionId)
      if (idx < 0) {
        throw new Error('Invalid section id ' + action.sectionId)
      }
      sections.splice(idx, 1)
      // If there's one remaining section, remove the name so that we revert to the simple view
      if (sections.length === 1) {
        delete sections[0].name
      }
      if (!sections.length) {
        sections.push(newIngredientSection())
      }
      return state
    }
    case 'edit_ingredient_section_name': {
      const section = findById(state.ingredientSections, action.sectionId)
      section.name = action.value
      return state
    }
    case 'add_ingredient': {
      const section = findById(state.ingredientSections, action.sectionId)
      section.ingredients.push(newIngredient())
      return state
    }
    case 'edit_ingredient': {
      const section = findById(state.ingredientSections, action.sectionId)
      const ingredient = findById(section.ingredients, action.ingredientId)
      ingredient[action.prop] = action.value
      return state
    }
    case 'remove_ingredient': {
      const section = findById(state.ingredientSections, action.sectionId)
      const idx = section.ingredients.findIndex(
        ({id}) => id === action.ingredientId,
      )
      if (idx < 0) {
        throw new Error('Invalid ingredient id ' + action.sectionId)
      }
      section.ingredients.splice(idx, 1)
      if (!section.ingredients.length) {
        section.ingredients.push(newIngredient())
      }
      return state
    }
    case 'add_element': {
      if (state[action.field]?.find(({id}) => id === action.value.id)) {
        return state
      }
      const arr = (state[action.field] ??= [])
      arr.push(action.value)
      return state
    }
    case 'remove_element': {
      const arr = state[action.field]
      if (!arr) return state
      const idx = arr.findIndex(opt => opt.id === action.value.id)
      if (idx < 0) {
        return state
      }
      arr.splice(idx, 1)
      return state
    }
    case 'set_cook_time': {
      if (action.value === '') delete state.cookTime
      else state.cookTime = action.value
      return state
    }
    case 'set_prep_time': {
      if (action.value === '') delete state.prepTime
      else state.prepTime = action.value
      return state
    }
    case 'set_yield': {
      if (action.field === 'quantity' && !action.value) {
        delete state.recipeYield?.quantity
        return state
      }
      const recipeYield = (state.recipeYield ??= {quantity: '0', unit: ''})
      recipeYield[action.field] = action.value
      return state
    }
    case 'set_nutrition_serving': {
      const nutrition = (state.nutrition ??= {
        servingSize: {quantity: '0', unit: ''},
        energy: '0',
      })
      nutrition.servingSize[action.field] = action.value
      return state
    }
    case 'update_nutrition': {
      const nutrition = (state.nutrition ??= {
        servingSize: {quantity: '0', unit: ''},
        energy: '0',
      })
      nutrition[action.field] = action.value
      return state
    }
    case 'clear_nutrition': {
      delete state.nutrition
      return state
    }
    case 'update_attribution': {
      state.attribution = action.value
      return state
    }

    default: {
      const embedState = embedReducer(state, action)
      return {
        ...state,
        ...embedState,
      }
    }
  }
}

function newIngredient(): IngredientDraft {
  return {
    id: nanoid(),
    name: '',
    quantity: '',
    unit: '',
  }
}

function newInstruction(): InstructionDraft {
  return {
    id: nanoid(),
    text: '',
  }
}

function newInstructionSection(): InstructionSectionDraft {
  return {
    id: nanoid(),
    instructions: [newInstruction()],
  }
}

function newIngredientSection(): IngredientSectionDraft {
  return {
    id: nanoid(),
    ingredients: [newIngredient()],
  }
}

const SUPPORTED_IMAGE_MIME_TYPES: Array<string> = (
  [
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/svg+xml',
    'image/webp',
    'image/avif',
    isNative ? '' : 'image/heic',
  ] as const
).filter(Boolean)

function imageExtToMimeType(extension: string) {
  const extMap: Record<string, string> = {jpg: 'jpeg', svg: 'svg+xml'}
  const ext = extension.toLowerCase()
  const potMime = 'image/' + (extMap[ext] ?? ext)
  if (SUPPORTED_IMAGE_MIME_TYPES.includes(potMime)) {
    return potMime
  }
  return null
}

function getExt(path: string) {
  const lastAt = path.lastIndexOf('@')
  const lastDot = path.lastIndexOf('.')
  const pos = lastAt > lastDot ? lastAt : lastDot
  return pos === -1 ? '' : path.substring(pos + 1)
}

function embedToDraft(
  postEmbed: AppBskyFeedDefs.PostView['embed'],
  recordEmbed: AppFoodiosFeedRecipeRevision.Record['embed'],
): EmbedDraft {
  if (!postEmbed || !recordEmbed)
    return {
      quote: undefined,
      media: undefined,
      link: undefined,
    }

  if (
    AppBskyEmbedImages.isView(postEmbed) &&
    AppBskyEmbedImages.isMain(recordEmbed)
  ) {
    return {
      quote: undefined,
      media: {
        type: 'images',
        images: postEmbed.images.map(
          ({alt, fullsize, thumb, aspectRatio}, index) => ({
            source: {
              height: aspectRatio!.height,
              width: aspectRatio!.width,
              path: `cid:${recordEmbed.images[index].image.ref.toString()}`,
              fullsize: fullsize,
              thumb: thumb,
              size: recordEmbed.images[index].image.size,
              id: nanoid(),
              mime: imageExtToMimeType(getExt(fullsize)) ?? 'image/unknown',
            },
            alt,
          }),
        ),
      },
      link: undefined,
    }
  }

  return {
    quote: undefined,
    media: undefined,
    link: undefined,
  }
}

const initState = (init?: RecipePostView): RecipePostDraft => {
  if (!init)
    return {
      id: nanoid(),
      name: '',
      text: new RichText({
        text: '',
      }),
      ingredientSections: [newIngredientSection()],
      instructionSections: [newInstructionSection()],
      labels: [],
      embed: {
        quote: undefined,
        media: undefined,
        link: undefined,
      },
      recipeYield: {unit: 'servings'},
    }

  const {
    name,
    text,
    facets,
    ingredientSections,
    instructionSections,
    labels,
    embed: recordEmbed,
    recipeCuisine,
    recipeCategory,
    prepTime,
    cookingTime,
    attribution,
    nutrition,
    recipeYield,
    suitableForDiet,
    tags,
  } = init.record.revisionContent
  const {embed: postEmbed} = init

  return {
    id: nanoid(),
    name,
    text: new RichText({
      text,
      facets,
    }),
    ingredientSections: ingredientSections.length
      ? ingredientSections.map(({name, ingredients}) => ({
          name,
          id: nanoid(),
          ingredients: ingredients.map(ingredient => ({
            ...ingredient,
            id: nanoid(),
          })),
        }))
      : [newIngredientSection()],
    instructionSections: instructionSections.length
      ? instructionSections.map(({name, instructions}) => ({
          name,
          id: nanoid(),
          instructions: instructions.map(instruction => ({
            ...instruction,
            id: nanoid(),
          })),
        }))
      : [newInstructionSection()],
    labels: labels && 'values' in labels ? labels.values.map(v => v.val) : [],
    embed: embedToDraft(postEmbed, recordEmbed),
    recipeCuisines: recipeCuisine
      ?.map(path => recipeCuisines.lookup[path.split('/').at(-1) ?? ''])
      .filter(Boolean),
    recipeCategories: recipeCategory
      ?.map(path => recipeCategories.lookup[path.split('/').at(-1) ?? ''])
      .filter(Boolean),
    recipeDiets: suitableForDiet
      ?.map(path => recipeDiets.lookup[path.split('/').at(-1) ?? ''])
      .filter(Boolean),
    cookTime: cookingTime,
    prepTime,
    attribution,
    nutrition,
    recipeYield,
    tags,
  }
}

function preprocessState(state: RecipePostDraft) {
  state = _.cloneDeep(state)
  state.instructionSections.forEach(section => {
    section.instructions = section.instructions.filter(({text}) => !!text)
  })
  state.ingredientSections.forEach(section => {
    section.ingredients = section.ingredients.filter(
      ({name, quantity, unit}) => !!(name || quantity || unit),
    )
  })
  return state
}

export function useRecipePostReducer({edit}: {edit?: RecipePostView}) {
  const {_} = useLingui()
  const [state, dispatch] = useReducer(recipePostReducer, initState(edit))

  const schema = useMemo(() => createRecipePostDraftSchema(_), [_])

  const errors = useMemo(() => {
    const validationResult = schema.safeParse(preprocessState(state))
    const flat = validationResult.error?.errors
    if (!flat) return undefined
    return {
      flat,
      tree: validationResult.error?.format(),
    }
  }, [state, schema])

  return {state, dispatch, errors} as const
}

export type RecipeReducerOutput = ReturnType<typeof useRecipePostReducer>

// TODO: Provide localizable errors for all

function createRecipePostDraftSchema(
  _: (descriptor: {id: string; message?: string}) => string,
) {
  const ingredientDraftSchema = z.object({
    id: z.string(),
    name: z.string().min(1, _(msg`Ingredient name cannot be empty`)),
    quantity: z.coerce
      .number({
        errorMap: () => ({
          message: _(msg`Ingredient quantity must be a number`),
        }),
      })
      .optional(),
    unit: z.string(),
  })

  const ingredientSectionDraftSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    ingredients: z
      .array(ingredientDraftSchema)
      .min(1, _(msg`At least one ingredient per section required`)),
  })

  const instructionDraftSchema = z.object({
    id: z.string(),
    text: z.string().min(1, _(msg`Instruction text cannot be empty`)),
    embed: z.any().optional(), // EmbedDraft - using any for simplicity, can be refined
  })

  const instructionSectionDraftSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    instructions: z
      .array(instructionDraftSchema)
      .min(1, _(msg`At least one instruction per section required`)),
  })

  const nutritionServingSizeSchema = z.object({
    quantity: z.coerce.number({
      errorMap: () => ({
        message: _(msg`Serving size quantity must be a number`),
      }),
    }),
    unit: z.string(),
  })

  const nutritionDraftSchema = z.object({
    servingSize: nutritionServingSizeSchema,
    energy: z.coerce
      .number({
        errorMap: () => ({
          message: _(msg`Energy value must be a number`),
        }),
      })
      .optional(),
    carbohydrateContent: z.coerce
      .number({
        errorMap: () => ({
          message: _(msg`Carbohydrate content must be a number`),
        }),
      })
      .optional(),
    proteinContent: z.coerce
      .number({
        errorMap: () => ({
          message: _(msg`Protein content must be a number`),
        }),
      })
      .optional(),
    fatContent: z.coerce
      .number({
        errorMap: () => ({
          message: _(msg`Fat content must be a number`),
        }),
      })
      .optional(),
    fiberContent: z.coerce
      .number({
        errorMap: () => ({
          message: _(msg`Fiber content must be a number`),
        }),
      })
      .optional(),
    sugarContent: z.coerce
      .number({
        errorMap: () => ({
          message: _(msg`Sugar content must be a number`),
        }),
      })
      .optional(),
    sodiumContent: z.coerce
      .number({
        errorMap: () => ({
          message: _(msg`Sodium content must be a number`),
        }),
      })
      .optional(),
    cholesterolContent: z.coerce
      .number({
        errorMap: () => ({
          message: _(msg`Cholesterol content must be a number`),
        }),
      })
      .optional(),
    saturatedFatContent: z.coerce
      .number({
        errorMap: () => ({
          message: _(msg`Saturated fat content must be a number`),
        }),
      })
      .optional(),
    transFatContent: z.coerce
      .number({
        errorMap: () => ({
          message: _(msg`Trans fat content must be a number`),
        }),
      })
      .optional(),
    unsaturatedFatContent: z.coerce
      .number({
        errorMap: () => ({
          message: _(msg`Unsaturated fat content must be a number`),
        }),
      })
      .optional(),
  })

  const recipeYieldSchema = z.object({
    quantity: z.undefined().or(
      z.coerce
        .number({
          errorMap: () => ({
            message: _(msg`Recipe yield quantity must be a number`),
          }),
        })
        .positive(_(msg`Recipe yield quantity must be greater than zero`)),
    ),
    unit: z.string().optional(), // .min(1, _(msg`Recipe yield unit cannot be empty`)),
  })

  const licenseSchema = z.discriminatedUnion('$type', [
    z.object({
      $type: z.literal('app.foodios.feed.defs#licenseAllRights'),
      licenseType: z.literal('licenseAllRights'),
    }),
    z.object({
      $type: z.literal('app.foodios.feed.defs#licenseCreativeCommonsBy'),
      licenseType: z.literal('licenseCreativeCommonsBy'),
    }),
    z.object({
      $type: z.literal('app.foodios.feed.defs#licenseCreativeCommonsBySa'),
      licenseType: z.literal('licenseCreativeCommonsBySa'),
    }),
    z.object({
      $type: z.literal('app.foodios.feed.defs#licenseCreativeCommonsByNc'),
      licenseType: z.literal('licenseCreativeCommonsByNc'),
    }),
    z.object({
      $type: z.literal('app.foodios.feed.defs#licenseCreativeCommonsByNcSa'),
      licenseType: z.literal('licenseCreativeCommonsByNcSa'),
    }),
    z.object({
      $type: z.literal('app.foodios.feed.defs#licensePublicDomain'),
      licenseType: z.literal('licensePublicDomain'),
    }),
  ])

  const publicationTypeSchema = z.discriminatedUnion('$type', [
    z.object({
      $type: z.literal('app.foodios.feed.defs#publicationTypeBook'),
      publicationType: z.literal('publicationTypeBook'),
    }),
    z.object({
      $type: z.literal('app.foodios.feed.defs#publicationTypeMagazine'),
      publicationType: z.literal('publicationTypeMagazine'),
    }),
  ])

  const originalAttributionSchema = z.object({
    $type: z.literal('app.foodios.feed.recipeRevision#originalAttribution'),
    type: z.literal('original'),
    license: licenseSchema,
    url: z
      .string()
      .url(_(msg`Invalid URL (must include protocol e.g. http://)`))
      .optional(),
  })

  const personAttributionSchema = z.object({
    $type: z.literal('app.foodios.feed.recipeRevision#personAttribution'),
    type: z.literal('person'),
    name: z.string().min(1, _(msg`Person attribution name cannot be empty`)),
    url: z
      .string()
      .url(_(msg`Invalid URL (must include protocol e.g. http://)`))
      .optional(),
    notes: z.string().optional(),
  })

  const publicationAttributionSchema = z.object({
    $type: z.literal('app.foodios.feed.recipeRevision#publicationAttribution'),
    type: z.literal('publication'),
    publicationType: publicationTypeSchema,
    title: z
      .string()
      .min(1, _(msg`Publication attribution title cannot be empty`)),
    author: z
      .string()
      .min(1, _(msg`Publication attribution author cannot be empty`)),
    publisher: z.string().optional(),
    isbn: z.string().optional(),
    page: z.number().optional(),
    url: z
      .string()
      .url(_(msg`Invalid URL (must include protocol e.g. http://)`))
      .optional(),
    notes: z.string().optional(),
  })

  const websiteAttributionSchema = z.object({
    $type: z.literal('app.foodios.feed.recipeRevision#websiteAttribution'),
    type: z.literal('website'),
    name: z.string().min(1, _(msg`Website attribution name cannot be empty`)),
    url: z
      .string()
      .url(_(msg`Invalid URL (must include protocol e.g. http://)`)),
    notes: z.string().optional(),
  })

  const showAttributionSchema = z.object({
    $type: z.literal('app.foodios.feed.recipeRevision#showAttribution'),
    type: z.literal('show'),
    title: z.string().min(1, _(msg`Show attribution title cannot be empty`)),
    episode: z.string().optional(),
    network: z
      .string()
      .min(1, _(msg`Show attribution network cannot be empty`)),
    airDate: z.string().optional(),
    url: z
      .string()
      .url(_(msg`Invalid URL (must include protocol e.g. http://)`))
      .optional(),
    notes: z.string().optional(),
  })

  const productAttributionSchema = z.object({
    $type: z.literal('app.foodios.feed.recipeRevision#productAttribution'),
    type: z.literal('product'),
    brand: z.string().min(1, _(msg`Product attribution brand cannot be empty`)),
    name: z.string().min(1, _(msg`Product attribution name cannot be empty`)),
    upc: z.string().optional(),
    url: z
      .string()
      .url(_(msg`Invalid URL (must include protocol e.g. http://)`))
      .optional(),
    notes: z.string().optional(),
  })

  const attributionSchema = z.discriminatedUnion('type', [
    originalAttributionSchema,
    personAttributionSchema,
    publicationAttributionSchema,
    websiteAttributionSchema,
    showAttributionSchema,
    productAttributionSchema,
  ])

  const selfLabelSchema = z.enum(['sexual', 'nudity', 'porn', 'graphic-media'])

  const recipeDraftSchema = z.object({
    name: z.string().min(1, _(msg`Name cannot be empty`)),
    text: z.instanceof(RichText).optional(),
    ingredientSections: z
      .array(ingredientSectionDraftSchema)
      .min(1, _(msg`At least one ingredient required`)),
    instructionSections: z
      .array(instructionSectionDraftSchema)
      .min(1, _(msg`At least one instruction required`)),
    prepTime: z.coerce
      .number({
        errorMap: () => ({
          message: _(msg`Preparation time must be a number`),
        }),
      })
      .min(1, _(msg`Preparation time must be greater than zero`))
      .optional(),
    cookTime: z.coerce
      .number({
        errorMap: () => ({
          message: _(msg`Cooking time must be a number`),
        }),
      })
      .min(1, _(msg`Cooking time must be greater than zero`))
      .optional(),
    cuisines: z
      .array(recipeCuisines.schema)
      .max(10, _(msg`Too many cuisines selected`))
      .optional(),
    categories: z
      .array(recipeCategories.schema)
      .max(10, _(msg`Too many categories selected`))
      .optional(),
    suitableForDiet: z
      .array(recipeDiets.schema)
      .max(10, _(msg`Too many diets selected`))
      .optional(),
    recipeYield: recipeYieldSchema.optional(),
    nutrition: nutritionDraftSchema.optional(),
    attribution: attributionSchema.optional(),
    //embed: embedDraftSchema,
    labels: z.array(selfLabelSchema),
    tags: z.array(z.string()).optional(),
  })
  return recipeDraftSchema
}
