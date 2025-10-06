import {useMemo} from 'react'
import {View} from 'react-native'
import {type $Typed} from '@atproto/api'
import {type ViewRecord} from '@atproto/api/client/types/app/bsky/embed/record'

import {createEmbedViewRecordFromPost} from '#/state/queries/postgate/util'
import {useResolveLinkQuery} from '#/state/queries/resolve-link'
import {atoms as a, useTheme} from '#/alf'
import {QuoteEmbed} from '#/components/Post/Embed'

export function LazyQuoteEmbed({uri}: {uri: string}) {
  const t = useTheme()
  const {data} = useResolveLinkQuery(uri)

  const view = useMemo<$Typed<ViewRecord> | undefined>(() => {
    if (!data || data.type !== 'record') return
    if (data.kind === 'post') {
      return createEmbedViewRecordFromPost(data.view)
    } else if (data.kind === 'recipePost') {
      const {view} = data
      const viewRec: $Typed<ViewRecord> = {
        $type: 'app.bsky.embed.record#viewRecord',
        uri: view.uri,
        cid: view.cid,
        author: view.author,
        value: view.record,
        labels: view.labels,
        replyCount: view.replyCount,
        repostCount: view.repostCount,
        likeCount: view.likeCount,
        quoteCount: view.quoteCount,
        indexedAt: view.indexedAt,
        embeds: view.embed ? [view.embed] : [],
      }
      return viewRec
    }
  }, [data])

  return view ? (
    <QuoteEmbed
      embed={{
        type: 'post',
        view,
      }}
    />
  ) : (
    <View
      style={[
        a.w_full,
        a.rounded_md,
        t.atoms.bg_contrast_25,
        {
          height: 68,
        },
      ]}
    />
  )
}
