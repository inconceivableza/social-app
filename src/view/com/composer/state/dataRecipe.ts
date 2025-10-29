import rawRecipeCuisines from '../../../../../assets/json/recipe_cuisines.json'
import rawRecipeCategories from '../../../../../assets/json/recipe_categories.json'
import rawRecipeDiets from '../../../../../assets/json/recipe_diets.json'
import { uniqBy } from "lodash"
import z from "zod"
interface RawHierarchyOption {
    id: string
    label: string
    children?: RawHierarchyOption[]
}

export interface HierarchyOption {
    id: string, label: string, paths: string[][]
}

function processHierarchy(options: RawHierarchyOption[]) {
    const lookup = {} as Record<string, HierarchyOption>
    traverseHierarchy(options, ({ id, label }, path) => {
        const entry = lookup[id] ??= { id, label, paths: [] }
        entry.paths.push(path)
    })
    return {
        options: Object.values(lookup).sort((a, b) => a.label > b.label ? 1 : -1),
        lookup,
        schema: z.string().refine(s => s in lookup)
    }
}

function traverseHierarchy(options: RawHierarchyOption[], callback: (value: { id: string, label: string }, path: string[]) => void, path: string[] = []) {
    options.forEach(option => {
        const newPath = path.concat(option.id)
        callback(option, newPath)
        //path = path.concat(option.id)
        if (option.children) {
            traverseHierarchy(option.children, callback, newPath)
        }
    })
}


export const recipeCategories = processHierarchy(rawRecipeCategories)
export const recipeCuisines = processHierarchy(rawRecipeCuisines)
export const recipeDiets = processHierarchy(rawRecipeDiets)

export type ProcessedHierarchy = ReturnType<typeof processHierarchy>

const DELIMITER = "/"

export function pathToHierarchyOption(path: string, hierarchy: ProcessedHierarchy) {
    const leafID = path.split(DELIMITER).at(-1)
    if (!leafID) return;
    return hierarchy.lookup[leafID]
}

export function dedupHierarchyOptions(opts: HierarchyOption[]) {
    return uniqBy(opts, "label")
}

export function hierarchyOptionToPaths(opt: HierarchyOption) {
    return opt.paths.map(path => path.join(DELIMITER))
}

