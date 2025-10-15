import rawRecipeCuisines from '../../../../../assets/json/recipe_cuisines.json'
import rawRecipeCategories from '../../../../../assets/json/recipe_categories.json'
import rawRecipeDiets from '../../../../../assets/json/recipe_diets.json'

interface HierarchyOption {
    name: string
    children?: HierarchyOption[]
}

function processHierarchy(options: HierarchyOption[]) {
    const uniqueOptions = new Set<string>()
    traverseHierarchy(options, option => {
        uniqueOptions.add(option)
    })
    return Array.from(uniqueOptions).sort()
}

function traverseHierarchy(options: HierarchyOption[], callback: (value: string) => void) {
    options.forEach(option => {
        callback(option.name)
        if (option.children) {
            traverseHierarchy(option.children, callback)
        }
    })
}

export const recipeCategories = processHierarchy(rawRecipeCategories)
export const recipeCuisines = processHierarchy(rawRecipeCuisines)
export const recipeDiets = processHierarchy(rawRecipeDiets)