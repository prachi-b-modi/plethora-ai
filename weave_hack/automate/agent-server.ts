import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig from "./stagehand.config.js";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { z } from "zod";
import chalk from "chalk";
import { v4 as uuidv4 } from 'uuid';
import { FixedWebAgent } from './agent-fixed.js';
import fs from 'fs/promises';
import path from 'path';

// Server configuration
const PORT = 3456;
const app = express();
const server = app.listen(PORT);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Endpoint to serve today's file content
app.get('/today_file', async (req, res) => {
  try {
    const dataFolderPath = path.join(process.cwd(), '..', 'guide_creator_flow', 'data');
    const todayFilePath = path.join(dataFolderPath, 'today.txt');
    
    // Check if file exists
    try {
      await fs.access(todayFilePath);
    } catch {
      return res.json({ content: '', message: 'No today.txt file found' });
    }
    
    const content = await fs.readFile(todayFilePath, 'utf-8');
    res.json({ content });
  } catch (error) {
    console.error('[Agent Server] Error reading today.txt:', error);
    res.status(500).json({ error: 'Failed to read today.txt file' });
  }
});

// Types for communication
interface TaskRequest {
  id: string;
  task: string;
  options?: {
    maxSteps?: number;
    screenshot?: boolean;
  };
}

interface TaskStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    currentStep: number;
    totalSteps: number;
    lastAction?: string;
  };
  result?: any;
  error?: string;
}

// Active tasks and connections
const activeTasks = new Map<string, TaskStatus>();
const wsClients = new Set<WebSocket>();

// Helper function to save observations to today.txt
async function saveObservationToFile(observation: string) {
  try {
    const dataFolderPath = path.join(process.cwd(), '..', 'guide_creator_flow', 'data');
    const todayFilePath = path.join(dataFolderPath, 'today.txt');
    
    // Ensure data folder exists
    await fs.mkdir(dataFolderPath, { recursive: true });
    
    // Format the observation with timestamp
    const timestamp = new Date().toISOString();
    const formattedObservation = `\n[${timestamp}]\n${observation}\n${'='.repeat(80)}\n`;
    
    // Append to today.txt
    await fs.appendFile(todayFilePath, formattedObservation, 'utf-8');
    
    console.log(chalk.green('✓ Observation saved to today.txt'));
  } catch (error) {
    console.error(chalk.red('Failed to save observation to file:'), error);
  }
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log(chalk.green('New WebSocket connection'));
  wsClients.add(ws);

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log(chalk.yellow('WebSocket connection closed'));
  });

  ws.on('error', (error) => {
    console.error(chalk.red('WebSocket error:'), error);
  });

  // Send current task statuses to new connection
  ws.send(JSON.stringify({
    type: 'init',
    tasks: Array.from(activeTasks.values())
  }));
});

// Broadcast to all WebSocket clients
function broadcast(message: any) {
  const data = JSON.stringify(message);
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Enhanced FixedWebAgent with status updates
class AgentWithUpdates extends FixedWebAgent {
  private taskId: string;
  private currentStep: number = 0;

  constructor(stagehand: Stagehand, model: any, taskId: string) {
    super(stagehand, model);
    this.taskId = taskId;
  }

  protected async onStepStart(step: number, action: string) {
    this.currentStep = step;
    const status = activeTasks.get(this.taskId);
    if (status) {
      status.progress.currentStep = step;
      status.progress.lastAction = action;
      broadcast({
        type: 'task-update',
        task: status
      });
    }
    
    // Send trace log
    broadcast({
      type: 'trace',
      taskId: this.taskId,
      level: 'info',
      message: `📍 Step ${step}: ${action}`,
      timestamp: new Date().toISOString()
    });
  }

  protected async onScreenshot(screenshot: Buffer) {
    broadcast({
      type: 'screenshot',
      taskId: this.taskId,
      data: screenshot.toString('base64')
    });
    
    // Send trace log
    broadcast({
      type: 'trace',
      taskId: this.taskId,
      level: 'success',
      message: '📸 Screenshot captured',
      timestamp: new Date().toISOString()
    });
  }

  protected async onDataExtracted(data: any) {
    // Save extracted data to today.txt
    const extractedText = `Task ID: ${this.taskId}
Step: ${this.currentStep}
Action: Data Extraction
Extracted Data: ${JSON.stringify(data, null, 2)}`;
    
    await saveObservationToFile(extractedText);
    
    broadcast({
      type: 'data-extracted',
      taskId: this.taskId,
      data
    });
    
    // Send trace log
    broadcast({
      type: 'trace',
      taskId: this.taskId,
      level: 'success',
      message: `📊 Data extracted: ${JSON.stringify(data).substring(0, 100)}...`,
      timestamp: new Date().toISOString()
    });
  }

  protected async onObservation(observation: any) {
    // Format observation for saving
    const observationText = `Task ID: ${this.taskId}
Step: ${this.currentStep}
Instruction: ${observation.instruction}
Observations: ${JSON.stringify(observation.observations, null, 2)}`;
    
    // Save to today.txt
    await saveObservationToFile(observationText);
    
    // Broadcast observation event
    broadcast({
      type: 'observation',
      taskId: this.taskId,
      data: observation
    });
    
    // Send trace log
    broadcast({
      type: 'trace',
      taskId: this.taskId,
      level: 'info',
      message: `👁️ Observed: ${observation.instruction}`,
      timestamp: new Date().toISOString()
    });
  }

  protected async onError(error: Error) {
    broadcast({
      type: 'error',
      taskId: this.taskId,
      error: error.message
    });
    
    // Send trace log
    broadcast({
      type: 'trace',
      taskId: this.taskId,
      level: 'error',
      message: `❌ Error: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
}

// Stagehand instance management
let stagehandInstance: Stagehand | null = null;
let isInitializing = false;

async function getStagehand(): Promise<Stagehand> {
  if (stagehandInstance) return stagehandInstance;
  
  if (isInitializing) {
    // Wait for initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return stagehandInstance!;
  }

  isInitializing = true;
  try {
    console.log(chalk.blue('Initializing Stagehand...'));
    stagehandInstance = new Stagehand({
      ...StagehandConfig,
      env: "LOCAL",
      verbose: 1,
    });
    await stagehandInstance.init();
    console.log(chalk.green('Stagehand initialized'));
    return stagehandInstance;
  } finally {
    isInitializing = false;
  }
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    stagehand: stagehandInstance !== null,
    activeTasks: activeTasks.size,
    wsClients: wsClients.size
  });
});

// Create new task
app.post('/tasks', async (req, res) => {
  try {
    const { task, options = {} } = req.body;
    
    if (!task) {
      return res.status(400).json({ error: 'Task description required' });
    }

    const taskId = uuidv4();
    const taskStatus: TaskStatus = {
      id: taskId,
      status: 'pending',
      progress: {
        currentStep: 0,
        totalSteps: options.maxSteps || 15
      }
    };

    activeTasks.set(taskId, taskStatus);
    broadcast({ type: 'task-created', task: taskStatus });

    // Execute task asynchronously
    executeTask(taskId, task, options).catch(error => {
      console.error(chalk.red(`Task ${taskId} failed:`), error);
    });

    res.json({ taskId, status: 'created' });
  } catch (error) {
    console.error(chalk.red('Error creating task:'), error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Get task status
app.get('/tasks/:id', (req, res) => {
  const task = activeTasks.get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

// List all tasks
app.get('/tasks', (req, res) => {
  res.json(Array.from(activeTasks.values()));
});

// Cancel task
app.delete('/tasks/:id', async (req, res) => {
  const task = activeTasks.get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (task.status === 'running') {
    // TODO: Implement task cancellation
    task.status = 'cancelled';
    broadcast({ type: 'task-cancelled', taskId: req.params.id });
  }

  res.json({ status: 'cancelled' });
});

// Execute task
async function executeTask(taskId: string, taskDescription: string, options: any) {
  const status = activeTasks.get(taskId);
  if (!status) return;

  try {
    status.status = 'running';
    broadcast({ type: 'task-started', task: status });
    
    // Send trace log for task start
    broadcast({
      type: 'trace',
      taskId,
      level: 'info',
      message: `🚀 Starting task: ${taskDescription}`,
      timestamp: new Date().toISOString()
    });
    
    // Save task start to today.txt
    await saveObservationToFile(`NEW TASK STARTED
Task ID: ${taskId}
Description: ${taskDescription}
Options: ${JSON.stringify(options, null, 2)}`);

    const stagehand = await getStagehand();
    const model = anthropic("claude-3-5-haiku-20241022");
    const agent = new AgentWithUpdates(stagehand, model, taskId);

    // Execute the task
    const result = await agent.executeTask(taskDescription);

    status.status = 'completed';
    status.result = result;
    broadcast({ type: 'task-completed', task: status });
    
    // Save task completion to today.txt
    await saveObservationToFile(`TASK COMPLETED
Task ID: ${taskId}
Final Status: Completed
Result: ${JSON.stringify(result, null, 2)}`);
    
    // Send trace log for completion
    broadcast({
      type: 'trace',
      taskId,
      level: 'success',
      message: '✅ Task completed successfully!',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    status.status = 'failed';
    status.error = error instanceof Error ? error.message : String(error);
    broadcast({ type: 'task-failed', task: status });
    
    // Save task failure to today.txt
    await saveObservationToFile(`TASK FAILED
Task ID: ${taskId}
Final Status: Failed
Error: ${status.error}
Stack Trace: ${error instanceof Error ? error.stack : 'N/A'}`);
    
    // Send trace log for failure
    broadcast({
      type: 'trace',
      taskId,
      level: 'error',
      message: `💥 Task failed: ${status.error}`,
      timestamp: new Date().toISOString()
    });
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\nShutting down server...'));
  
  if (stagehandInstance) {
    await stagehandInstance.close();
  }
  
  server.close();
  process.exit(0);
});

// Start server
console.log(chalk.magenta.bold(`
🤖 Stagehand Agent Server
📡 HTTP API: http://localhost:${PORT}
🔌 WebSocket: ws://localhost:${PORT}

Available endpoints:
- GET  /health          - Server health check
- POST /tasks           - Create new task
- GET  /tasks           - List all tasks
- GET  /tasks/:id       - Get task status
- DELETE /tasks/:id     - Cancel task

WebSocket events:
- task-created
- task-started
- task-update
- task-completed
- task-failed
- screenshot
- data-extracted
`)); 