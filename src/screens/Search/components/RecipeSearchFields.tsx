import { ComboBox } from "#/components/forms/ComboBox";
import { recipeCuisines, recipeCategories, recipeDiets } from "#/view/com/composer/state/dataRecipe";
import { View } from "react-native";
import { cloneDeep } from 'lodash'
import { useReducer } from "react";
import { msg } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { atoms } from "#/alf";

const searchFields = [
    { field: 'recipeCategories', label: msg`Category`, options: recipeCategories },
    { field: 'recipeCuisines', label: msg`Cuisine`, options: recipeCuisines },
    { field: 'recipeDiets', label: msg`Suitable diets`, options: recipeDiets }
] as const

export function RecipeSearchFields({ onChange }: { state: RecipeSearchState, onChange: (state: RecipeSearchState) => void }) {
    const { _ } = useLingui()
    const [state, dispatch] = useReducer(recipeSearchReducer, {
        recipeCategories: [],
        recipeCuisines: [],
        recipeDiets: []
    })

    return <View style={[atoms.flex_row, atoms.gap_sm]}>
        {searchFields.map(({ field, label, options }) => <View style={{ flex: 1 }} key={field}>
            <ComboBox label={_(label)} selection={state[field]} onRemove={value => dispatch({ type: 'remove', field, value })}
                onSelect={value => dispatch({ type: 'add', field, value })} options={options}
            />
        </View>)}
    </View>
}

interface RecipeSearchState {
    recipeCategories: string[]
    recipeCuisines: string[]
    recipeDiets: string[]
}

type RecipeSearchAction = {
    type: 'add'
    field: keyof RecipeSearchState
    value: string
} | {
    type: 'remove'
    field: keyof RecipeSearchState
    value: string
}

function recipeSearchReducer(state: RecipeSearchState, { type, value, field }: RecipeSearchAction): RecipeSearchState {
    state = cloneDeep(state)
    if (type === 'add') {
        state[field].push(value)
    } else if (type === "remove") {
        const idx = state[field].indexOf(value)
        if (idx < 0) {
            return state
        }
        state[field].splice(idx, 1)
    }
    return state
}

function useRecipeSearchState() {

}