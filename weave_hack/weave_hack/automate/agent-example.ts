import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig from "./stagehand.config.js";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { z } from "zod";
import chalk from "chalk";

// Define the types of actions our agent can take
const AgentAction = z.enum([
  "navigate",
  "click",
  "type",
  "extract",
  "observe",
  "screenshot",
  "complete"
]);

const AgentDecision = z.object({
  action: AgentAction,
  reasoning: z.string(),
  parameters: z.object({
    url: z.string().optional(),
    selector: z.string().optional(),
    text: z.string().optional(),
    instruction: z.string().optional(),
  }).optional(),
});

type AgentDecision = z.infer<typeof AgentDecision>;

class WebAgent {
  private stagehand: Stagehand;
  private model: any;
  private taskHistory: string[] = [];

  constructor(stagehand: Stagehand, model: any) {
    this.stagehand = stagehand;
    this.model = model;
  }

  async executeTask(task: string): Promise<void> {
    console.log(chalk.blue.bold(`\n🎯 Starting Task: ${task}\n`));
    this.taskHistory.push(`Task: ${task}`);

    let completed = false;
    let stepCount = 0;
    const maxSteps = 20;

    while (!completed && stepCount < maxSteps) {
      stepCount++;
      console.log(chalk.yellow(`\n📍 Step ${stepCount}:`));

      // Get current page state
      const pageUrl = this.stagehand.page.url();
      const pageTitle = await this.stagehand.page.title();
      
      // Take a screenshot for context
      const screenshot = await this.stagehand.page.screenshot({ 
        fullPage: false 
      });

      // Let the LLM decide what to do next
      const decision = await this.makeDecision(
        task,
        pageUrl,
        pageTitle,
        screenshot
      );

      console.log(chalk.gray(`Reasoning: ${decision.reasoning}`));
      console.log(chalk.green(`Action: ${decision.action}`));

      // Execute the decision
      completed = await this.executeAction(decision);
      
      // Add to history
      this.taskHistory.push(
        `Step ${stepCount}: ${decision.action} - ${decision.reasoning}`
      );

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (completed) {
      console.log(chalk.green.bold(`\n✅ Task completed successfully!`));
    } else {
      console.log(chalk.red.bold(`\n❌ Task incomplete after ${maxSteps} steps`));
    }
  }

  private async makeDecision(
    task: string,
    currentUrl: string,
    pageTitle: string,
    screenshot: Buffer
  ): Promise<AgentDecision> {
    const screenshotBase64 = screenshot.toString('base64');
    
    const prompt = `You are a web automation agent. Your task is: "${task}"

Current state:
- URL: ${currentUrl}
- Page Title: ${pageTitle}
- History: ${this.taskHistory.join('\n')}

Based on the screenshot and current state, decide what action to take next.

You must return a decision object with these fields:
- action: one of [navigate, click, type, extract, observe, screenshot, complete]
- reasoning: explanation of why you chose this action
- parameters: object with relevant parameters for the action

Available actions and their parameters:
- navigate: Go to a URL (parameters: {url: "https://..."})
- click: Click on an element (parameters: {instruction: "click the button"})
- type: Type text (parameters: {instruction: "in search box", text: "what to type"})
- extract: Extract data (parameters: {instruction: "what to extract"})
- observe: Observe page (parameters: {instruction: "what to look for"})
- screenshot: Take screenshot (parameters: {} or omit)
- complete: Task finished (parameters: {} or omit)

IMPORTANT: You are returning a DECISION about what action to take, not calling the action directly.
Return the decision through the makeDecision tool.`;

    try {
      const response = await generateText({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are a web automation agent that makes decisions about what actions to take. Always use the makeDecision tool to return your decision."
          },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { 
                type: "image", 
                image: `data:image/png;base64,${screenshotBase64}` 
              }
            ],
          },
        ],
        tools: {
          makeDecision: {
            description: "Return your decision about what action to take next",
            parameters: AgentDecision,
          },
        },
        toolChoice: "required",
      });

      const toolCall = response.toolCalls[0];
      return toolCall.args as AgentDecision;
    } catch (error) {
      console.error(chalk.red("Error in makeDecision:"), error);
      
      // Fallback: try to extract information if we're on a relevant page
      if (pageTitle.toLowerCase().includes('ai') || pageTitle.toLowerCase().includes('model')) {
        return {
          action: "extract",
          reasoning: "Attempting to extract information from the current page after encountering an error",
          parameters: {
            instruction: "Extract all information about AI models, especially any Chinese models with large parameter counts"
          }
        };
      }
      
      // Otherwise, try to continue searching
      return {
        action: "navigate",
        reasoning: "Encountered an error, navigating back to search",
        parameters: {
          url: "https://www.google.com"
        }
      };
    }
  }

  private async executeAction(decision: AgentDecision): Promise<boolean> {
    try {
      switch (decision.action) {
        case "navigate":
          if (decision.parameters?.url) {
            await this.stagehand.page.goto(decision.parameters.url);
            console.log(chalk.cyan(`Navigated to: ${decision.parameters.url}`));
          }
          break;

        case "click":
          if (decision.parameters?.instruction) {
            await this.stagehand.page.act(decision.parameters.instruction);
            console.log(chalk.cyan(`Clicked: ${decision.parameters.instruction}`));
          }
          break;

        case "type":
          if (decision.parameters?.instruction && decision.parameters?.text) {
            await this.stagehand.page.act(
              `${decision.parameters.instruction}: "${decision.parameters.text}"`
            );
            console.log(chalk.cyan(`Typed: ${decision.parameters.text}`));
          }
          break;

        case "extract":
          if (decision.parameters?.instruction) {
            // Use a more specific schema for AI model information
            const AIModelSchema = z.object({
              models: z.array(z.object({
                name: z.string().optional(),
                creator: z.string().optional(),
                parameterCount: z.string().optional(),
                releaseDate: z.string().optional(),
                features: z.array(z.string()).optional(),
                description: z.string().optional(),
              })).optional(),
              summary: z.string(),
              sources: z.array(z.string()).optional(),
            });

            const data = await this.stagehand.page.extract({
              instruction: decision.parameters.instruction,
              schema: AIModelSchema,
            });
            
            console.log(chalk.cyan(`\n📊 Extracted Information:`));
            console.log(chalk.white(JSON.stringify(data, null, 2)));
            
            // Store the extracted data in task history for final summary
            this.taskHistory.push(`Extracted: ${JSON.stringify(data)}`);
          }
          break;

        case "observe":
          if (decision.parameters?.instruction) {
            const observations = await this.stagehand.page.observe(
              decision.parameters.instruction
            );
            console.log(chalk.cyan(`Observed:`, observations));
          }
          break;

        case "screenshot":
          await this.stagehand.page.screenshot();
          console.log(chalk.cyan(`Screenshot taken`));
          break;

        case "complete":
          return true;
      }
    } catch (error) {
      console.error(chalk.red(`Error executing action:`, error));
    }

    return false;
  }
}

// Example usage
async function runAgent() {
  console.log(chalk.magenta.bold("\n🤖 Web Automation Agent Starting...\n"));

  // Initialize Stagehand
  const stagehand = new Stagehand({
    ...StagehandConfig,
    env: "LOCAL",
  });
  await stagehand.init();

  // Choose your LLM model
  // const model = openai("gpt-4o"); // OpenAI
  const model = anthropic("claude-3-5-sonnet-20241022"); // Anthropic

  // Create the agent
  const agent = new WebAgent(stagehand, model);

  // Example tasks - uncomment one to try
  
  // Task 1: Search for something on Google
  // await agent.executeTask(
  //   "Go to Google and search for 'Stagehand browser automation'"
  // );

  // Task 2: Get information from a website
  // await agent.executeTask(
  //   "Go to news.ycombinator.com and find the top 3 stories"
  // );

  // Task 3: Fill out a form
  // await agent.executeTask(
  //   "Go to https://www.google.com/forms/about/ and learn about Google Forms"
  // );

  // Task 4: Search for Chinese AI model news
  await agent.executeTask(
    "Search for the latest news about the Chinese open source AI model with 1 trillion parameters. Find recent articles about this model, extract key information like the model name, who created it, when it was released, and what makes it special. Provide a summary of what you find."
  );

  // Keep browser open for a bit to see results
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Clean up
  await stagehand.close();
  console.log(chalk.magenta.bold("\n🤖 Agent completed!\n"));
}

// Run the agent
runAgent().catch(console.error); 