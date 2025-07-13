import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig from "./stagehand.config.js";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { z } from "zod";
import chalk from "chalk";

// Fixed version with better error handling

const ActionType = z.enum([
  "navigate",
  "click", 
  "type",
  "extract",
  "observe",
  "screenshot",
  "act", // General action for complex operations
  "new_tab",
  "switch_tab", 
  "close_tab",
  "complete"
]);

const DecisionSchema = z.object({
  action: ActionType,
  reasoning: z.string(),
  parameters: z.record(z.any()).optional(),
});

type Decision = z.infer<typeof DecisionSchema>;

export class FixedWebAgent {
  private stagehand: Stagehand;
  private model: any;
  private taskHistory: string[] = [];
  private extractedData: any[] = [];
  private pages: any[] = []; // Track all open pages/tabs
  private currentPageIndex: number = 0; // Track which page we're on

  constructor(stagehand: Stagehand, model: any) {
    this.stagehand = stagehand;
    this.model = model;
    this.pages = [stagehand.page]; // Initialize with the default page
  }

  // Hook methods for subclasses to override
  protected async onStepStart(step: number, action: string): Promise<void> {}
  protected async onScreenshot(screenshot: Buffer): Promise<void> {}
  protected async onDataExtracted(data: any): Promise<void> {}
  protected async onObservation(observation: any): Promise<void> {}
  protected async onError(error: Error): Promise<void> {}

  // Helper method to get current page
  private getCurrentPage() {
    return this.pages[this.currentPageIndex];
  }

  async executeTask(task: string): Promise<void> {
    console.log(chalk.blue.bold(`\n🎯 Starting Task: ${task}\n`));
    this.taskHistory.push(`Task: ${task}`);

    let completed = false;
    let stepCount = 0;
    const maxSteps = 15;
    let consecutiveErrors = 0;

    while (!completed && stepCount < maxSteps && consecutiveErrors < 3) {
      stepCount++;
      console.log(chalk.yellow(`\n📍 Step ${stepCount}:`));

      try {
        // Get current page state
        const currentPage = this.getCurrentPage();
        const pageUrl = currentPage.url();
        const pageTitle = await currentPage.title();
        
        // Take a screenshot for context
        const screenshot = await currentPage.screenshot({ 
          fullPage: false 
        });

        // Get decision from AI
        const decision = await this.getNextAction(
          task,
          pageUrl,
          pageTitle,
          screenshot
        );

        console.log(chalk.gray(`Reasoning: ${decision.reasoning}`));
        console.log(chalk.green(`Action: ${decision.action}`));
        
        if (decision.parameters) {
          console.log(chalk.gray(`Parameters:`, JSON.stringify(decision.parameters, null, 2)));
        }

        // Notify step start
        await this.onStepStart(stepCount, decision.action);
        
        // Send screenshot if available
        await this.onScreenshot(screenshot);

        // Execute the action
        completed = await this.executeAction(decision);
        
        // Reset error counter on success
        consecutiveErrors = 0;
        
        // Add to history
        this.taskHistory.push(
          `Step ${stepCount}: ${decision.action} - ${decision.reasoning}`
        );

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        consecutiveErrors++;
        console.error(chalk.red(`Error in step ${stepCount}:`), error instanceof Error ? error.message : String(error));
        
        // Notify error
        if (error instanceof Error) {
          await this.onError(error);
        }
        
        if (consecutiveErrors >= 3) {
          console.error(chalk.red(`Too many consecutive errors. Stopping.`));
          break;
        }
        
        // Try to recover
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Final summary
    if (completed) {
      console.log(chalk.green.bold(`\n✅ Task completed successfully!`));
    } else {
      console.log(chalk.yellow.bold(`\n⚠️ Task ended after ${stepCount} steps`));
    }

    // Show extracted data summary
    if (this.extractedData.length > 0) {
      console.log(chalk.cyan.bold(`\n📊 Summary of findings:`));
      this.extractedData.forEach((data, index) => {
        console.log(chalk.white(`\n${index + 1}. ${data.summary || 'No summary'}`));
      });
    }
  }

  private async getNextAction(
    task: string,
    currentUrl: string,
    pageTitle: string,
    screenshot: Buffer
  ): Promise<Decision> {
    const screenshotBase64 = screenshot.toString('base64');
    
    const systemPrompt = `You are a web automation agent. You help users complete tasks by navigating websites and extracting information.

Your job is to analyze the current state and decide what action to take next.

ALWAYS respond with a decision object containing:
- action: The type of action to take
- reasoning: Why you chose this action
- parameters: Any parameters needed for the action

Never try to call actions directly. Just return your decision.`;

    const userPrompt = `Task: "${task}"

Current state:
- URL: ${currentUrl}
- Page Title: ${pageTitle}
- Steps taken: ${this.taskHistory.length}
- Last 3 actions: ${this.taskHistory.slice(-3).join('\n')}

Decide what to do next. Choose from:
- navigate: Go to a URL (needs parameters.url)
- click: Click something (needs parameters.instruction)
- type: Type text (needs parameters.instruction and parameters.text)
- extract: Extract information (needs parameters.instruction)
- observe: Look for elements (needs parameters.instruction)
- screenshot: Take a screenshot
- act: Perform a general action (needs parameters.instruction)
- new_tab: Create a new browser tab
- switch_tab: Switch to a specific tab (needs parameters.tabIndex)
- close_tab: Close current tab
- complete: Finish the task

Consider if you have found the information requested in the task.`;

    const response = await generateText({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { 
              type: "image", 
              image: `data:image/png;base64,${screenshotBase64}` 
            }
          ],
        },
      ],
      tools: {
        decide: {
          description: "Decide what action to take next",
          parameters: DecisionSchema,
        },
      },
      toolChoice: "required",
    });

    if (!response.toolCalls || response.toolCalls.length === 0) {
      throw new Error("No tool call received from AI");
    }

    return response.toolCalls[0].args as Decision;
  }

  private async executeAction(decision: Decision): Promise<boolean> {
    try {
      switch (decision.action) {
        case "navigate":
          const url = decision.parameters?.url;
          if (!url) throw new Error("Navigate requires url parameter");
          
          await this.getCurrentPage().goto(url);
          console.log(chalk.cyan(`✓ Navigated to: ${url}`));
          break;

        case "click":
          const clickInstruction = decision.parameters?.instruction;
          if (!clickInstruction) throw new Error("Click requires instruction");
          
          await this.getCurrentPage().act(clickInstruction);
          console.log(chalk.cyan(`✓ Clicked: ${clickInstruction}`));
          break;

        case "type":
          const typeInstruction = decision.parameters?.instruction;
          const text = decision.parameters?.text;
          if (!typeInstruction || !text) {
            throw new Error("Type requires instruction and text");
          }
          
          await this.getCurrentPage().act(
            `${typeInstruction}: "${text}"`
          );
          console.log(chalk.cyan(`✓ Typed: "${text}" in ${typeInstruction}`));
          break;

        case "extract":
          const extractInstruction = decision.parameters?.instruction;
          if (!extractInstruction) throw new Error("Extract requires instruction");
          
          const schema = z.object({
            data: z.any(),
            summary: z.string(),
          });
          
          const extracted = await this.getCurrentPage().extract({
            instruction: extractInstruction,
            schema,
          });
          
          this.extractedData.push(extracted);
          console.log(chalk.cyan(`✓ Extracted data successfully`));
          console.log(chalk.white(JSON.stringify(extracted, null, 2)));
          
          // Notify data extraction
          await this.onDataExtracted(extracted);
          break;

        case "observe":
          const observeInstruction = decision.parameters?.instruction;
          if (!observeInstruction) throw new Error("Observe requires instruction");
          
          const observations = await this.getCurrentPage().observe(
            observeInstruction
          );
          console.log(chalk.cyan(`✓ Observed:`, observations));
          
          // Notify observation
          await this.onObservation({
            instruction: observeInstruction,
            observations: observations
          });
          break;

        case "screenshot":
          await this.getCurrentPage().screenshot();
          console.log(chalk.cyan(`✓ Screenshot taken`));
          break;

        case "act":
          const actInstruction = decision.parameters?.instruction;
          if (!actInstruction) throw new Error("Act requires instruction");
          
          await this.getCurrentPage().act(actInstruction);
          console.log(chalk.cyan(`✓ Performed action: ${actInstruction}`));
          break;

        case "new_tab":
          const newPage = await this.stagehand.context.newPage();
          this.pages.push(newPage);
          console.log(chalk.cyan(`✓ Created new tab (Total tabs: ${this.pages.length})`));
          break;

        case "switch_tab":
          const tabIndex = decision.parameters?.tabIndex || 0;
          if (tabIndex >= 0 && tabIndex < this.pages.length) {
            await this.pages[tabIndex].bringToFront();
            this.currentPageIndex = tabIndex;
            console.log(chalk.cyan(`✓ Switched to tab ${tabIndex + 1}`));
          } else {
            throw new Error(`Invalid tab index: ${tabIndex}. Available tabs: ${this.pages.length}`);
          }
          break;

        case "close_tab":
          if (this.currentPageIndex > 0) { // Don't close the first tab
            await this.getCurrentPage().close();
            this.pages.splice(this.currentPageIndex, 1);
            // Switch to the previous tab
            this.currentPageIndex = Math.max(0, this.currentPageIndex - 1);
            console.log(chalk.cyan(`✓ Closed tab. Remaining tabs: ${this.pages.length}`));
          } else {
            console.log(chalk.yellow(`⚠️ Cannot close the last remaining tab`));
          }
          break;

        case "complete":
          console.log(chalk.green(`✓ Task marked as complete`));
          return true;

        default:
          throw new Error(`Unknown action: ${decision.action}`);
      }
    } catch (error) {
      console.error(chalk.red(`Failed to execute ${decision.action}:`), error instanceof Error ? error.message : String(error));
      throw error;
    }

    return false;
  }
}

// Example usage (commented out to prevent auto-execution)
// async function runFixedAgent() {
//   console.log(chalk.magenta.bold("\n🤖 Fixed Web Agent Starting...\n"));

//   const stagehand = new Stagehand({
//     ...StagehandConfig,
//     env: "LOCAL",
//     verbose: 1,
//   });

//   await stagehand.init();

//   const model = anthropic("claude-sonnet-4-20250514");
//   const agent = new FixedWebAgent(stagehand, model);

//   // Run the same task
//   await agent.executeTask(
//     "Create 2 tabs - one for job app and one for linkedin  - go to my profile www.linkedin.com/in/barathsa to get my name, title, and company and fill up the job application form at https://job-boards.greenhouse.io/anthropic/jobs/4741104008. Fill whatever information you can find."
//   );

//   await new Promise(resolve => setTimeout(resolve, 3000));
//   await stagehand.close();
  
//   console.log(chalk.magenta.bold("\n🤖 Agent completed!\n"));
// }

// runFixedAgent().catch(console.error); 