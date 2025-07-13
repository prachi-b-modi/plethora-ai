import type { ConstructorParams } from "@browserbasehq/stagehand";
import dotenv from "dotenv";
import path from "path";
import os from "os";
import fs from "fs";

dotenv.config();

// Create a persistent user data directory for saving logins
const userDataDir = path.join(os.homedir(), ".stagehand-browser-data");

// Ensure the directory exists
if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir, { recursive: true });
}

const StagehandConfig: ConstructorParams = {
  verbose: 1 /* Verbosity level for logging: 0 = silent, 1 = info, 2 = all */,
  domSettleTimeoutMs: 30_000 /* Timeout for DOM to settle in milliseconds */,

  // LLM configuration
  modelName:
    "anthropic/claude-sonnet-4-20250514" /* Name of the model to use */,
  modelClientOptions: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  } /* Configuration options for the model client */,

  // Browser configuration
  env: "LOCAL" /* Environment to run in: LOCAL or BROWSERBASE */,
  apiKey: process.env.BROWSERBASE_API_KEY /* API key for authentication */,
  projectId: process.env.BROWSERBASE_PROJECT_ID /* Project identifier */,
  browserbaseSessionID:
    undefined /* Session ID for resuming Browserbase sessions */,
  browserbaseSessionCreateParams: {
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    browserSettings: {
      blockAds: true,
      viewport: {
        width: 1024,
        height: 768,
      },
      // Add context configuration if BROWSERBASE_CONTEXT_ID is set
      ...(process.env.BROWSERBASE_CONTEXT_ID && {
        context: {
          id: process.env.BROWSERBASE_CONTEXT_ID,
          persist: true, // Save changes back to the context
        },
      }),
    },
  },
  localBrowserLaunchOptions: {
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    userDataDir: userDataDir,
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1280,800',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
    devtools: false,
  } /* Configuration options for the local browser */,
};

export default StagehandConfig;
