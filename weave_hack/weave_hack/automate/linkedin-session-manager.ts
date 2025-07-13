import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig from "./stagehand.config";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import os from "os";

const STORAGE_STATE_PATH = path.join(os.homedir(), ".stagehand-browser-data", "linkedin-storage-state.json");
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

interface StorageState {
  cookies: any[];
  origins: any[];
  timestamp?: number;
}

class LinkedInSessionManager {
  private stagehand: Stagehand;

  constructor() {
    this.stagehand = new Stagehand(StagehandConfig);
  }

  async initialize() {
    await this.stagehand.init();
    console.log(chalk.green("✅ Browser initialized\n"));
  }

  async loadStoredSession(): Promise<boolean> {
    if (!fs.existsSync(STORAGE_STATE_PATH)) {
      console.log(chalk.yellow("⚠️  No stored session found"));
      return false;
    }

    try {
      const storedState: StorageState = JSON.parse(fs.readFileSync(STORAGE_STATE_PATH, 'utf-8'));
      
      // Check if session is still valid
      if (storedState.timestamp && Date.now() - storedState.timestamp > SESSION_DURATION) {
        console.log(chalk.yellow("⚠️  Stored session expired"));
        return false;
      }

      // Load cookies into the browser context
      if (storedState.cookies && storedState.cookies.length > 0) {
        await this.stagehand.context.addCookies(storedState.cookies);
        console.log(chalk.green(`✅ Loaded ${storedState.cookies.length} cookies from storage`));
        
        // Check for LinkedIn auth cookie
        const hasLinkedInAuth = storedState.cookies.some(cookie => 
          cookie.name === 'li_at' && cookie.domain.includes('linkedin')
        );
        
        if (hasLinkedInAuth) {
          console.log(chalk.green("✅ LinkedIn authentication cookie found"));
          return true;
        }
      }
    } catch (error) {
      console.error(chalk.red("❌ Error loading stored session:"), error);
    }

    return false;
  }

  async saveSession() {
    try {
      // Get current cookies
      const cookies = await this.stagehand.context.cookies();
      
      // Get local storage data
      const origins = await this.stagehand.page.evaluate(() => {
        const data = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            data.push({
              name: key,
              value: localStorage.getItem(key)
            });
          }
        }
        return [{
          origin: window.location.origin,
          localStorage: data
        }];
      });

      const storageState: StorageState = {
        cookies,
        origins,
        timestamp: Date.now()
      };

      // Ensure directory exists
      const dir = path.dirname(STORAGE_STATE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Save state
      fs.writeFileSync(STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2));
      console.log(chalk.green("✅ Session saved successfully"));
      
      // Log important cookies
      const liAtCookie = cookies.find(c => c.name === 'li_at' && c.domain.includes('linkedin'));
      if (liAtCookie) {
        console.log(chalk.green("✅ LinkedIn auth cookie saved"));
      }
      
    } catch (error) {
      console.error(chalk.red("❌ Error saving session:"), error);
    }
  }

  async checkLoginStatus(): Promise<boolean> {
    try {
      await this.stagehand.page.goto("https://www.linkedin.com/feed/", {
        waitUntil: "domcontentloaded",
        timeout: 30000
      });

      // Wait a bit for any redirects
      await this.stagehand.page.waitForTimeout(2000);

      const url = this.stagehand.page.url();
      const isLoggedIn = url.includes('/feed') || url.includes('/in/');
      
      if (isLoggedIn) {
        console.log(chalk.green("✅ You are logged in to LinkedIn!"));
        // Save the session after confirming login
        await this.saveSession();
      } else {
        console.log(chalk.red("❌ Not logged in to LinkedIn"));
      }

      return isLoggedIn;
    } catch (error) {
      console.error(chalk.red("❌ Error checking login status:"), error);
      return false;
    }
  }

  async performManualLogin() {
    console.log(chalk.blue.bold("\n🔐 Manual LinkedIn Login\n"));
    
    console.log(chalk.cyan("📋 Steps:"));
    console.log(chalk.white("   1. Navigate to LinkedIn login page"));
    console.log(chalk.white("   2. Enter your credentials"));
    console.log(chalk.white("   3. Complete any 2FA if required"));
    console.log(chalk.white("   4. Wait for the feed to load"));
    console.log(chalk.white("   5. The session will be saved automatically"));
    console.log(chalk.white("   6. Press Ctrl+C when done\n"));

    await this.stagehand.page.goto("https://www.linkedin.com/login");

    // Monitor for successful login
    let isLoggedIn = false;
    const checkInterval = setInterval(async () => {
      try {
        const url = this.stagehand.page.url();
        if ((url.includes('/feed') || url.includes('/in/')) && !isLoggedIn) {
          isLoggedIn = true;
          console.log(chalk.green.bold("\n✅ Login successful! Saving session..."));
          await this.saveSession();
          console.log(chalk.green("✅ Session saved! You can now close the browser."));
          clearInterval(checkInterval);
        }
      } catch (error) {
        // Ignore errors during checking
      }
    }, 2000);

    // Keep browser open
    await new Promise(() => {});
  }

  async close() {
    await this.stagehand.close();
  }
}

// Main execution
async function main() {
  const manager = new LinkedInSessionManager();
  
  try {
    await manager.initialize();
    
    // Try to load existing session
    const hasStoredSession = await manager.loadStoredSession();
    
    if (hasStoredSession) {
      console.log(chalk.cyan("\n🔍 Checking if stored session is still valid..."));
      const isLoggedIn = await manager.checkLoginStatus();
      
      if (isLoggedIn) {
        console.log(chalk.green.bold("\n✅ Successfully logged in with stored session!"));
        console.log(chalk.cyan("\n💡 You can now run your LinkedIn automation scripts."));
        
        // Keep browser open for 5 seconds to show success
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.log(chalk.yellow("\n⚠️  Stored session is invalid. Please login again."));
        await manager.performManualLogin();
      }
    } else {
      await manager.performManualLogin();
    }
    
  } catch (error) {
    console.error(chalk.red("❌ Error:"), error);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(chalk.yellow("\n\n👋 Closing browser..."));
  console.log(chalk.green("✅ Your session has been saved for future use!"));
  process.exit(0);
});

// Run the manager
main().catch(console.error); 