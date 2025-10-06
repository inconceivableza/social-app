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

interface InstructionDraft {
  text: string
  embed?: EmbedDraft
}

interface InstructionSectionDraft {
  name?: string
  instructions: InstructionDraft[]
  embed?: EmbedDraft
}

export interface RecipePostDraft {
  id: string
  name: TextType
  text: TextType
  ingredients: IngredientDraft[]
  instructionSections: InstructionSectionDraft[]
  embed: EmbedDraft
  labels: SelfLabel[]
  tags?: string[]
}

type Action =
  | TaggedUnion<
      'type',
      {
        update_name: {value: TextType}
        update_main_text: {value: TextType}
        set_instruction_section_name: {index: number; value: string}
        add_instruction_section: {}
        add_instruction: {sectionIndex: number}
        edit_instruction_text: {
          value: string
          sectionIndex: number
          instructionIndex: number
        }
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
    case 'update_name':
      return {...state, name: action.value}
    case 'update_main_text':
      return {...state, text: action.value}
    case 'set_instruction_section_name':
      return {
        ...state,
        instructionSections: state.instructionSections.map((section, idx) =>
          idx === action.index
            ? {
                ...section,
                name: action.value,
              }
            : section,
        ),
      }
    case 'add_instruction_section':
      return {
        ...state,
        instructionSections: state.instructionSections.concat({
          instructions: [],
        }),
      }
    case 'add_instruction':
      checkIndex(state.instructionSections, action.sectionIndex)
      return {
        ...state,
        instructionSections: state.instructionSections.map((section, idx) =>
          idx === action.sectionIndex
            ? {
                ...section,
                instructions: section.instructions.concat({text: ''}),
              }
            : section,
        ),
      }
    case 'edit_instruction_text': {
      checkIndex(state.instructionSections, action.sectionIndex)
      checkIndex(
        state.instructionSections[action.sectionIndex].instructions,
        action.instructionIndex,
      )
      // TODO: consider Immer to prevent unwanted nested mutations
      return {
        ...state,
        instructionSections: state.instructionSections.map((section, idx) =>
          idx === action.sectionIndex
            ? {
                ...section,
                instructions: section.instructions.map((inst, i) =>
                  i === action.instructionIndex
                    ? {...inst, text: action.value}
                    : inst,
                ),
              }
            : section,
        ),
      }
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
      name: new RichText({
        text: '',
      }),
      text: new RichText({
        text: '',
      }),
      ingredients: [],
      instructionSections: [],
      labels: [],
      embed: {
        quote: undefined,
        media: undefined,
        link: undefined,
      },
    }

  const {name, text, ingredients, instructionSections, labels, embed} =
    init.record.revisionContent

  return {
    id: nanoid(), // TODO: think
    name: new RichText({
      text: name,
    }),
    text: new RichText({
      text,
    }),
    ingredients: _.cloneDeep(ingredients),
    instructionSections: _.cloneDeep(instructionSections),
    labels: _.cloneDeep(labels?.values ?? []),
    embed: embedToDraft(embed),
  }
}

export function useRecipePostReducer({edit}: {edit?: RecipePostView}) {
  return useReducer(recipePostReducer, initState(edit))
}
