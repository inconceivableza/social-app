import { AppBskyFeedSearchPosts } from "@atproto/api";

export type AdditionalQueryParams = Pick<AppBskyFeedSearchPosts.QueryParams, "searchType" | "recipeCuisines" | "recipeCategories" | "recipeDiets">
