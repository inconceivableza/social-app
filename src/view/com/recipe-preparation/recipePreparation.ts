import {useCallback, useMemo} from 'react'
import {
  type AppFoodiosFeedDefs,
  type AppFoodiosFeedRecipeRevision,
} from '@atproto/api'
import {cloneDeep} from 'lodash'

import {useSession} from '#/state/session'
import {account, useStorage} from '#/storage'
import {type PreparationState} from './types'

function initPreparationState(
  record: AppFoodiosFeedRecipeRevision.Record,
): PreparationState {
  return {
    ingredients: record.ingredients.map(() => ({checked: false})),
    instructionSections: record.instructionSections.map(({instructions}) =>
      instructions.map(() => ({checked: false})),
    ),
  }
}

export function usePreparationState(
  revision: AppFoodiosFeedDefs.RecipeRevisionView,
) {
  const {currentAccount} = useSession()
  const [storedState, setStoredState] = useStorage(account, [
    currentAccount?.did ?? 'pwi',
    'recipePreparations',
  ])

  const preparationState = useMemo(
    () =>
      storedState?.[revision.selectedRevisionUri] ??
      initPreparationState(revision.revisionContent),
    [storedState, revision],
  )

  const dispatch = useCallback(
    (action: PreparationAction) => {
      // Possibility of out of order updates here
      const updatedState = {
        ...storedState,
        [revision.selectedRevisionUri]: preparationReducer(
          preparationState,
          action,
        ),
      }
      setStoredState(updatedState)
    },
    [
      preparationState,
      storedState,
      setStoredState,
      revision.selectedRevisionUri,
    ],
  )
  return [preparationState, dispatch] as const
}

type Action<Type extends string, Payload extends {}> = {
  type: Type
} & Payload

export type PreparationAction =
  | {
      type: 'toggle_ingredient'
      idx: number
    }
  | Action<
      'toggle_instruction',
      {
        sectionIdx: number
        instructionIdx: number
      }
    >
  | Action<
      'reset',
      {
        record: AppFoodiosFeedRecipeRevision.Record
      }
    >

export function preparationReducer(
  state: PreparationState,
  action: PreparationAction,
): PreparationState {
  state = cloneDeep(state)
  switch (action.type) {
    case 'toggle_ingredient': {
      const ingredient = state.ingredients.at(action.idx)
      if (!ingredient) return state
      ingredient.checked = !ingredient.checked
      return state
    }
    case 'toggle_instruction': {
      const section = state.instructionSections.at(action.sectionIdx)
      const instruction = section?.at(action.instructionIdx)
      if (!instruction) return state
      instruction.checked = !instruction.checked
      return state
    }
    case 'reset': {
      return initPreparationState(action.record)
    }
  }
}
