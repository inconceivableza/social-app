import { AppFoodiosFeedRecipeRevision } from "@atproto/api";
import { msg } from "@lingui/macro";
import type { MessageDescriptor } from "@lingui/core"

export interface NutritionElement {
    field: Exclude<keyof AppFoodiosFeedRecipeRevision.Nutrition, "servingSize" | "$type">
    label: MessageDescriptor
    unit: MessageDescriptor,
    subFields?: NutritionElement[]
}

export const nutritionFields: NutritionElement[] = [
    { field: 'energy', label: msg`Energy`, unit: msg`kJ` },
    {
        field: 'carbohydrateContent', label: msg`Glycaemic carbohydrate`, unit: msg`g`,
        subFields: [{ field: 'sugarContent', 'label': msg`Sugar`, unit: msg`g` },]
    },
    {
        field: 'fatContent', label: msg`Total fat`, unit: msg`g`,
        subFields: [
            { field: 'saturatedFatContent', label: msg`Saturated fat`, unit: msg`g` },
            { field: 'unsaturatedFatContent', label: msg`Unsaturated fat`, unit: msg`g` },
            { field: 'transFatContent', label: msg`Trans fat`, unit: msg`g` },
            { field: 'cholesterolContent', label: msg`Cholesterol`, unit: msg`mg` },
        ]
    },
    { field: 'proteinContent', label: msg`Protein`, unit: msg`g` },
    { field: 'sodiumContent', label: msg`Sodium`, unit: msg`mg` },
];
