'use client'

import { IMessage } from '@/types/chat'
import MessageBubble from './MessageBubble'
import LoadingIndicator from './LoadingIndicator'

interface MessageListProps {
  messages: IMessage[]
  isLoading: boolean
  messagesEndRef: React.RefObject<HTMLDivElement>
}

export default function MessageList({ messages, isLoading, messagesEndRef }: MessageListProps) {
  return (
    <div className="h-full overflow-y-auto chat-scrollbar p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      
      {isLoading && <LoadingIndicator />}
      
      <div ref={messagesEndRef} />
    </div>
  )
} 