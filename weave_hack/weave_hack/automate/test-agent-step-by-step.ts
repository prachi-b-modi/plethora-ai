import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig from "./stagehand.config.js";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { z } from "zod";
import chalk from "chalk";

console.log(chalk.blue.bold("\n🚀 Starting Step-by-Step Agent Demo\n"));

async function runDemo() {
  let stagehand: Stagehand | null = null;

  try {
    // Step 1: Initialize Stagehand
    console.log(chalk.yellow("Step 1: Initializing Stagehand..."));
    stagehand = new Stagehand({
      ...StagehandConfig,
      env: "LOCAL",
      verbose: 1, // Show some logs
    });
    
    await stagehand.init();
    console.log(chalk.green("✓ Stagehand initialized successfully!\n"));

    // Step 2: Navigate to Google
    console.log(chalk.yellow("Step 2: Navigating to Google..."));
    await stagehand.page.goto("https://www.google.com");
    console.log(chalk.green("✓ Navigated to Google.com\n"));

    // Step 3: Take a screenshot to see what we're working with
    console.log(chalk.yellow("Step 3: Taking a screenshot..."));
    const screenshot1 = await stagehand.page.screenshot({ fullPage: false });
    console.log(chalk.green("✓ Screenshot taken (before search)\n"));

    // Step 4: Use AI to search for something
    console.log(chalk.yellow("Step 4: Using AI to perform a search..."));
    console.log(chalk.gray("Instruction: Click on the search box and type 'Stagehand browser automation'"));
    
    await stagehand.page.act("Click on the search box");
    await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
    
    await stagehand.page.act("Type 'Stagehand browser automation'");
    await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
    
    console.log(chalk.green("✓ Search query entered\n"));

    // Step 5: Submit the search
    console.log(chalk.yellow("Step 5: Submitting the search..."));
    await stagehand.page.act("Press Enter to search");
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for results
    console.log(chalk.green("✓ Search submitted\n"));

    // Step 6: Extract search results
    console.log(chalk.yellow("Step 6: Extracting search results..."));
    
    const SearchResultSchema = z.object({
      results: z.array(z.object({
        title: z.string(),
        url: z.string().optional(),
        description: z.string().optional(),
      })).max(3), // Get top 3 results
    });

    const searchResults = await stagehand.page.extract({
      instruction: "Extract the top 3 search results including title, URL, and description",
      schema: SearchResultSchema,
    });

    console.log(chalk.green("✓ Search results extracted:"));
    console.log(chalk.cyan(JSON.stringify(searchResults, null, 2)));
    console.log();

    // Step 7: Take final screenshot
    console.log(chalk.yellow("Step 7: Taking final screenshot..."));
    const screenshot2 = await stagehand.page.screenshot({ fullPage: false });
    console.log(chalk.green("✓ Final screenshot taken\n"));

    // Step 8: Use AI to analyze what we found
    console.log(chalk.yellow("Step 8: Using AI to analyze the results..."));
    
    const model = anthropic("claude-3-5-sonnet-20241022");
    
    const analysis = await generateText({
      model,
      messages: [
        {
          role: "user",
          content: `Based on these search results for "Stagehand browser automation", provide a brief summary of what Stagehand is:
          
${JSON.stringify(searchResults, null, 2)}

Please provide a 2-3 sentence summary.`,
        }
      ],
    });

    console.log(chalk.green("✓ AI Analysis:"));
    console.log(chalk.magenta(analysis.text));
    console.log();

  } catch (error) {
    console.error(chalk.red("❌ Error occurred:"), error);
  } finally {
    // Cleanup
    if (stagehand) {
      console.log(chalk.yellow("\nStep 9: Cleaning up..."));
      await stagehand.close();
      console.log(chalk.green("✓ Browser closed"));
    }
  }
}

console.log(chalk.gray("This demo will:"));
console.log(chalk.gray("1. Open Chrome browser"));
console.log(chalk.gray("2. Navigate to Google"));
console.log(chalk.gray("3. Search for 'Stagehand browser automation'"));
console.log(chalk.gray("4. Extract search results"));
console.log(chalk.gray("5. Use AI to analyze the results"));
console.log(chalk.gray("\nStarting in 2 seconds...\n"));

setTimeout(() => {
  runDemo().then(() => {
    console.log(chalk.blue.bold("\n✨ Demo completed successfully!\n"));
  }).catch(console.error);
}, 2000); 