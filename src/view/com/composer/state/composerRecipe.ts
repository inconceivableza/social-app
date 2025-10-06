import {useReducer} from 'react'
import {type AppFoodiosFeedRecipeRevision, RichText} from '@atproto/api'
import _ from 'lodash'
import {nanoid} from 'nanoid/non-secure'

import {type RecipePostView} from '#/lib/api/feed/utils'
import {type SelfLabel} from '#/lib/moderation'
import {type EmbedAction, type EmbedDraft, embedReducer} from './composer'

type TaggedUnion<Tag extends string, O extends object> = {
  [K in keyof O]: Record<Tag, K> & O[K]
}[keyof O]
type TextType = RichText

interface IngredientDraft {
  name: string
  quantity: string
  unit: string
}

interface StepDraft {
  text: string
  embed?: EmbedDraft
}

export interface RecipePostDraft {
  id: string
  title: TextType
  text: TextType
  ingredients: IngredientDraft[]
  steps: StepDraft[]
  embed: EmbedDraft
  labels: SelfLabel[]
  tags?: string[]
}

type Action =
  | TaggedUnion<
      'type',
      {
        update_title: {value: TextType}
        update_main_text: {value: TextType}
        add_step: {}
        edit_step_text: {value: string; index: number}
        add_ingredient: {}
        edit_ingredient: {
          value: string
          prop: keyof IngredientDraft
          index: number
        }
      }
    >
  | EmbedAction

function checkIndex(arr: unknown[], idx: number) {
  if (idx > arr.length - 1 || idx < 0) {
    throw new Error('Invalid index ' + idx)
  }
}

function recipePostReducer(
  state: RecipePostDraft,
  action: Action,
): RecipePostDraft {
  switch (action.type) {
    case 'update_title':
      return {...state, title: action.value}
    case 'update_main_text':
      return {...state, text: action.value}
    case 'add_step':
      return {
        ...state,
        steps: state.steps.concat({
          text: '',
        }),
      }
    case 'edit_step_text': {
      checkIndex(state.steps, action.index)
      // TODO: consider Immer to prevent unwanted nested mutations
      const steps = [...state.steps]
      steps[action.index] = {text: action.value}
      return {...state, steps}
    }
    case 'add_ingredient':
      return {
        ...state,
        ingredients: state.ingredients.concat({
          name: '',
          quantity: '0',
          unit: '',
        }),
      }
    case 'edit_ingredient': {
      checkIndex(state.ingredients, action.index)
      const ingredients = [...state.ingredients]
      ingredients[action.index] = {
        ...ingredients[action.index],
        [action.prop]: action.value,
      }
      return {...state, ingredients}
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

function embedToDraft(
  embed: AppFoodiosFeedRecipeRevision.Record['embed'],
): EmbedDraft {
  if (!embed)
    return {
      quote: undefined,
      media: undefined,
      link: undefined,
    }

  // if (AppBskyEmbedImages.isMain(embed)) {
  //     return {
  //         quote: undefined,
  //         media: {
  //             type: 'images',
  //             images: embed.images.map(({ alt, image, aspectRatio }) => ({
  //                 source: {
  //                     height: aspectRatio!.height,
  //                     width: aspectRatio!.width,
  //                     path: image.ref,
  //                     id: nanoid(),
  //                     mime: extToMimeType(fullsize)
  //                 },
  //                 alt
  //             }))
  //         },
  //         link: undefined,
  //     }
  // }
}

const initState = (init?: RecipePostView): RecipePostDraft => {
  if (!init)
    return {
      id: nanoid(),
      title: new RichText({
        text: '',
      }),
      text: new RichText({
        text: '',
      }),
      ingredients: [],
      steps: [],
      labels: [],
      embed: {
        quote: undefined,
        media: undefined,
        link: undefined,
      },
    }

  const {title, text, ingredients, steps, labels, embed} =
    init.record.revisionContent

  return {
    id: nanoid(), // TODO: think
    title: new RichText({
      text: title,
    }),
    text: new RichText({
      text,
    }),
    ingredients: _.cloneDeep(ingredients),
    steps: _.cloneDeep(steps),
    labels: _.cloneDeep(labels?.values ?? []),
    embed: embedToDraft(embed),
  }
}

export function useRecipePostReducer({edit}: {edit?: RecipePostView}) {
  return useReducer(recipePostReducer, initState(edit))
}
