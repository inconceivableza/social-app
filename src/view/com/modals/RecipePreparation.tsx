import { useTheme, atoms as a } from "#/alf";
import { H2, H3, Text } from "#/components/Typography";
import { AppFoodiosFeedDefs } from "@atproto/api";
import { Trans, msg } from "@lingui/macro";
import { View } from "react-native";
import * as Toggle from '#/components/forms/Toggle'

import { usePreparationState } from "../recipe-preparation/recipePreparation";
import { useLingui } from "@lingui/react";

export const snapPoints = ['fullscreen']
export function Component({ revision }: { revision: AppFoodiosFeedDefs.RecipeRevisionView }) {
    const record = revision.revisionContent
    const t = useTheme()
    const { _ } = useLingui()
    const [state, dispatch] = usePreparationState(revision)
    return <View>
        <View >
            <H2 style={[a.text_lg, t.atoms.text_contrast_medium]}>
                <Trans context="recipe">Ingredients</Trans>
            </H2>
        </View>
        <View style={[a.ml_sm]}>
            {record.ingredients.map((ingredient, i) => {
                return <View key={i} >
                    <Toggle.Item type="checkbox" label={_(msg`Toggle ingredient`)}
                        name={`toggle_ingredient_${i}`}
                        onChange={() => dispatch({ type: 'toggle_ingredient', idx: i })}
                        value={state.ingredients[i]?.checked}
                    >
                        <Toggle.Checkbox />
                        <Toggle.LabelText style={[a.text_md]}>
                            {`${ingredient.quantity} ${ingredient.unit} ${ingredient.name}`}
                        </Toggle.LabelText>
                    </Toggle.Item>
                </View>
            })}

        </View>
        <View >
            <H2 style={[a.text_lg, t.atoms.text_contrast_medium]}>
                <Trans context="recipe">Instructions</Trans>
            </H2>
        </View>
        <View>
            {record.instructionSections.map(({ name, instructions }, sectionIdx) => {
                return <View key={sectionIdx} style={[a.gap_sm]}>
                    {name && <H3 style={[a.font_bold]}>{name}</H3>}
                    <View style={[a.ml_sm]}>

                        {instructions.map((instruction, instructionIdx) => <View key={instructionIdx}>
                            <Toggle.Item type="checkbox" label={_(msg`Toggle instruction`)}
                                name={`toggle_ingredient_${instructionIdx}`}
                                onChange={() => dispatch({ type: 'toggle_instruction', sectionIdx, instructionIdx })}
                                value={state.instructionSections[sectionIdx]?.[instructionIdx]?.checked}
                            >
                                <Toggle.Checkbox />
                                <Toggle.LabelText style={[a.text_md]}>
                                    {`${instructionIdx + 1} ${instruction.text}`}
                                </Toggle.LabelText>
                            </Toggle.Item>
                        </View>)}
                    </View>
                </View>
            })}
        </View>
    </View>
}

// handle revision changes


