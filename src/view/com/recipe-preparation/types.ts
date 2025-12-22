export type PreparationState = {
    ingredients: { checked: boolean }[]
    instructionSections: { checked?: boolean }[][]
}