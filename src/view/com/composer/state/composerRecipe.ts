import { useReducer } from 'react'

import { type SelfLabel } from '#/lib/moderation'
import { EmbedAction, embedReducer, type EmbedDraft } from './composer'
import { nanoid } from 'nanoid/non-secure'
import { AppBskyEmbedImages, AppFoodiosFeedRecipeRevision, AppFoodiosFeedRecipeRevisionRecord, RichText } from '@atproto/api'
import { RecipePostView } from '#/lib/api/feed/utils'
import _ from 'lodash'

type TaggedUnion<Tag extends string, O extends object> = {
    [K in keyof O]: Record<Tag, K> & O[K]
}[keyof O]
interface IngredientDraft {
    id: string
    name: string
    quantity: string
    unit: string
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

export interface RecipePostDraft {
    id: string,
    name: string
    text: RichText
    ingredients: IngredientDraft[]
    instructionSections: InstructionSectionDraft[]
    prepTime?: number
    cookTime?: number
    cuisines?: string[]
    categories?: string[]
    suitableForDiet?: string[]
    recipeYield?: unknown
    nutrition?: unknown
    attribution?: unknown
    embed: EmbedDraft
    labels: SelfLabel[]
    tags?: string[]
}


export type RecipeComposerAction = TaggedUnion<
    'type',
    {
        update_name: { value: string }
        update_main_text: { value: RichText, }
        add_instruction_section: { prevSectionId: string }
        remove_instruction_section: { sectionId: string }
        edit_section_name: { sectionId: string, value: string }
        add_instruction: { sectionId: string }
        edit_instruction_text: { value: string, sectionId: string, instructionId: string }
        remove_instruction: { sectionId: string, instructionId: string }
        add_ingredient: {}
        edit_ingredient: { value: string, prop: keyof IngredientDraft, id: string }
        remove_ingredient: { id: string }
        add_element: { field: "cuisines" | "categories" | "suitableForDiet", value: string }
        remove_element: { field: "cuisines" | "categories" | "suitableForDiet", value: string }
        set_prep_time: { value: number }
        set_cook_time: { value: number }
    } 
    > | EmbedAction

function findById<T extends { id: string }>(arr: T[], id: string) {
    const result = arr.find((section) => section.id === id)
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
            const sectionIdx = sections.findIndex(section => section.id === action.prevSectionId)
            if (sectionIdx < 0) {
                throw new Error("Invalid section id " + action.prevSectionId)
            }
            sections.splice(sectionIdx, 1, sections[sectionIdx], newSection())
            return state
        } case 'edit_section_name': {
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
            const idx = sections.findIndex(({ id }) => id === action.sectionId)
            if (idx < 0) {
                throw new Error('Invalid section id ' + action.sectionId)
            }
            sections.splice(idx, 1)
            // If there's one remaining section, remove the name so that we revert to the simple view
            if (sections.length === 1) {
                delete sections[0].name
            }
            if (!sections.length) {
                sections.push(newSection())
            }
            return state
        }
        case 'remove_instruction': {
            const section = findById(state.instructionSections, action.sectionId)
            const idx = section.instructions.findIndex(({ id }) => id === action.instructionId)
            if (idx < 0) {
                throw new Error('Invalid instruction id ' + action.sectionId)
            }
            section.instructions.splice(idx, 1)
            if (!section.instructions.length) {
                section.instructions.push(newInstruction())
            }
            return state
        }
        case 'add_ingredient': {
            state.ingredients.push(newIngredient())
            return state
        }
        case 'edit_ingredient': {
            const ingredient = findById(state.ingredients, action.id)
            ingredient[action.prop] = action.value
            return state
        }
        case 'remove_ingredient': {
            const idx = state.ingredients.findIndex(({ id }) => id === action.id)
            if (idx < 0) {
                throw new Error('Invalid id ' + action.id)
            }
            state.ingredients.splice(idx, 1)
            if (!state.ingredients.length) {
                state.ingredients.push(newIngredient())
            }
            return state
        }
        case 'add_element': {
            if (state[action.field]?.includes(action.value)) {
                return state
            }
            const arr = state[action.field] ??= []
            arr.push(action.value)
            return state
        }
        case 'remove_element': {
            const arr = state[action.field]
            if (!arr) return state;
            const idx = arr.indexOf(action.value)
            if (idx < 0) {
                return state
            }
            arr.splice(idx, 1)
            return state
        }
        case 'set_cook_time': {
            state.cookTime = action.value
            return state
        }
        case 'set_prep_time': {
            state.prepTime = action.value
            return state
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

function newIngredient(): IngredientDraft {
    return {
        id: nanoid(),
        name: '',
        quantity: '',
        unit: ''
    }
}

function newInstruction(): InstructionDraft {
    return {
        id: nanoid(),
        text: ''
    }
}

function newSection(): InstructionSectionDraft {
    return {
        id: nanoid(),
        instructions: [
            newInstruction()
        ]
    }
}

// TODO: fix
function embedToDraft(embed: AppFoodiosFeedRecipeRevision.Record["embed"]): EmbedDraft {
    //if (!embed) 
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
    if (!init) return {
        id: nanoid(),
        name: '',
        text: new RichText({
            text: ''
        }),
        ingredients: [newIngredient()],
        instructionSections: [newSection()],
        labels: [],
        embed: {
            quote: undefined,
            media: undefined,
            link: undefined,
        },
    }

    const { name, text, facets, ingredients, instructionSections, labels, embed,
        recipeCuisine, recipeCategory, prepTime, cookingTime
    } = init.record.revisionContent

    return {
        id: nanoid(),
        name,
        text: new RichText({
            text,
            facets
        }),
        ingredients: ingredients.map(ingredient => ({ ...ingredient, id: nanoid() })),
        instructionSections: instructionSections.length ? instructionSections.map(section => ({
            ...section, id: nanoid(),
            instructions: section.instructions.map((instruction) => ({ ...instruction, id: nanoid() }))
        })) : [newSection()],
        labels: _.cloneDeep(labels?.values ?? []),
        embed: embedToDraft(embed),
        cuisines: recipeCuisine,
        categories: recipeCategory,

    }
}

export function useRecipePostReducer({ edit }: { edit?: RecipePostView }) {
    return useReducer(recipePostReducer, initState(edit))
}
