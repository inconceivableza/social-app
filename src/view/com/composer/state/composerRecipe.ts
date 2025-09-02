import { useReducer } from 'react'

import { type SelfLabel } from '#/lib/moderation'
import { EmbedAction, embedReducer, type EmbedDraft } from './composer'
import { nanoid } from 'nanoid/non-secure'

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
    embed?: EmbedDraft
}

export interface RecipePostDraft {
    id: string,
    title: TextType
    text: TextType
    ingredients: IngredientDraft[]
    steps: StepDraft[]
    embed: EmbedDraft
    labels: SelfLabel[]
    tags?: string[]
}

type Action = TaggedUnion<
    'type',
    {
        update_title: { value: TextType }
        update_main_text: { value: TextType, }
        add_step: {}
        edit_step_text: { value: TextType, index: number }
        add_ingredient: {}
        edit_ingredient: { value: TextType, prop: keyof IngredientDraft, index: number }
    }
    > | EmbedAction

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
            return { ...state, title: action.value }
        case 'update_main_text':
            return { ...state, text: action.value }
        case 'add_step':
            return { ...state, steps: state.steps.concat({ text: "" }) }
        case 'edit_step_text': {
            checkIndex(state.steps, action.index)
            // TODO: consider Immer to prevent unwanted nested mutations
            const steps = [...state.steps]
            steps[action.index] = { text: action.value }
            return { ...state, steps }
        }
        case 'add_ingredient': return { ...state, ingredients: state.ingredients.concat({ name: "", quantity: "0", unit: "" }) }
        case 'edit_ingredient': {
            checkIndex(state.ingredients, action.index)
            const ingredients = [...state.ingredients]
            ingredients[action.index] = { ...ingredients[action.index], [action.prop]: action.value }
            return { ...state, ingredients }
        }
        default: {
            const embedState = embedReducer(state, action)
            return {
                ...state,
                ...embedState
            }
        }
    }
}

export function useRecipePostReducer() {
    return useReducer(recipePostReducer, {
        id: nanoid(),
        title: '',
        text: '',
        ingredients: [],
        steps: [],
        labels: [],
        embed: {
            quote: undefined,
            media: undefined,
            link: undefined,
        },
    })
}
