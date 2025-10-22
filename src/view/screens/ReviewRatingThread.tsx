import {useCallback} from 'react'
import {lexiconIds as ids} from '@atproto/api'
import {useFocusEffect} from '@react-navigation/native'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {type CommonNavigatorParams} from '#/lib/routes/types'
import {makeRecordUri} from '#/lib/strings/url-helpers'
import {useSetMinimalShellMode} from '#/state/shell'
import {PostThread} from '#/screens/PostThread'
import * as Layout from '#/components/Layout'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'ReviewRatingThread'>
export function ReviewRatingThreadScreen({route}: Props) {
  const setMinimalShellMode = useSetMinimalShellMode()

  const {name, rkey} = route.params
  const uri = makeRecordUri(name, ids.AppFoodiosFeedReviewRating, rkey)

  useFocusEffect(
    useCallback(() => {
      setMinimalShellMode(false)
    }, [setMinimalShellMode]),
  )

  // TODO: consider using V2 thread component
  return (
    <Layout.Screen testID="reviewRatingThreadScreen">
      <PostThread uri={uri} />
    </Layout.Screen>
  )
}
