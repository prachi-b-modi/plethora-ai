'use client'

import { useState, useEffect } from 'react'
import { memoriesClient, Memory } from '@/services/memories-client'
import { Trash2, RefreshCw, Heart, Clock, Wifi, WifiOff, Brain, Sparkles } from 'lucide-react'

export default function MemoriesInterface() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchMemories = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const fetchedMemories = await memoriesClient.getMemories()
      setMemories(fetchedMemories)
      setIsConnected(true)
    } catch (error) {
      console.error('Failed to fetch memories:', error)
      setError('Failed to connect to memories service')
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteMemory = async (memoryId: string) => {
    if (deletingId) return
    
    setDeletingId(memoryId)
    try {
      await memoriesClient.deleteMemory(memoryId)
      setMemories(prev => prev.filter(memory => memory.id !== memoryId))
    } catch (error) {
      console.error('Failed to delete memory:', error)
      setError('Failed to delete memory')
    } finally {
      setDeletingId(null)
    }
  }

  const checkConnection = async () => {
    const healthy = await memoriesClient.checkHealth()
    setIsConnected(healthy)
  }

  useEffect(() => {
    fetchMemories()
    checkConnection()
  }, [])

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Unknown time'
    try {
      return new Date(timestamp).toLocaleString()
    } catch {
      return timestamp
    }
  }

  const getMemoryTitle = (memory: Memory) => {
    if (memory.title) return memory.title
    if (memory.content) {
      const preview = memory.content.substring(0, 50)
      return preview.length < memory.content.length ? `${preview}...` : preview
    }
    return memory.id
  }

  const getMemoryPreview = (memory: Memory) => {
    if (memory.content && memory.title) {
      const preview = memory.content.substring(0, 120)
      return preview.length < memory.content.length ? `${preview}...` : preview
    }
    return null
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-800">Memories</h2>
          <Sparkles className="w-4 h-4 text-pink-500" />
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={fetchMemories}
            disabled={isLoading}
            className="p-2 text-gray-600 hover:text-purple-600 transition-colors disabled:opacity-50"
            title="Refresh memories"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className="text-xs text-gray-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Connection Warning */}
      {!isConnected && (
        <div className="mx-4 mt-4 p-3 bg-red-100 border border-red-200 rounded-lg text-sm text-red-700">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span>Cannot connect to memories service. Make sure it's running on port 8000.</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-100 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Memories List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin mb-2 text-purple-500" />
            <p>Loading your memories...</p>
          </div>
        ) : memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Heart className="w-12 h-12 mb-3 text-pink-300" />
            <h3 className="text-lg font-medium text-gray-700 mb-1">No memories yet</h3>
            <p className="text-sm text-center">Your memories will appear here when available.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {memories.map((memory, index) => (
              <div
                key={memory.id}
                className="bg-white/70 backdrop-blur-sm rounded-xl border border-purple-100 p-4 shadow-sm hover:shadow-md transition-all duration-200 group"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: 'fadeInUp 0.5s ease-out forwards'
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Heart className="w-4 h-4 text-pink-500 flex-shrink-0" />
                      <h3 className="text-sm font-medium text-gray-800 truncate">
                        {getMemoryTitle(memory)}
                      </h3>
                    </div>
                    
                    {getMemoryPreview(memory) && (
                      <p className="text-xs text-gray-600 leading-relaxed mb-2">
                        {getMemoryPreview(memory)}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimestamp(memory.timestamp)}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteMemory(memory.id)}
                    disabled={deletingId === memory.id}
                    className="ml-3 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    title="Delete memory"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Memory Count Footer */}
      {memories.length > 0 && (
        <div className="bg-white/50 backdrop-blur-sm border-t px-4 py-2 text-center">
          <span className="text-xs text-gray-500">
            {memories.length} {memories.length === 1 ? 'memory' : 'memories'} stored
          </span>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
} 