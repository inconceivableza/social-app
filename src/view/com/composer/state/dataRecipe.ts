import rawRecipeCuisines from '../../../../../assets/json/recipe_cuisines.json'
import rawRecipeCategories from '../../../../../assets/json/recipe_categories.json'
import rawRecipeDiets from '../../../../../assets/json/recipe_diets.json'

interface HierarchyOption {
    id: string
    label: string
    children?: HierarchyOption[]
}

function processHierarchy(options: HierarchyOption[]): { id: string, label: string, paths: string[][] }[] {
    const uniqueIDs = {} as Record<string, { label: string, paths: string[][] }>
    traverseHierarchy(options, (option, path) => {
        const entry = uniqueIDs[option.id] ??= { label: option.label, paths: [] }
        entry.paths.push(path)
    })

    return Object.entries(uniqueIDs).map(([id, value]) => ({ id, ...value })).sort((a, b) => a.label > b.label ? 1 : -1)
}

function traverseHierarchy(options: HierarchyOption[], callback: (value: { id: string, label: string }, path: string[]) => void, path: string[] = []) {
    options.forEach(option => {
        callback(option, path)
        path = path.concat(option.id)
        if (option.children) {
            traverseHierarchy(option.children, callback, path)
        }
    })
}

export const recipeCategories = processHierarchy(rawRecipeCategories)
export const recipeCuisines = processHierarchy(rawRecipeCuisines)
export const recipeDiets = processHierarchy(rawRecipeDiets)