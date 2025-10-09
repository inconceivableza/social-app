import { atoms as a, useTheme } from '#/alf'
import { RichText } from '#/components/RichText'
import { H1, H2, H3, Text } from '#/components/Typography'
import { AppFoodiosFeedDefs } from "@atproto/api"
import { Trans } from '@lingui/macro'
import { useMemo, useState } from "react"
import { View } from "react-native"
import { RichText as RichTextAPI } from "@atproto/api"
import { ShowMoreTextButton } from '#/components/Post/ShowMoreTextButton'

export function ExpandableRecipePost({
    revision,
}: {
    revision: AppFoodiosFeedDefs.RecipeRevisionView
}) {
    const [isExpanded, setIsExpanded] = useState(false)
    return <View>
        <ExpandedRecipePost revision={revision} expanded={isExpanded} />
        {!isExpanded && <ShowMoreTextButton style={[a.text_md]} onPress={() => { setIsExpanded(true) }} />}
    </View>
}

export function ExpandedRecipePost({
    revision,
    expanded
}: {
    revision: AppFoodiosFeedDefs.RecipeRevisionView
    expanded: boolean
}) {
    // TODO: include embeds
    const record = revision.revisionContent
    const t = useTheme()
    const richText = useMemo(() => {
        return new RichTextAPI({
            text: revision.revisionContent.text,
            facets: revision.revisionContent.facets
        })
    }, [revision])
    return <View style={[a.gap_sm]}>
        <View style={[
            //a.align_center
        ]}>
            <H1 style={[a.text_2xl]}>{record.name}</H1>
        </View>
        <View>
            <RichText
                enableTags
                testID="postText"
                value={richText}
                style={[a.flex_1, a.text_md]}
                shouldProxyLinks={true}
            />
        </View>
        {expanded && <View>
            <View >
                <H2 style={[a.text_lg, t.atoms.text_contrast_medium]}>
                    <Trans context="recipe">Ingredients</Trans>
                </H2>
            </View>
            <View style={[a.ml_sm]}>
                {record.ingredients.map((ingredient, i) => {
                    return <View key={i} style={[a.flex_row, a.gap_sm]}>
                        <Text>{ingredient.quantity + " " + ingredient.unit}</Text>
                        <Text>{ingredient.name}</Text>
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
                                <Text>{instructionIdx + 1 + '. ' + instruction.text}</Text>
                            </View>)}
                        </View>
                    </View>
                })}
            </View>
        </View>}
    </View>
}