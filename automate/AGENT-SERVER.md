# Stagehand Agent Server

A local HTTP/WebSocket server that wraps the Stagehand browser automation agent, providing an API for the Chrome extension to execute complex browser automation tasks.

## Architecture

```
Chrome Extension <---> Agent Server (localhost:3456) <---> Stagehand/Chrome
      |                        |                              |
   UI/Control             Task Queue                   Browser Automation
                        WebSocket Events
```

## Features

- **HTTP REST API** for task management
- **WebSocket** for real-time status updates
- **Task Queue** for managing multiple automation tasks
- **Live Screenshots** streamed during execution
- **Data Extraction** with structured results
- **Session Persistence** via Chrome user data directory

## Installation

```bash
cd automate
npm install
```

## Usage

### 1. Start the Agent Server

```bash
npm run agent-server
```

The server will start on `http://localhost:3456`

### 2. Test the Server

In another terminal:

```bash
npm run test-server
```

### 3. API Endpoints

#### Health Check
```
GET /health
```

#### Create Task
```
POST /tasks
Content-Type: application/json

{
  "task": "Go to google.com and search for 'AI agents'",
  "options": {
    "maxSteps": 15,
    "screenshot": true
  }
}
```

#### Get Task Status
```
GET /tasks/:taskId
```

#### List All Tasks
```
GET /tasks
```

#### Cancel Task
```
DELETE /tasks/:taskId
```

### 4. WebSocket Events

Connect to `ws://localhost:3456` to receive real-time events:

- `init` - Initial connection with current tasks
- `task-created` - New task created
- `task-started` - Task execution started
- `task-update` - Progress update with current step
- `screenshot` - Screenshot captured (base64)
- `data-extracted` - Data extracted from page
- `task-completed` - Task finished successfully
- `task-failed` - Task failed with error

## Integration with Chrome Extension

The Chrome extension can use the provided `AgentClient` service:

```typescript
import { agentClient } from '@/shared/services/agent-client';

// Create a task
const { taskId } = await agentClient.createTask(
  "Find product prices on amazon.com"
);

// Listen for updates
agentClient.on('task-update', (event) => {
  console.log('Progress:', event.task.progress);
});

// Get screenshots
agentClient.on('screenshot', (event) => {
  const imgUrl = `data:image/png;base64,${event.data}`;
  // Display in UI
});
```

## Environment Variables

Create a `.env` file in the `automate` directory:

```env
ANTHROPIC_API_KEY=your_api_key_here
```

## Troubleshooting

### Server won't start
- Check if port 3456 is already in use
- Ensure Chrome is installed at the expected location
- Verify `.env` file exists with valid API key

### Tasks fail immediately
- Check Chrome permissions
- Ensure Stagehand can launch Chrome
- Look at server logs for detailed errors

### WebSocket disconnects
- Check CORS settings if connecting from different origin
- Ensure no firewall blocking WebSocket connections

## Development

### Adding New Actions

To add new actions to the agent, modify `agent-fixed.ts`:

1. Add new action type to `ActionType` enum
2. Update `getNextAction` prompt with new action description
3. Implement action handler in `executeAction` method
4. Add appropriate hooks for status updates

### Debugging

Run with verbose logging:

```bash
DEBUG=* npm run agent-server
```

## Security Notes

- Server runs locally only (localhost)
- No authentication implemented (add if needed)
- Chrome runs with automation flags disabled for better compatibility
- User data persisted in `~/.stagehand-browser-data` 