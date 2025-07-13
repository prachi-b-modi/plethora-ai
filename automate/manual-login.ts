import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig from "./stagehand.config";
import chalk from "chalk";
import path from "path";
import os from "os";

async function openBrowserForLogin() {
  const userDataDir = path.join(os.homedir(), ".stagehand-browser-data");
  
  console.log(chalk.blue.bold("🌐 Opening browser for manual login...\n"));
  
  console.log(chalk.yellow("ℹ️  Browser data will be saved to:"));
  console.log(chalk.white(`   ${userDataDir}\n`));
  
  console.log(chalk.green("✅ Your logins, cookies, and sessions will persist across runs!\n"));

  const stagehand = new Stagehand(StagehandConfig);
  
  try {
    await stagehand.init();
    console.log(chalk.green("✅ Browser opened successfully!\n"));
    
    // Navigate to a default page
    await stagehand.page.goto("https://www.google.com");
    
    console.log(chalk.cyan("📌 You can now:"));
    console.log(chalk.cyan("   - Navigate to any website"));
    console.log(chalk.cyan("   - Login with your credentials"));
    console.log(chalk.cyan("   - Install browser extensions"));
    console.log(chalk.cyan("   - Your sessions will be saved automatically"));
    console.log(chalk.cyan("   - Press Ctrl+C to close the browser\n"));
    
    console.log(chalk.yellow("💡 Tips:"));
    console.log(chalk.yellow("   - Login to websites normally"));
    console.log(chalk.yellow("   - Check 'Remember me' or 'Stay signed in' options"));
    console.log(chalk.yellow("   - Your sessions will persist when running agents\n"));
    
    // Keep the browser open indefinitely
    await new Promise(() => {}); // This will run forever until Ctrl+C
    
  } catch (error) {
    console.error(chalk.red("❌ Error:"), error);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow("\n\n👋 Closing browser..."));
  console.log(chalk.green("✅ Your session data has been saved!"));
  process.exit(0);
});

openBrowserForLogin().catch(console.error); 