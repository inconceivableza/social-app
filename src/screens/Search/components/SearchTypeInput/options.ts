// TODO: localize
export const searchTypeOptions = [
  {
    value: 'all',
    label: `All`,
  },
  {
    value: 'recipes',
    label: `Recipes`,
  },
] as const

export type SearchType = typeof searchTypeOptions[number]['value']