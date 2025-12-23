import {type Dispatch, useReducer} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {cloneDeep} from 'lodash'
import z from 'zod'

import {
  type HierarchyOption,
  pathToHierarchyOption,
  type ProcessedHierarchy,
  recipeCategories,
  recipeCuisines,
  recipeDiets,
} from '#/view/com/composer/state/dataRecipe'
import {atoms} from '#/alf'
import {ComboBox} from '#/components/forms/ComboBox'

const searchFields = [
  {
    field: 'recipeCategories',
    label: msg`Category`,
    searchLabel: msg`Search categories...`,
    options: recipeCategories,
  },
  {
    field: 'recipeCuisines',
    label: msg`Cuisine`,
    searchLabel: msg`Search cuisines...`,
    options: recipeCuisines,
  },
  {
    field: 'recipeDiets',
    label: msg`Diets`,
    searchLabel: msg`Search suitable diets...`,
    options: recipeDiets,
  },
] as const

export function RecipeSearchFields({
  state,
  dispatch,
}: {
  state: RecipeSearchState
  dispatch: Dispatch<RecipeSearchAction>
}) {
  const {_} = useLingui()

  return (
    <View style={[atoms.flex_row, atoms.gap_sm]}>
      {searchFields.map(({field, label, options, searchLabel}) => (
        <View style={{flex: 1}} key={field}>
          <ComboBox
            label={_(label)}
            searchLabel={_(searchLabel)}
            selection={state[field]}
            onRemove={value => dispatch({type: 'remove', field, value})}
            onSelect={value => dispatch({type: 'add', field, value})}
            options={options.options}
          />
        </View>
      ))}
    </View>
  )
}

interface RecipeSearchState {
  recipeCategories: HierarchyOption[]
  recipeCuisines: HierarchyOption[]
  recipeDiets: HierarchyOption[]
}

type RecipeSearchAction =
  | {
      type: 'add'
      field: keyof RecipeSearchState
      value: HierarchyOption
    }
  | {
      type: 'remove'
      field: keyof RecipeSearchState
      value: HierarchyOption
    }

function recipeSearchReducer(
  state: RecipeSearchState,
  {type, value, field}: RecipeSearchAction,
): RecipeSearchState {
  const config = searchFields.find(cfg => cfg.field === field)
  if (!config) return state

  state = cloneDeep(state)
  if (type === 'add') {
    state[field].push(value)
  } else if (type === 'remove') {
    const idx = state[field].findIndex(opt => opt.id === value.id)
    if (idx < 0) {
      return state
    }
    state[field].splice(idx, 1)
  }
  return state
}

function makeParamSchema(h: ProcessedHierarchy) {
  return z
    .string()
    .optional()
    .transform(s => {
      if (!s) return []
      const idsSet = new Set(
        s
          .split(',')
          .map(path => pathToHierarchyOption(path, h)?.id)
          .filter((id): id is string => !!id),
      )
      const ids = [...idsSet].sort()
      return ids.map(id => h.lookup[id]).filter(Boolean)
    })
    .catch(() => [])
}

export const recipeParamsSchema = z.object({
  recipeCategories: makeParamSchema(recipeCategories),
  recipeCuisines: makeParamSchema(recipeCuisines),
  recipeDiets: makeParamSchema(recipeDiets),
  searchType: z.enum(['all', 'recipes']).catch(() => 'all' as const),
})


export function useRecipeSearchState({
  recipeCategories,
  recipeCuisines,
  recipeDiets,
}: z.output<typeof recipeParamsSchema>) {
  return useReducer(recipeSearchReducer, {
    recipeCategories,
    recipeCuisines,
    recipeDiets,
  })
}
