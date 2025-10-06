import {createContext, type PropsWithChildren} from 'react'

type PostAuthorDidContext = string | null

export const PostAuthorDidContext = createContext<PostAuthorDidContext>(null)

export function PostAuthorDidProvider({
  did,
  children,
}: PropsWithChildren<{
  did: string
}>) {
  if (!did) {
    console.log('did', did)
  }
  return (
    <PostAuthorDidContext.Provider value={did}>
      {children}
    </PostAuthorDidContext.Provider>
  )
}
