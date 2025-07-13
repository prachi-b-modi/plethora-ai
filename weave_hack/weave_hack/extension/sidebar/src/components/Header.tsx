'use client'

export default function Header() {
  const handleClose = () => {
    console.log('[Header] Close button clicked')
    // Send message to content script to close sidebar
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'CLOSE_SIDEBAR' }, '*')
    }
  }

  return (
    <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-4 flex items-center justify-between shadow-lg">
      <div className="flex items-center space-x-3">
        <span className="text-2xl">🚀</span>
        <h1 className="text-lg font-semibold">Dynamic Script Runner</h1>
      </div>
      
      <button
        onClick={handleClose}
        className="w-8 h-8 rounded-md bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center text-xl font-bold"
        title="Close sidebar"
      >
        ×
      </button>
    </div>
  )
} 