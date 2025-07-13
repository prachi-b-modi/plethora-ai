import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig from "./stagehand.config.js";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { z } from "zod";

/**
 * MCP-Compatible Agent for Browser Automation
 * 
 * This agent can be integrated with your MCP server to provide
 * high-level task execution capabilities through Cursor.
 */

export class MCPAgent {
  private stagehand: Stagehand | null = null;
  private model: any;

  constructor() {
    // Use Anthropic by default, but this can be configured
    this.model = anthropic("claude-3-5-sonnet-20241022");
  }

  async init(): Promise<void> {
    if (this.stagehand) {
      await this.stagehand.close();
    }

    this.stagehand = new Stagehand({
      ...StagehandConfig,
      env: "LOCAL",
    });
    
    await this.stagehand.init();
  }

  async executeHighLevelTask(task: string): Promise<any> {
    if (!this.stagehand) {
      throw new Error("Agent not initialized. Call init() first.");
    }

    // Analyze the task and break it down into steps
    const taskPlan = await this.planTask(task);
    
    const results = [];
    
    for (const step of taskPlan.steps) {
      console.log(`Executing: ${step.description}`);
      
      try {
        const result = await this.executeStep(step);
        results.push({
          step: step.description,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          step: step.description,
          success: false,
          error: error.message
        });
        
        // Decide whether to continue or abort
        if (step.critical) {
          throw new Error(`Critical step failed: ${step.description}`);
        }
      }
    }

    return {
      task,
      plan: taskPlan,
      results
    };
  }

  private async planTask(task: string): Promise<any> {
    const TaskPlan = z.object({
      steps: z.array(z.object({
        type: z.enum(["navigate", "interact", "extract", "verify"]),
        description: z.string(),
        action: z.string(),
        parameters: z.any().optional(),
        critical: z.boolean().default(true),
      })),
      expectedOutcome: z.string(),
    });

    const response = await generateText({
      model: this.model,
      messages: [
        {
          role: "system",
          content: `You are a web automation planner. Break down high-level tasks into specific, executable steps.
          
Available step types:
- navigate: Go to a specific URL
- interact: Click, type, or interact with page elements
- extract: Extract data from the page
- verify: Check if something is present or has happened

Each step should have a clear description and action.`
        },
        {
          role: "user",
          content: `Plan the following task: "${task}"`
        }
      ],
      tools: {
        planTask: {
          description: "Create a step-by-step plan for the task",
          parameters: TaskPlan,
        },
      },
      toolChoice: "required",
    });

    return response.toolCalls[0].args;
  }

  private async executeStep(step: any): Promise<any> {
    if (!this.stagehand) {
      throw new Error("Stagehand not initialized");
    }

    switch (step.type) {
      case "navigate":
        await this.stagehand.page.goto(step.parameters?.url || step.action);
        return { navigated: true, url: this.stagehand.page.url() };

      case "interact":
        await this.stagehand.page.act(step.action);
        return { interacted: true, action: step.action };

      case "extract":
        const schema = step.parameters?.schema || z.object({ data: z.any() });
        const extracted = await this.stagehand.page.extract({
          instruction: step.action,
          schema
        });
        return { extracted: true, data: extracted };

      case "verify":
        const observations = await this.stagehand.page.observe(step.action);
        return { verified: true, observations };

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  async close(): Promise<void> {
    if (this.stagehand) {
      await this.stagehand.close();
      this.stagehand = null;
    }
  }
}

// Example usage functions that can be called from MCP
export async function runResearchTask(topic: string): Promise<any> {
  const agent = new MCPAgent();
  await agent.init();
  
  try {
    const result = await agent.executeHighLevelTask(
      `Research "${topic}" by visiting Wikipedia and extracting key information`
    );
    return result;
  } finally {
    await agent.close();
  }
}

export async function runFormFillingTask(formUrl: string, data: any): Promise<any> {
  const agent = new MCPAgent();
  await agent.init();
  
  try {
    const result = await agent.executeHighLevelTask(
      `Go to ${formUrl} and fill out the form with the provided data: ${JSON.stringify(data)}`
    );
    return result;
  } finally {
    await agent.close();
  }
}

export async function runDataExtractionTask(url: string, dataType: string): Promise<any> {
  const agent = new MCPAgent();
  await agent.init();
  
  try {
    const result = await agent.executeHighLevelTask(
      `Go to ${url} and extract all ${dataType} information from the page`
    );
    return result;
  } finally {
    await agent.close();
  }
} 