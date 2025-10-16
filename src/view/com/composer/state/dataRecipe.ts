import rawRecipeCuisines from '../../../../../assets/json/recipe_cuisines.json'
import rawRecipeCategories from '../../../../../assets/json/recipe_categories.json'
import rawRecipeDiets from '../../../../../assets/json/recipe_diets.json'

interface HierarchyOption {
    name: string
    children?: HierarchyOption[]
}

function processHierarchy(options: HierarchyOption[]): { id: string, label: string }[] {
    const result: { id: string, label: string }[] = []
    traverseHierarchy(options, option => {
        result.push(option)
    })
    return result.sort((a, b) => a.label > b.label ? 1 : -1)
}

function traverseHierarchy(options: HierarchyOption[], callback: (value: { id: string, label: string }) => void, path: string[] = []) {
    options.forEach(option => {
        const newPath = path.concat(option.name)
        callback({ label: option.name, id: newPath.join(">") })
        if (option.children) {
            traverseHierarchy(option.children, callback, newPath)
        }
    })
}

export const recipeCategories = processHierarchy(rawRecipeCategories)
export const recipeCuisines = processHierarchy(rawRecipeCuisines)
export const recipeDiets = processHierarchy(rawRecipeDiets)