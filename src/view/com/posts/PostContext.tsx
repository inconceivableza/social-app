import { AppBskyFeedDefs } from "@atproto/api";
import { PropsWithChildren, createContext } from "react";

type PostViewContext = {
    post: AppBskyFeedDefs.PostView
} | null

export const PostViewContext = createContext<PostViewContext>(null)

export function PostViewContextProvider({ post, children }: PropsWithChildren<{
    post: AppBskyFeedDefs.PostView
}>) {
    return <PostViewContext.Provider value={{ post }}>
        {children}
    </PostViewContext.Provider>
}