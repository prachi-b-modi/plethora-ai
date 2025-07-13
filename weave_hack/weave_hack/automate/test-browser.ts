import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig from "./stagehand.config.js";

async function openGoogle() {
  console.log("Initializing browser...");
  const stagehand = new Stagehand({
    ...StagehandConfig,
    env: "LOCAL", // Force local Chrome usage
  });

  try {
    await stagehand.init();
    console.log("Browser initialized successfully!");

    console.log("Navigating to Google.com...");
    await stagehand.page.goto("https://www.google.com");
    console.log("Successfully opened Google.com!");

    // Take a screenshot to verify
    const screenshot = await stagehand.page.screenshot({ fullPage: true });
    console.log("Screenshot taken!");

    // Keep browser open for 10 seconds so you can see it
    console.log("Keeping browser open for 10 seconds...");
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error("Error:", error);
  } finally {
    console.log("Closing browser...");
    await stagehand.close();
    console.log("Done!");
  }
}

openGoogle().catch(console.error); 