// Test script for the agent server
import chalk from 'chalk';
import { WebSocket } from 'ws';

async function testAgentServer() {
  console.log(chalk.blue.bold('\n🧪 Testing Agent Server...\n'));

  const baseUrl = 'http://127.0.0.1:3456';

  try {
    // 1. Health check
    console.log(chalk.yellow('1. Testing health endpoint...'));
    const healthResponse = await fetch(`${baseUrl}/health`);
    const health = await healthResponse.json();
    console.log(chalk.green('✓ Health check passed:'), health);

    // 2. Create a task
    console.log(chalk.yellow('\n2. Creating a test task...'));
    const createResponse = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'Go to https://www.google.com and search for "Stagehand browser automation" then take a screenshot of the results',
        options: { maxSteps: 10 }
      })
    });
    
    const { taskId } = await createResponse.json();
    console.log(chalk.green('✓ Task created:'), taskId);

    // 3. Connect WebSocket for live updates
    console.log(chalk.yellow('\n3. Connecting WebSocket for live updates...'));
    const ws = new WebSocket(`ws://127.0.0.1:3456`);
    
    ws.onopen = () => {
      console.log(chalk.green('✓ WebSocket connected'));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'task-update':
          console.log(chalk.cyan(`📍 Step ${data.task.progress.currentStep}: ${data.task.progress.lastAction}`));
          break;
        case 'screenshot':
          console.log(chalk.magenta('📸 Screenshot captured'));
          break;
        case 'data-extracted':
          console.log(chalk.blue('📊 Data extracted:'), data.data);
          break;
        case 'task-completed':
          console.log(chalk.green.bold('\n✅ Task completed successfully!'));
          ws.close();
          process.exit(0);
          break;
        case 'task-failed':
          console.log(chalk.red.bold('\n❌ Task failed:'), data.task.error);
          ws.close();
          process.exit(1);
          break;
      }
    };

    ws.onerror = (error) => {
      console.error(chalk.red('WebSocket error:'), error);
    };

    // 4. Poll task status
    console.log(chalk.yellow('\n4. Monitoring task progress...'));
    
    const pollInterval = setInterval(async () => {
      const statusResponse = await fetch(`${baseUrl}/tasks/${taskId}`);
      const status = await statusResponse.json();
      
      if (status.status === 'completed' || status.status === 'failed') {
        clearInterval(pollInterval);
      }
    }, 2000);

  } catch (error) {
    console.error(chalk.red('Test failed:'), error);
    process.exit(1);
  }
}

// Run the test
console.log(chalk.gray('Make sure the agent server is running: npm run agent-server'));
console.log(chalk.gray('Starting test in 3 seconds...\n'));

setTimeout(() => {
  testAgentServer().catch(console.error);
}, 3000); 