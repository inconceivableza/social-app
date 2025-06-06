import type React from 'react'

import {CHAT_DISABLED} from '#/lib/constants'
import {CurrentConvoIdProvider} from '#/state/messages/current-convo-id'
import {MessagesEventBusProvider} from '#/state/messages/events'
import {ListConvosProvider} from '#/state/queries/messages/list-conversations'
import {MessageDraftsProvider} from './message-drafts'

export function MessagesProvider({children}: {children: React.ReactNode}) {
  return !CHAT_DISABLED ? (
    <CurrentConvoIdProvider>
      <MessageDraftsProvider>
        <MessagesEventBusProvider>
          <ListConvosProvider>{children}</ListConvosProvider>
        </MessagesEventBusProvider>
      </MessageDraftsProvider>
    </CurrentConvoIdProvider>
  ) : (
    {children}
  )
}
