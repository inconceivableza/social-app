import { ComboBox } from "#/components/forms/ComboBox";
import { recipeCuisines, recipeCategories, recipeDiets, type HierarchyOption, ProcessedHierarchy, pathToHierarchyOption } from "#/view/com/composer/state/dataRecipe";
import { View } from "react-native";
import { cloneDeep } from 'lodash'
import { Dispatch, useReducer } from "react";
import { msg } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { atoms } from "#/alf";
import z from "zod"

const searchFields = [
    { field: 'recipeCategories', label: msg`Category`, options: recipeCategories },
    { field: 'recipeCuisines', label: msg`Cuisine`, options: recipeCuisines },
    { field: 'recipeDiets', label: msg`Suitable diets`, options: recipeDiets }
] as const

export function RecipeSearchFields({ state, dispatch }: { state: RecipeSearchState, dispatch: Dispatch<RecipeSearchAction> }) {
    const { _ } = useLingui()

    return <View style={[atoms.flex_row, atoms.gap_sm]}>
        {searchFields.map(({ field, label, options }) => <View style={{ flex: 1 }} key={field}>
            <ComboBox label={_(label)} selection={state[field]} onRemove={value => dispatch({ type: 'remove', field, value })}
                onSelect={value => dispatch({ type: 'add', field, value })} options={options.options}
            />
        </View>)}
    </View>
}

interface RecipeSearchState {
    recipeCategories: HierarchyOption[]
    recipeCuisines: HierarchyOption[]
    recipeDiets: HierarchyOption[]
}

type RecipeSearchAction = {
    type: 'add'
    field: keyof RecipeSearchState
    value: HierarchyOption
} | {
    type: 'remove'
    field: keyof RecipeSearchState
    value: HierarchyOption
}

function recipeSearchReducer(state: RecipeSearchState, { type, value, field }: RecipeSearchAction): RecipeSearchState {
    const config = searchFields.find((cfg) => cfg.field === field)
    if (!config) return state

    state = cloneDeep(state)
    if (type === 'add') {
        state[field].push(value)
    } else if (type === "remove") {
        const idx = state[field].findIndex(opt => opt.id === value.id)
        if (idx < 0) {
            return state
        }
        state[field].splice(idx, 1)
    }
    return state
}

function makeParamSchema(h: ProcessedHierarchy) {
    return z.string().optional().transform(s => {
        if (!s) return []
        const idsSet = new Set(s.split(",").map(path => pathToHierarchyOption(path, h)?.id).filter((id): id is string => !!id))
        const ids = [...idsSet].sort()
        return ids.map(id => h.lookup[id]).filter(Boolean)
    }).catch(() => [])
}

export const recipeParamsSchema = z.object({
    recipeCategories: makeParamSchema(recipeCategories),
    recipeCuisines: makeParamSchema(recipeCuisines),
    recipeDiets: makeParamSchema(recipeDiets),
    searchType: z.enum(["all", "recipes"]).catch(() => "all" as const)
})

export function useRecipeSearchState({ recipeCategories, recipeCuisines, recipeDiets }: z.output<typeof recipeParamsSchema>) {
    return useReducer(recipeSearchReducer, {
        recipeCategories,
        recipeCuisines,
        recipeDiets
    })
}