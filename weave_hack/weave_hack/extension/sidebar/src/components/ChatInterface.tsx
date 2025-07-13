'use client'

import { useState, useRef, useEffect } from 'react'
import { IMessage } from '@/types/chat'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import Header from './Header'

export default function ChatInterface() {
  const [messages, setMessages] = useState<IMessage[]>([
    {
      id: '1',
      content: `Hello! I'm connected to your Universal Web Command Center. Here are the available commands:

📋 **Available Commands:**
• **/help** - Show available commands
• **/web [query]** - Search the web using AI
• **/memory save [content]** - Save information
• **/memory search [query]** - AI-powered memory search
• **/memory list [limit]** - List memories
• **/memory delete [id]** - Delete a memory
• **Plain text** - Defaults to web search

I can also help you generate scripts to automate this webpage. Just describe what you want to do!`,
      sender: 'assistant',
      timestamp: Date.now()
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (content: string) => {
    console.log('[Chat] Sending message:', content)
    
    if (!content.trim()) {
      console.log('[Chat] Empty message, ignoring')
      return
    }
    
    // Add user message
    const userMessage: IMessage = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: Date.now()
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      // TODO: This will be handled by the background script via chrome.runtime.sendMessage
      // For now, simulate that the integration is ready
      setTimeout(() => {
        const aiResponse: IMessage = {
          id: (Date.now() + 1).toString(),
          content: `I'll process your request: "${content}" through the Universal Web Command Center. The Chrome extension is now configured to use your Python API at http://localhost:8000/chat`,
          sender: 'assistant',
          timestamp: Date.now()
        }
        
        setMessages(prev => [...prev, aiResponse])
        setIsLoading(false)
      }, 1000)
      
    } catch (error) {
      console.error('[Chat] Error sending message:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <Header />
      
      <div className="flex-1 overflow-hidden">
        <MessageList 
          messages={messages} 
          isLoading={isLoading}
          messagesEndRef={messagesEndRef}
        />
      </div>
      
      <MessageInput 
        onSendMessage={handleSendMessage}
        disabled={isLoading}
      />
    </div>
  )
} 