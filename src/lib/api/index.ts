import type AtpAgent from '@atproto/api'
import {
  type AppFoodiosFeedRecipePost,
  AppFoodiosFeedRecipeRevision,
  type AppFoodiosFeedReviewRating,
} from '@atproto/api'
import {
  type $Typed,
  type AppBskyEmbedExternal,
  type AppBskyEmbedImages,
  type AppBskyEmbedRecord,
  type AppBskyEmbedRecordWithMedia,
  type AppBskyEmbedVideo,
  type AppBskyFeedPost,
  AtUri,
  BlobRef,
  type BskyAgent,
  type ComAtprotoLabelDefs,
  type ComAtprotoRepoApplyWrites,
  type ComAtprotoRepoStrongRef,
  RichText,
} from '@atproto/api'
import {ids} from '@atproto/api/client/lexicons'
import {TID} from '@atproto/common-web'
import * as dcbor from '@ipld/dag-cbor'
import {t} from '@lingui/macro'
import {type QueryClient} from '@tanstack/react-query'
import {sha256} from 'js-sha256'
import {CID} from 'multiformats/cid'
import * as Hasher from 'multiformats/hashes/hasher'

import {isNetworkError} from '#/lib/strings/errors'
import {shortenLinks, stripInvalidMentions} from '#/lib/strings/rich-text-manip'
import {logger} from '#/logger'
import {compressImage} from '#/state/gallery'
import {
  fetchResolveGifQuery,
  fetchResolveLinkQuery,
} from '#/state/queries/resolve-link'
import {
  createThreadgateRecord,
  threadgateAllowUISettingToAllowRecordValue,
} from '#/state/queries/threadgate'
import {
  type EmbedDraft,
  type EmbedState,
  type ThreadDraft,
} from '#/view/com/composer/state/composer'
import {type RecipePostDraft} from '#/view/com/composer/state/composerRecipe'
import {createGIFDescription} from '../gif-alt-text'
import {isRecipeUri} from '../strings/url-helpers'
import {type RecipePostView} from './feed/utils'
import {uploadBlob} from './upload-blob'
import { hierarchyOptionToPaths } from '#/view/com/composer/state/dataRecipe'

export {uploadBlob}

interface PostOpts {
  thread: ThreadDraft
  replyTo?: ComAtprotoRepoStrongRef.Main
  onStateChange?: (state: string) => void
  langs?: string[]
}

export async function post(
  agent: BskyAgent,
  queryClient: QueryClient,
  opts: PostOpts,
) {
  const thread = opts.thread
  opts.onStateChange?.(t`Processing...`)

  let replyPromise:
    | Promise<AppBskyFeedPost.Record['reply']>
    | AppBskyFeedPost.Record['reply']
    | undefined
  if (opts.replyTo) {
    // Not awaited to avoid waterfalls.
    replyPromise = resolveReply(agent, opts.replyTo)
  }

  // add top 3 languages from user preferences if langs is provided
  let langs = opts.langs
  if (opts.langs) {
    langs = opts.langs.slice(0, 3)
  }

  const did = agent.assertDid
  const writes: $Typed<ComAtprotoRepoApplyWrites.Create>[] = []
  const uris: string[] = []

  let now = new Date()
  let tid: TID | undefined

  for (let i = 0; i < thread.posts.length; i++) {
    const draft = thread.posts[i]

    // Not awaited to avoid waterfalls.
    const rtPromise = resolveRT(agent, draft.richtext)
    const embedPromise = resolveEmbed(
      agent,
      queryClient,
      draft,
      opts.onStateChange,
    )
    let labels: $Typed<ComAtprotoLabelDefs.SelfLabels> | undefined
    if (draft.labels.length) {
      labels = {
        $type: 'com.atproto.label.defs#selfLabels',
        values: draft.labels.map(val => ({val})),
      }
    }

    // The sorting behavior for multiple posts sharing the same createdAt time is
    // undefined, so what we'll do here is increment the time by 1 for every post
    now.setMilliseconds(now.getMilliseconds() + 1)
    tid = TID.next(tid)
    const rkey = tid.toString()
    const uri = `at://${did}/app.bsky.feed.post/${rkey}`
    uris.push(uri)

    const rt = await rtPromise
    const embed = await embedPromise
    const reply = await replyPromise
    const record: AppBskyFeedPost.Record = {
      // IMPORTANT: $type has to exist, CID is calculated with the `$type` field
      // present and will produce the wrong CID if you omit it.
      $type: 'app.bsky.feed.post',
      createdAt: now.toISOString(),
      text: rt.text,
      facets: rt.facets,
      reply,
      embed,
      langs,
      labels,
    }
    writes.push({
      $type: 'com.atproto.repo.applyWrites#create',
      collection: 'app.bsky.feed.post',
      rkey: rkey,
      value: record,
    })

    if (i === 0 && thread.threadgate.some(tg => tg.type !== 'everybody')) {
      writes.push({
        $type: 'com.atproto.repo.applyWrites#create',
        collection: 'app.bsky.feed.threadgate',
        rkey: rkey,
        value: createThreadgateRecord({
          createdAt: now.toISOString(),
          post: uri,
          allow: threadgateAllowUISettingToAllowRecordValue(thread.threadgate),
        }),
      })
    }

    if (
      thread.postgate.embeddingRules?.length ||
      thread.postgate.detachedEmbeddingUris?.length
    ) {
      writes.push({
        $type: 'com.atproto.repo.applyWrites#create',
        collection: 'app.bsky.feed.postgate',
        rkey: rkey,
        value: {
          ...thread.postgate,
          $type: 'app.bsky.feed.postgate',
          createdAt: now.toISOString(),
          post: uri,
        },
      })
    }

    // Prepare a ref to the current post for the next post in the thread.
    const ref = {
      cid: await computeCid(record),
      uri,
    }
    replyPromise = {
      root: reply?.root ?? ref,
      parent: ref,
    }
  }

  try {
    await agent.com.atproto.repo.applyWrites({
      repo: agent.assertDid,
      writes: writes,
      validate: true,
    })
  } catch (e: any) {
    logger.error(`Failed to create post`, {
      safeMessage: e.message,
    })
    if (isNetworkError(e)) {
      throw new Error(
        t`Post failed to upload. Please check your Internet connection and try again.`,
      )
    } else {
      throw e
    }
  }

  return {uris}
}

interface RecipePostOpts {
  post: RecipePostDraft
}
export async function postRecipe(
  agent: AtpAgent,
  qc: QueryClient,
  {post}: RecipePostOpts,
) {
  // TODO: strip out empty fields
  const now = new Date()
  const did = agent.assertDid
  const tid = TID.next()
  const rkey = tid.toString()
  const uri = `at://${did}/${ids.AppFoodiosFeedRecipePost}/${rkey}`
  const recipeRecord: AppFoodiosFeedRecipePost.Record = {
    $type: 'app.foodios.feed.recipePost',
    createdAt: now.toISOString(),
  }
  const [cid, rt, embed] = await Promise.all([
    computeCid(recipeRecord),
    resolveRT(agent, post.text),
    resolveEmbed(agent, qc, post, () => {}),
  ])
  // TODO: factor out a conversion function from draft to record - also used in postRecipeRevision
  const revisionRecord: AppFoodiosFeedRecipeRevision.Record = {
    $type: 'app.foodios.feed.recipeRevision',
    recipePostRef: {
      uri,
      cid,
    },
    createdAt: now.toISOString(),
    ingredients: post.ingredients,
    instructionSections: post.instructionSections,
    text: rt.text,
    facets: rt.facets,
    name: post.name,
    embed,
    cookingTime: post.cookTime,
    prepTime: post.prepTime,
    recipeCategory: post.recipeCategories?.flatMap(hierarchyOptionToPaths),
    recipeCuisine: post.recipeCuisines?.flatMap(hierarchyOptionToPaths),
    suitableForDiet: post.recipeDiets?.flatMap(hierarchyOptionToPaths),
    attribution: post.attribution,
    nutrition: post.nutrition,
    recipeYield: post.recipeYield,
  }
  const validationResult =
    AppFoodiosFeedRecipeRevision.validateRecord(revisionRecord)
  if (!validationResult.success) {
    // TODO catch
    throw new Error(
      'Invalid revision record: ' + validationResult.error.message,
    )
  }
  // TODO: add recipe label
  // TODO: consider whether we need a new rkey for revision
  const writes: $Typed<ComAtprotoRepoApplyWrites.Create>[] = [
    {
      $type: 'com.atproto.repo.applyWrites#create',
      collection: 'app.foodios.feed.recipePost',
      value: recipeRecord,
      rkey,
    },
    {
      $type: 'com.atproto.repo.applyWrites#create',
      collection: 'app.foodios.feed.recipeRevision',
      value: revisionRecord,
      rkey,
    },
  ]

  try {
    await agent.com.atproto.repo.applyWrites({
      repo: agent.assertDid,
      writes: writes,
      validate: true,
    })
  } catch (e: any) {
    logger.error(`Failed to create recipe post`, {
      safeMessage: e.message,
    })
    if (isNetworkError(e)) {
      throw new Error(
        t`Post failed to upload. Please check your Internet connection and try again.`,
      )
    } else {
      throw e
    }
  }

  return uri
}
interface RecipeRevisionOpts {
  parentRevisionPost: RecipePostView
  post: RecipePostDraft
}
export async function postRecipeRevision(
  agent: AtpAgent,
  qc: QueryClient,
  {post, parentRevisionPost}: RecipeRevisionOpts,
) {
  const now = new Date()
  const tid = TID.next()
  const rkey = tid.toString()

  const [rt, embed] = await Promise.all([
    resolveRT(agent, post.text),
    resolveEmbed(agent, qc, post, () => {}),
  ])
  const revisionRecord: AppFoodiosFeedRecipeRevision.Record = {
    $type: 'app.foodios.feed.recipeRevision',
    recipePostRef: parentRevisionPost.record.revisionContent.recipePostRef,
    parentRevisionRef: {
      uri: parentRevisionPost.record.selectedRevisionUri,
      cid: parentRevisionPost.cid, // TODO: This field is currently populated with the selected revision's cid (not the the recipe post's) this may be confusing
    },
    createdAt: now.toISOString(),
    ingredients: post.ingredients,
    instructionSections: post.instructionSections,
    text: rt.text,
    facets: rt.facets,
    name: post.name,
    embed,
    cookingTime: post.cookTime,
    prepTime: post.prepTime,
    recipeCategory: post.categories,
    recipeCuisine: post.cuisines,
    suitableForDiet: post.suitableForDiet,
    attribution: post.attribution,
    nutrition: post.nutrition,
    recipeYield: post.recipeYield,
  }

  const writes: $Typed<ComAtprotoRepoApplyWrites.Create>[] = [
    {
      $type: 'com.atproto.repo.applyWrites#create',
      collection: 'app.foodios.feed.recipeRevision',
      value: revisionRecord,
      rkey,
    },
  ]

  try {
    await agent.com.atproto.repo.applyWrites({
      repo: agent.assertDid,
      writes: writes,
      validate: true,
    })
  } catch (e: any) {
    logger.error(`Failed to create recipe post`, {
      safeMessage: e.message,
    })
    if (isNetworkError(e)) {
      throw new Error(
        t`Post failed to upload. Please check your Internet connection and try again.`,
      )
    } else {
      throw e
    }
  }
}

interface ReviewRatingOpts {
  thread: ThreadDraft
  subject: ComAtprotoRepoStrongRef.Main
  onStateChange?: (state: string) => void
  langs?: string[]
}

export async function postReviewRating(
  agent: BskyAgent,
  queryClient: QueryClient,
  opts: ReviewRatingOpts,
) {
  const thread = opts.thread
  opts.onStateChange?.(t`Processing...`)

  // this starts with the subject reviewed, then chains to form a thread if necessary
  let replyPromise:
    | Promise<AppBskyFeedPost.Record['reply']>
    | AppBskyFeedPost.Record['reply']
    | Promise<AppFoodiosFeedReviewRating.Record['subject']>
    | AppFoodiosFeedReviewRating.Record['subject']
    | undefined
  // Not awaited to avoid waterfalls.
  replyPromise = resolveReply(agent, opts.subject)

  // add top 3 languages from user preferences if langs is provided
  let langs = opts.langs
  if (opts.langs) {
    langs = opts.langs.slice(0, 3)
  }

  const did = agent.assertDid
  const writes: $Typed<ComAtprotoRepoApplyWrites.Create>[] = []
  const uris: string[] = []

  let now = new Date()
  let tid: TID | undefined

  // A review could have follow-up posts in a thread; only the first will be a review-rating?
  for (let i = 0; i < thread.posts.length; i++) {
    const draft = thread.posts[i]
    const isReviewRating = i === 0

    // Not awaited to avoid waterfalls.
    const rtPromise = resolveRT(agent, draft.richtext)
    const embedPromise = resolveEmbed(
      agent,
      queryClient,
      draft,
      opts.onStateChange,
    )
    let labels: $Typed<ComAtprotoLabelDefs.SelfLabels> | undefined
    if (draft.labels.length) {
      labels = {
        $type: 'com.atproto.label.defs#selfLabels',
        values: draft.labels.map(val => ({val})),
      }
    }

    // The sorting behavior for multiple posts sharing the same createdAt time is
    // undefined, so what we'll do here is increment the time by 1 for every post
    now.setMilliseconds(now.getMilliseconds() + 1)
    tid = TID.next(tid)
    const rkey = tid.toString()
    const rtype = isReviewRating
      ? 'app.foodios.feed.reviewRating'
      : 'app.bsky.feed.post'
    const uri = `at://${did}/${rtype}/${rkey}`
    uris.push(uri)

    const rt = await rtPromise
    const embed = await embedPromise
    const reply:
      | AppBskyFeedPost.Record['reply']
      | AppFoodiosFeedReviewRating.Record['subject'] = await replyPromise
    const rating = isReviewRating
      ? draft.rating === undefined
        ? undefined
        : Math.round(draft.rating * 2)
      : undefined
    const record: AppBskyFeedPost.Record | AppFoodiosFeedReviewRating.Record =
      isReviewRating
        ? {
            $type: 'app.foodios.feed.reviewRating',
            createdAt: now.toISOString(),
            reviewBody: rt.text,
            facets: rt.facets,
            subject: reply?.root ?? opts.subject,
            reviewRating: rating,
            images: embed,
            langs,
            labels,
          }
        : {
            // IMPORTANT: $type has to exist, CID is calculated with the `$type` field
            // present and will produce the wrong CID if you omit it.
            $type: 'app.bsky.feed.post',
            createdAt: now.toISOString(),
            text: rt.text,
            facets: rt.facets,
            reply,
            embed,
            langs,
            labels,
          }
    writes.push({
      $type: 'com.atproto.repo.applyWrites#create',
      collection: rtype,
      rkey: rkey,
      value: record,
    })

    if (i === 0 && thread.threadgate.some(tg => tg.type !== 'everybody')) {
      writes.push({
        $type: 'com.atproto.repo.applyWrites#create',
        collection: 'app.bsky.feed.threadgate',
        rkey: rkey,
        value: createThreadgateRecord({
          createdAt: now.toISOString(),
          post: uri,
          allow: threadgateAllowUISettingToAllowRecordValue(thread.threadgate),
        }),
      })
    }

    if (
      thread.postgate.embeddingRules?.length ||
      thread.postgate.detachedEmbeddingUris?.length
    ) {
      writes.push({
        $type: 'com.atproto.repo.applyWrites#create',
        collection: 'app.bsky.feed.postgate',
        rkey: rkey,
        value: {
          ...thread.postgate,
          $type: 'app.bsky.feed.postgate',
          createdAt: now.toISOString(),
          post: uri,
        },
      })
    }

    // Prepare a ref to the current post for the next post in the thread.
    const ref: ComAtprotoRepoStrongRef.Main = {
      cid: await computeCid(record),
      uri,
    }
    replyPromise = {
      root: reply?.root ?? ref,
      parent: ref,
    }
  }

  try {
    await agent.com.atproto.repo.applyWrites({
      repo: agent.assertDid,
      writes: writes,
      validate: true,
    })
  } catch (e: any) {
    logger.error(`Failed to create review-rating post`, {
      safeMessage: e.message,
    })
    if (isNetworkError(e)) {
      throw new Error(
        t`Review-rating post failed to upload. Please check your Internet connection and try again.`,
      )
    } else {
      throw e
    }
  }

  return {uris}
}

async function resolveRT(agent: BskyAgent, richtext: RichText) {
  const trimmedText = richtext.text
    // Trim leading whitespace-only lines (but don't break ASCII art).
    .replace(/^(\s*\n)+/, '')
    // Trim any trailing whitespace.
    .trimEnd()
  let rt = new RichText({text: trimmedText}, {cleanNewlines: true})
  await rt.detectFacets(agent)

  rt = shortenLinks(rt)
  rt = stripInvalidMentions(rt)
  return rt
}

async function resolveReply(
  agent: BskyAgent,
  replyTo: ComAtprotoRepoStrongRef.Main,
) {
  const replyToUrip = new AtUri(replyTo.uri)
  // TODO: use a utility function for checking the uri collection
  const parentPost = await (isRecipeUri(replyTo.uri)
    ? agent.getRecipePost({
        repo: replyToUrip.host,
        rkey: replyToUrip.rkey,
      })
    : agent.getPost({
        repo: replyToUrip.host,
        rkey: replyToUrip.rkey,
      }))
  if (parentPost) {
    const parentRef: ComAtprotoRepoStrongRef.Main = {
      uri: parentPost.uri,
      cid: parentPost.cid,
      revisionUri: replyTo.revisionUri,
    }
    return {
      root: parentPost.value.reply?.root || parentRef,
      parent: parentRef,
    }
  }
}

async function resolveEmbed(
  agent: BskyAgent,
  queryClient: QueryClient,
  draft: EmbedState,
  onStateChange: ((state: string) => void) | undefined,
): Promise<
  | $Typed<AppBskyEmbedImages.Main>
  | $Typed<AppBskyEmbedVideo.Main>
  | $Typed<AppBskyEmbedExternal.Main>
  | $Typed<AppBskyEmbedRecord.Main>
  | $Typed<AppBskyEmbedRecordWithMedia.Main>
  | undefined
> {
  if (draft.embed.quote) {
    //
    const [resolvedMedia, resolvedQuote] = await Promise.all([
      resolveMedia(agent, queryClient, draft.embed, onStateChange),
      resolveRecord(agent, queryClient, draft.embed.quote.uri),
    ])
    if (resolvedMedia) {
      return {
        $type: 'app.bsky.embed.recordWithMedia',
        record: {
          $type: 'app.bsky.embed.record',
          record: resolvedQuote,
        },
        media: resolvedMedia,
      }
    }
    return {
      $type: 'app.bsky.embed.record',
      record: resolvedQuote,
    }
  }
  const resolvedMedia = await resolveMedia(
    agent,
    queryClient,
    draft.embed,
    onStateChange,
  )
  if (resolvedMedia) {
    return resolvedMedia
  }
  if (draft.embed.link) {
    const resolvedLink = await fetchResolveLinkQuery(
      queryClient,
      agent,
      draft.embed.link.uri,
    )
    if (resolvedLink.type === 'record') {
      return {
        $type: 'app.bsky.embed.record',
        record: resolvedLink.record,
      }
    }
  }
  return undefined
}

async function resolveMedia(
  agent: BskyAgent,
  queryClient: QueryClient,
  embedDraft: EmbedDraft,
  onStateChange: ((state: string) => void) | undefined,
): Promise<
  | $Typed<AppBskyEmbedExternal.Main>
  | $Typed<AppBskyEmbedImages.Main>
  | $Typed<AppBskyEmbedVideo.Main>
  | undefined
> {
  if (embedDraft.media?.type === 'images') {
    const imagesDraft = embedDraft.media.images
    logger.debug(`Uploading images`, {
      count: imagesDraft.length,
    })
    onStateChange?.(t`Uploading images...`)
    const images: AppBskyEmbedImages.Image[] = await Promise.all(
      imagesDraft.map(async (image, i) => {
        logger.debug(`Compressing image #${i}`)
        const {path, width, height, mime} = await compressImage(image)
        logger.debug(`Uploading image #${i}`)
        const res = await uploadBlob(agent, path, mime)
        return {
          image: res.data.blob,
          alt: image.alt,
          aspectRatio: {width, height},
        }
      }),
    )
    return {
      $type: 'app.bsky.embed.images',
      images,
    }
  }
  if (
    embedDraft.media?.type === 'video' &&
    embedDraft.media.video.status === 'done'
  ) {
    const videoDraft = embedDraft.media.video
    const captions = await Promise.all(
      videoDraft.captions
        .filter(caption => caption.lang !== '')
        .map(async caption => {
          const {data} = await agent.uploadBlob(caption.file, {
            encoding: 'text/vtt',
          })
          return {lang: caption.lang, file: data.blob}
        }),
    )

    // lexicon numbers must be floats
    const width = Math.round(videoDraft.asset.width)
    const height = Math.round(videoDraft.asset.height)

    // aspect ratio values must be >0 - better to leave as unset otherwise
    // posting will fail if aspect ratio is set to 0
    const aspectRatio = width > 0 && height > 0 ? {width, height} : undefined

    if (!aspectRatio) {
      logger.error(
        `Invalid aspect ratio - got { width: ${videoDraft.asset.width}, height: ${videoDraft.asset.height} }`,
      )
    }

    return {
      $type: 'app.bsky.embed.video',
      video: videoDraft.pendingPublish.blobRef,
      alt: videoDraft.altText || undefined,
      captions: captions.length === 0 ? undefined : captions,
      aspectRatio,
    }
  }
  if (embedDraft.media?.type === 'gif') {
    const gifDraft = embedDraft.media
    const resolvedGif = await fetchResolveGifQuery(
      queryClient,
      agent,
      gifDraft.gif,
    )
    let blob: BlobRef | undefined
    if (resolvedGif.thumb) {
      onStateChange?.(t`Uploading link thumbnail...`)
      const {path, mime} = resolvedGif.thumb.source
      const response = await uploadBlob(agent, path, mime)
      blob = response.data.blob
    }
    return {
      $type: 'app.bsky.embed.external',
      external: {
        uri: resolvedGif.uri,
        title: resolvedGif.title,
        description: createGIFDescription(resolvedGif.title, gifDraft.alt),
        thumb: blob,
      },
    }
  }
  if (embedDraft.link) {
    const resolvedLink = await fetchResolveLinkQuery(
      queryClient,
      agent,
      embedDraft.link.uri,
    )
    if (resolvedLink.type === 'external') {
      let blob: BlobRef | undefined
      if (resolvedLink.thumb) {
        onStateChange?.(t`Uploading link thumbnail...`)
        const {path, mime} = resolvedLink.thumb.source
        const response = await uploadBlob(agent, path, mime)
        blob = response.data.blob
      }
      return {
        $type: 'app.bsky.embed.external',
        external: {
          uri: resolvedLink.uri,
          title: resolvedLink.title,
          description: resolvedLink.description,
          thumb: blob,
        },
      }
    }
  }
  return undefined
}

async function resolveRecord(
  agent: BskyAgent,
  queryClient: QueryClient,
  uri: string,
): Promise<ComAtprotoRepoStrongRef.Main> {
  const resolvedLink = await fetchResolveLinkQuery(queryClient, agent, uri)
  if (resolvedLink.type !== 'record') {
    throw Error(t`Expected uri to resolve to a record`)
  }
  return resolvedLink.record
}

// The built-in hashing functions from multiformats (`multiformats/hashes/sha2`)
// are meant for Node.js, this is the cross-platform equivalent.
const mf_sha256 = Hasher.from({
  name: 'sha2-256',
  code: 0x12,
  encode: input => {
    const digest = sha256.arrayBuffer(input)
    return new Uint8Array(digest)
  },
})

async function computeCid(
  record:
    | AppBskyFeedPost.Record
    | AppFoodiosFeedRecipePost.Record
    | AppFoodiosFeedReviewRating.Record,
): Promise<string> {
  // IMPORTANT: `prepareObject` prepares the record to be hashed by removing
  // fields with undefined value, and converting BlobRef instances to the
  // right IPLD representation.
  const prepared = prepareForHashing(record)
  // 1. Encode the record into DAG-CBOR format
  const encoded = dcbor.encode(prepared)
  // 2. Hash the record in SHA-256 (code 0x12)
  const digest = await mf_sha256.digest(encoded)
  // 3. Create a CIDv1, specifying DAG-CBOR as content (code 0x71)
  const cid = CID.createV1(0x71, digest)
  // 4. Get the Base32 representation of the CID (`b` prefix)
  return cid.toString()
}

// Returns a transformed version of the object for use in DAG-CBOR.
function prepareForHashing(v: any): any {
  // IMPORTANT: BlobRef#ipld() returns the correct object we need for hashing,
  // the API client will convert this for you but we're hashing in the client,
  // so we need it *now*.
  if (v instanceof BlobRef) {
    return v.ipld()
  }

  // Walk through arrays
  if (Array.isArray(v)) {
    let pure = true
    const mapped = v.map(value => {
      if (value !== (value = prepareForHashing(value))) {
        pure = false
      }
      return value
    })
    return pure ? v : mapped
  }

  // Walk through plain objects
  if (isPlainObject(v)) {
    const obj: any = {}
    let pure = true
    for (const key in v) {
      let value = v[key]
      // `value` is undefined
      if (value === undefined) {
        pure = false
        continue
      }
      // `prepareObject` returned a value that's different from what we had before
      if (value !== (value = prepareForHashing(value))) {
        pure = false
      }
      obj[key] = value
    }
    // Return as is if we haven't needed to tamper with anything
    return pure ? v : obj
  }
  return v
}

function isPlainObject(v: any): boolean {
  if (typeof v !== 'object' || v === null) {
    return false
  }
  const proto = Object.getPrototypeOf(v)
  return proto === Object.prototype || proto === null
}
