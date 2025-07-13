'use client'

import { useState, useEffect } from 'react'
import { agentClient, AgentTaskStatus, AgentEvent } from '@/services/agent-client'
import { ChevronRight, Loader2, CheckCircle, XCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react'

interface ImportantItem {
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  sender: string;
  subject: string;
  time: string;
  reason: string;
}

function parseImportantItemsFromTodayFile(content: string): ImportantItem[] {
  if (!content.trim()) return [];

  const items: ImportantItem[] = [];
  
  try {
    // Look for Data Extraction sections with structured data
    const dataExtractionMatches = content.match(/Action: Data Extraction\s*Extracted Data:\s*\{[\s\S]*?\}\s*={10,}/g);
    
    if (dataExtractionMatches) {
      for (const match of dataExtractionMatches) {
        try {
          // Extract the JSON from the match
          const jsonMatch = match.match(/Extracted Data:\s*(\{[\s\S]*?\})\s*={10,}/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[1]);
            
            // Check for top priority emails structure
            if (data.data?.top_3_priority_emails || data.data?.top_priority_emails || data.data?.top_5_priority_emails) {
              const emails = data.data.top_3_priority_emails || data.data.top_priority_emails || data.data.top_5_priority_emails;
              
              for (const email of emails.slice(0, 5)) { // Limit to top 5
                let priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' = 'MEDIUM';
                
                // Determine priority based on subject keywords and sender
                const subject = email.subject?.toLowerCase() || '';
                const sender = email.sender?.toLowerCase() || '';
                
                if (subject.includes('critical') || subject.includes('alert') || subject.includes('urgent')) {
                  priority = 'CRITICAL';
                } else if (subject.includes('security') || sender.includes('google') || sender.includes('notion') || 
                          subject.includes('login') || subject.includes('device') || sender.includes('chase') || 
                          sender.includes('robinhood') || sender.includes('experian')) {
                  priority = 'HIGH';
                }
                
                items.push({
                  priority,
                  sender: email.sender || 'Unknown',
                  subject: email.subject || 'No subject',
                  time: email.time || email.timestamp || 'Unknown time',
                  reason: email.priority_reason || email.reason || 'Email priority analysis'
                });
              }
            }
            
            // Check for security alerts structure
            if (data.data?.security_alerts) {
              for (const alert of data.data.security_alerts.slice(0, 3)) {
                items.push({
                  priority: 'HIGH',
                  sender: alert.sender || 'Security Alert',
                  subject: alert.subject || 'Security notification',
                  time: alert.time || 'Recent',
                  reason: 'Security alert requiring attention'
                });
              }
            }
            
            // Check for urgent financial structure  
            if (data.data?.urgent_financial) {
              for (const financial of data.data.urgent_financial.slice(0, 2)) {
                items.push({
                  priority: 'HIGH',
                  sender: financial.sender || 'Financial Alert',
                  subject: financial.subject || 'Financial notification',
                  time: financial.time || 'Recent',
                  reason: 'Financial activity requiring review'
                });
              }
            }
          }
        } catch (parseError) {
          console.warn('Failed to parse extracted data JSON:', parseError);
        }
      }
    }
    
    // Fallback: Look for any critical alerts in the content
    if (items.length === 0) {
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.toLowerCase().includes('critical') && line.toLowerCase().includes('alert')) {
          items.push({
            priority: 'CRITICAL',
            sender: 'Automation Log',
            subject: line.trim(),
            time: 'Recent',
            reason: 'Critical alert detected in automation logs'
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Error parsing today file:', error);
  }
  
  // Remove duplicates and sort by priority
  const uniqueItems = items.filter((item, index, self) => 
    index === self.findIndex((other) => other.subject === item.subject && item.sender === other.sender)
  );
  
  return uniqueItems.sort((a, b) => {
    const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

export default function AgentInterface() {
  const [tasks, setTasks] = useState<AgentTaskStatus[]>([])
  const [taskInput, setTaskInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [screenshots, setScreenshots] = useState<Record<string, string[]>>({})
  const [importantItems, setImportantItems] = useState<ImportantItem[]>([])
  const [isDailySummaryLoading, setIsDailySummaryLoading] = useState(true)
  const [dailySummaryError, setDailySummaryError] = useState<string | null>(null)

  // Load daily summary
  useEffect(() => {
    const loadDailySummary = async () => {
      try {
        setIsDailySummaryLoading(true)
        setDailySummaryError(null)
        
        // Hardcoded critical items for now
        const hardcodedItems: ImportantItem[] = [
          {
            priority: 'CRITICAL',
            sender: 'me',
            subject: 'CRITICAL ALERT FOR UPDATING CEO TODAY MORNING AT 12 AM',
            time: '6:40 AM',
            reason: 'Critical alert with CEO involvement'
          },
          {
            priority: 'HIGH',
            sender: 'Google',
            subject: 'Security alert for barathcr7@gmail.com',
            time: '5:33 AM',
            reason: 'Security alert from trusted sender Google'
          },
          {
            priority: 'HIGH',
            sender: 'Google 4',
            subject: 'Security alert',
            time: '4:11 AM',
            reason: 'New sign-in security alert for Google Account'
          },
          {
            priority: 'HIGH',
            sender: 'Notion Team',
            subject: 'A new device logged into your account',
            time: '4:22 AM',
            reason: 'Security-related login alert requiring attention'
          },
          {
            priority: 'HIGH',
            sender: 'Notion Team 2',
            subject: 'A new device logged into your account',
            time: '4:20 AM',
            reason: 'Another security login alert from same timeframe'
          },
          {
            priority: 'HIGH',
            sender: 'Chase Credit Journey',
            subject: 'Did you move? You have a new address on your credit report',
            time: 'Jul 11',
            reason: 'Credit report change requiring verification'
          },
          {
            priority: 'HIGH',
            sender: 'Experian Alerts',
            subject: 'Heads up Barathwaj! You have new alerts on your credit profile',
            time: 'Jul 11',
            reason: 'Credit monitoring alert requiring attention'
          },
          {
            priority: 'HIGH',
            sender: 'Robinhood 2',
            subject: 'Option order executed',
            time: 'Jul 11',
            reason: 'Financial transaction notification'
          },
          {
            priority: 'MEDIUM',
            sender: 'Weights & Biases',
            subject: 'WeaveHacks: Agent Protocols Hackathon starting in 1 hour',
            time: 'Jul 12',
            reason: 'Time-sensitive event notification'
          }
        ];
        
        setImportantItems(hardcodedItems)
        
      } catch (error) {
        console.error('Failed to load daily summary:', error)
        setDailySummaryError('Failed to load daily summary.')
      } finally {
        setIsDailySummaryLoading(false)
      }
    }

    loadDailySummary()
  }, [])

  useEffect(() => {
    // Set up WebSocket event listeners
    const unsubscribeInit = agentClient.on('init', (event) => {
      if (event.tasks) {
        setTasks(event.tasks)
      }
    })

    const unsubscribeConnected = agentClient.on('connected', () => {
      setIsConnected(true)
    })

    const unsubscribeDisconnected = agentClient.on('disconnected', () => {
      setIsConnected(false)
    })

    const unsubscribeTaskUpdate = agentClient.on('task-update', (event) => {
      if (event.task) {
        setTasks(prev => prev.map(t => t.id === event.task!.id ? event.task! : t))
      }
    })

    const unsubscribeTaskCreated = agentClient.on('task-created', (event) => {
      if (event.task) {
        setTasks(prev => [...prev, event.task!])
      }
    })

    const unsubscribeTaskCompleted = agentClient.on('task-completed', (event) => {
      if (event.task) {
        setTasks(prev => prev.map(t => t.id === event.task!.id ? event.task! : t))
      }
    })

    const unsubscribeTaskFailed = agentClient.on('task-failed', (event) => {
      if (event.task) {
        setTasks(prev => prev.map(t => t.id === event.task!.id ? event.task! : t))
      }
    })

    const unsubscribeScreenshot = agentClient.on('screenshot', (event) => {
      if (event.taskId && event.data) {
        setScreenshots(prev => ({
          ...prev,
          [event.taskId!]: [...(prev[event.taskId!] || []), event.data]
        }))
      }
    })

    // Check initial connection
    agentClient.checkHealth().then(setIsConnected)

    return () => {
      unsubscribeInit()
      unsubscribeConnected()
      unsubscribeDisconnected()
      unsubscribeTaskUpdate()
      unsubscribeTaskCreated()
      unsubscribeTaskCompleted()
      unsubscribeTaskFailed()
      unsubscribeScreenshot()
    }
  }, [])

  const handleSubmitTask = async () => {
    if (!taskInput.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const { taskId } = await agentClient.createTask(taskInput.trim())
      setTaskInput('')
      setSelectedTask(taskId)
    } catch (error) {
      console.error('Failed to create task:', error)
      alert('Failed to create task. Make sure the agent server is running.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusIcon = (status: AgentTaskStatus['status']) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusColor = (status: AgentTaskStatus['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 border-yellow-200'
      case 'running':
        return 'bg-blue-50 border-blue-200'
      case 'completed':
        return 'bg-green-50 border-green-200'
      case 'failed':
        return 'bg-red-50 border-red-200'
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Browser Automation</h2>
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

      {/* Daily Summary */}
      {(importantItems.length > 0 || isDailySummaryLoading) && (
        <div className="bg-white border-b px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-800">Today's Important Items</h3>
          </div>
          
          {isDailySummaryLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading daily summary...</span>
            </div>
          ) : dailySummaryError ? (
            <div className="text-sm">
              {dailySummaryError.includes('automation service') ? (
                <div className="text-orange-600 bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <WifiOff className="w-4 h-4" />
                    <span className="font-medium">Automation Service Required</span>
                  </div>
                  <p>Daily summaries require the automation service on localhost:8000</p>
                </div>
              ) : (
                <p className="text-gray-500">{dailySummaryError}</p>
              )}
            </div>
          ) : importantItems.length > 0 ? (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {importantItems.slice(0, 5).map((item, index) => {
                const priorityColor = {
                  'CRITICAL': 'text-red-600 bg-red-50 border-red-200',
                  'HIGH': 'text-orange-600 bg-orange-50 border-orange-200', 
                  'MEDIUM': 'text-green-600 bg-green-50 border-green-200'
                }[item.priority];

                const priorityIcon = {
                  'CRITICAL': '🔴',
                  'HIGH': '🟡',
                  'MEDIUM': '🟢'
                }[item.priority];

                return (
                  <div
                    key={index}
                    className={`px-3 py-2 rounded-lg border text-xs ${priorityColor}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{priorityIcon}</span>
                      <span className="font-medium">{item.priority}</span>
                      <span className="text-gray-500">•</span>
                      <span className="font-medium">{item.sender}</span>
                      <span className="text-gray-500">•</span>
                      <span>{item.time}</span>
                    </div>
                    <p className="font-medium leading-tight">{item.subject}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No important items found.</p>
          )}
        </div>
      )}

      {/* Task Input */}
      <div className="p-4 bg-white border-b">
        <div className="flex gap-2">
          <input
            type="text"
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmitTask()}
            placeholder="Describe what you want to automate..."
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!isConnected || isSubmitting}
          />
          <button
            onClick={handleSubmitTask}
            disabled={!isConnected || isSubmitting || !taskInput.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Run'
            )}
          </button>
        </div>
        {!isConnected && (
          <p className="mt-2 text-sm text-red-600">
            Agent server is not connected. Make sure it's running on port 3456.
          </p>
        )}
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No automation tasks yet. Create one above!
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${getStatusColor(task.status)} ${
                selectedTask === task.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedTask(task.id === selectedTask ? null : task.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(task.status)}
                    <span className="text-sm font-medium capitalize">{task.status}</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{task.id}</p>
                  {task.progress && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Step {task.progress.currentStep} of {task.progress.totalSteps}</span>
                        {task.progress.lastAction && (
                          <span className="font-medium">{task.progress.lastAction}</span>
                        )}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all"
                          style={{
                            width: `${(task.progress.currentStep / task.progress.totalSteps) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <ChevronRight
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    selectedTask === task.id ? 'rotate-90' : ''
                  }`}
                />
              </div>

              {/* Expanded Details */}
              {selectedTask === task.id && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  {task.error && (
                    <div className="p-3 bg-red-100 rounded text-sm text-red-700">
                      Error: {task.error}
                    </div>
                  )}
                  
                  {screenshots[task.id] && screenshots[task.id].length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Screenshots</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {screenshots[task.id].map((screenshot, idx) => (
                          <img
                            key={idx}
                            src={`data:image/png;base64,${screenshot}`}
                            alt={`Screenshot ${idx + 1}`}
                            className="w-full rounded border cursor-pointer hover:opacity-80"
                            onClick={(e) => {
                              e.stopPropagation()
                              // TODO: Open in modal
                              window.open(`data:image/png;base64,${screenshot}`, '_blank')
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {task.result && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Result</h4>
                      <pre className="p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                        {JSON.stringify(task.result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
} 