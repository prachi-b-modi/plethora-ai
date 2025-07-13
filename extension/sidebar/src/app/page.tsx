'use client'

import { useState } from 'react'
import ChatInterface from '@/components/ChatInterface'
import AgentInterface from '@/components/AgentInterface'
import MemoriesInterface from '@/components/MemoriesInterface'
import { MessageSquare, Bot, Brain } from 'lucide-react'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'chat' | 'agent' | 'memories'>('chat')

  return (
    <main className="h-screen w-full flex flex-col">
      {/* Tab Navigation */}
      <div className="bg-white border-b flex">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-colors ${
            activeTab === 'chat'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Chat
        </button>
        <button
          onClick={() => setActiveTab('agent')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-colors ${
            activeTab === 'agent'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Bot className="w-4 h-4" />
          Automation
        </button>
        <button
          onClick={() => setActiveTab('memories')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-colors ${
            activeTab === 'memories'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Brain className="w-4 h-4" />
          Memories
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' ? (
          <ChatInterface />
        ) : activeTab === 'agent' ? (
          <AgentInterface />
        ) : (
          <MemoriesInterface />
        )}
      </div>
    </main>
  )
} 