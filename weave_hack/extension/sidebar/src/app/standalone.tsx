import React from 'react'
import { createRoot } from 'react-dom/client'
import ChatInterface from '../components/ChatInterface'
import '../app/globals.css'

function App() {
  return (
    <div className="h-screen flex flex-col">
      <ChatInterface />
    </div>
  )
}

// Mount the app when DOM is ready
if (typeof window !== 'undefined') {
  const container = document.getElementById('root')
  if (container) {
    const root = createRoot(container)
    root.render(<App />)
  }
} 