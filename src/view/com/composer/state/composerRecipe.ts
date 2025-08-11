import {useReducer} from 'react'

import {type SelfLabel} from '#/lib/moderation'
import {type EmbedDraft} from './composer'

type TaggedUnion<Tag extends string, O extends object> = {
  [K in keyof O]: Record<Tag, K> & O[K]
}[keyof O]
//type ReplaceProps
// todo is there a commit hook to run prettier?
// todo consider whether individual steps, ingredients could potentially be their own records
type TextType = string // RichText

interface IngredientDraft {
  name: TextType
  quantity: string
  unit: string
}

interface StepDraft {
  text: TextType
  embed: EmbedDraft
}

export interface RecipePostDraft {
  title: TextType
  text: TextType
  ingredients: IngredientDraft[]
  steps: StepDraft[]
  embed?: EmbedDraft
  labels?: SelfLabel
  tags?: string[]
}

type Action = TaggedUnion<
  'type',
  {
    update_title: {value: TextType}
    update_main_text: {value: TextType}
    add_step: {}
    selected_step: number | null
    edit_step_text: {value: TextType}
    add_ingredient: {}
    edit_ingredient_text: {}
  }
>

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
    case 'selected_step':
    case 'edit_step_text':
    case 'add_ingredient':
    case 'edit_ingredient_text':
  }
  return state
}

export function useRecipePostReducer() {
  return useReducer(recipePostReducer, {
    title: '',
    text: '',
    ingredients: [],
    steps: [],
  })
}
