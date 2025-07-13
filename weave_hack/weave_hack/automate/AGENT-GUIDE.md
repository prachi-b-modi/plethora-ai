# Agentic Browser Automation Guide

This guide explains how to use LLM agents with Stagehand for autonomous web automation.

## Overview

You have three ways to use agentic automation:

1. **Direct Agent Script** (`agent-example.ts`) - Standalone agent that runs tasks
2. **MCP-Compatible Agent** (`mcp-agent.ts`) - Can be integrated with MCP server
3. **Via MCP Server** - Use the existing MCP tools with an LLM orchestrator

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   LLM (Claude)  │────▶│    Stagehand    │────▶│  Chrome Browser │
│   or GPT-4      │     │  (Automation)   │     │    (Local)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │
        │                        │
        ▼                        ▼
┌─────────────────┐     ┌─────────────────┐
│  Decision Making│     │ Browser Actions │
│   - Planning    │     │  - Navigate     │
│   - Reasoning   │     │  - Click        │
│   - Next Steps  │     │  - Type         │
└─────────────────┘     │  - Extract      │
                        └─────────────────┘
```

## 1. Direct Agent Usage

The simplest way to get started:

```bash
# Run the example agent
cd automate
npx tsx agent-example.ts
```

### Customizing Tasks

Edit `agent-example.ts` and modify the task:

```typescript
// Example tasks
await agent.executeTask(
  "Go to Amazon and find the best-rated wireless headphones under $100"
);

await agent.executeTask(
  "Visit LinkedIn and find 3 job postings for senior software engineers"
);

await agent.executeTask(
  "Go to a news website and summarize today's top 5 headlines"
);
```

## 2. MCP-Compatible Agent

For more structured automation:

```bash
# Run the demo
npx tsx demo-agent.ts
```

### Using the MCPAgent Class

```typescript
import { MCPAgent } from "./mcp-agent.js";

const agent = new MCPAgent();
await agent.init();

// Execute high-level tasks
const result = await agent.executeHighLevelTask(
  "Research climate change on Wikipedia and extract key facts"
);

console.log(result.plan);    // See the planned steps
console.log(result.results); // See execution results
```

## 3. Integration Patterns

### Pattern 1: Task Queue System

```typescript
class TaskQueue {
  private agent: MCPAgent;
  private tasks: string[] = [];

  async processTasks() {
    for (const task of this.tasks) {
      await this.agent.executeHighLevelTask(task);
      await this.delay(2000); // Rate limiting
    }
  }
}
```

### Pattern 2: Event-Driven Automation

```typescript
// Trigger automation based on events
eventEmitter.on('new-competitor', async (competitor) => {
  const agent = new MCPAgent();
  await agent.init();
  
  await agent.executeHighLevelTask(
    `Research ${competitor.name} - visit their website and extract pricing info`
  );
});
```

### Pattern 3: Scheduled Tasks

```typescript
// Run daily research tasks
cron.schedule('0 9 * * *', async () => {
  const agent = new MCPAgent();
  await agent.init();
  
  await agent.executeHighLevelTask(
    "Check tech news and summarize AI developments"
  );
});
```

## 4. Advanced Features

### Custom Step Types

Extend the agent with custom step types:

```typescript
class CustomAgent extends MCPAgent {
  protected async executeStep(step: any): Promise<any> {
    if (step.type === 'wait') {
      await new Promise(r => setTimeout(r, step.parameters.duration));
      return { waited: true };
    }
    
    return super.executeStep(step);
  }
}
```

### Error Recovery

Add retry logic and error handling:

```typescript
const resultWithRetry = await retry(
  () => agent.executeHighLevelTask(task),
  { retries: 3, delay: 1000 }
);
```

### Multi-Agent Coordination

Run multiple agents for complex tasks:

```typescript
const searchAgent = new MCPAgent();
const analysisAgent = new MCPAgent();

// Agent 1: Gather data
const searchResults = await searchAgent.executeHighLevelTask(
  "Search for competitor pricing across 5 websites"
);

// Agent 2: Analyze data
const analysis = await analysisAgent.executeHighLevelTask(
  `Analyze this data and create a comparison: ${JSON.stringify(searchResults)}`
);
```

## 5. MCP Server Integration

To add agent capabilities to your MCP server:

```typescript
// In mcp-server.ts, add a new tool:
{
  name: "execute_task",
  description: "Execute a high-level task using AI agent",
  inputSchema: {
    type: "object",
    properties: {
      task: {
        type: "string",
        description: "Natural language description of the task"
      }
    },
    required: ["task"]
  }
}

// Handler:
case "execute_task":
  const agent = new MCPAgent();
  await agent.init();
  const result = await agent.executeHighLevelTask(args.task);
  await agent.close();
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
```

## 6. Best Practices

### 1. Task Clarity
- Be specific in task descriptions
- Include success criteria
- Mention constraints (time, scope)

### 2. Resource Management
- Always close agents after use
- Implement timeouts for long tasks
- Use connection pooling for multiple agents

### 3. Error Handling
- Log all agent decisions
- Implement fallback strategies
- Monitor for infinite loops

### 4. Performance
- Cache common operations
- Batch similar tasks
- Use parallel execution when possible

## 7. Examples

### Research Agent
```typescript
await agent.executeHighLevelTask(
  "Research the top 5 programming languages in 2024, visit official websites, and compare their key features"
);
```

### Form Filling Agent
```typescript
await agent.executeHighLevelTask(
  "Go to the contact form at example.com/contact and fill it with test data"
);
```

### Monitoring Agent
```typescript
await agent.executeHighLevelTask(
  "Check if our website example.com is up and verify the homepage loads correctly"
);
```

### Data Collection Agent
```typescript
await agent.executeHighLevelTask(
  "Visit 3 job boards and collect all Python developer positions in San Francisco"
);
```

## 8. Debugging

Enable verbose logging:

```typescript
const stagehand = new Stagehand({
  ...StagehandConfig,
  verbose: 2, // Maximum verbosity
});
```

View agent decision process:
- Check console logs for reasoning
- Screenshot at each step
- Review task history

## 9. Limitations

- Requires Anthropic API key
- Local Chrome must be installed
- Some websites may block automation
- Complex multi-step forms may need custom logic

## 10. Next Steps

1. Try the example agents
2. Customize for your use case
3. Integrate with your workflow
4. Build domain-specific agents
5. Share feedback!

Remember: The agent is as smart as the LLM guiding it. Clear instructions and well-defined tasks lead to better results. 