'use client'

import { IMessage } from '@/types/chat'

interface MessageBubbleProps {
  message: IMessage
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.sender === 'user'
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-lg px-4 py-2 ${
            isUser
              ? 'bg-purple-600 text-white rounded-br-sm'
              : 'bg-gray-100 text-gray-800 rounded-bl-sm'
          }`}
        >
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </div>
        </div>
        
        <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
      
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-3 mt-1 order-0">
          <span className="text-sm">🤖</span>
        </div>
      )}
      
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center ml-3 mt-1 order-3">
          <span className="text-sm">👤</span>
        </div>
      )}
    </div>
  )
} 