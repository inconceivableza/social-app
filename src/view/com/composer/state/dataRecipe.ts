import rawRecipeCuisines from '../../../../../assets/json/recipe_cuisines.json'
import rawRecipeCategories from '../../../../../assets/json/recipe_categories.json'
import rawRecipeDiets from '../../../../../assets/json/recipe_diets.json'

interface HierarchyOption {
    id: string
    label: string
    children?: HierarchyOption[]
}

function processHierarchy(options: HierarchyOption[]): { id: string, label: string }[] {
    const uniqueIDs = new Map<string, string>()
    const result: { id: string, label: string }[] = []
    traverseHierarchy(options, option => {
        uniqueIDs.set(option.id, option.label)
    })

    return Array.from(uniqueIDs.entries(), ([id, label]) => ({ id, label })).sort((a, b) => a.label > b.label ? 1 : -1)
}

function traverseHierarchy(options: HierarchyOption[], callback: (value: { id: string, label: string }) => void) {
    options.forEach(option => {
        callback(option)
        if (option.children) {
            traverseHierarchy(option.children, callback)
        }
    })
}

export const recipeCategories = processHierarchy(rawRecipeCategories)
export const recipeCuisines = processHierarchy(rawRecipeCuisines)
export const recipeDiets = processHierarchy(rawRecipeDiets)