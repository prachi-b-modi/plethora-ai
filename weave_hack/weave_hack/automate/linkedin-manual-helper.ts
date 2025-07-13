import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig from "./stagehand.config";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import os from "os";

async function linkedInManualHelper() {
  console.log(chalk.blue.bold("🔐 LinkedIn Session Helper\n"));
  
  console.log(chalk.yellow("⚠️  IMPORTANT: LinkedIn has strong anti-automation measures."));
  console.log(chalk.yellow("   To ensure your session persists, follow these steps:\n"));
  
  console.log(chalk.cyan("📋 Steps to save LinkedIn session:"));
  console.log(chalk.white("   1. The browser will open"));
  console.log(chalk.white("   2. Navigate to LinkedIn manually"));
  console.log(chalk.white("   3. Sign in with your credentials"));
  console.log(chalk.white("   4. ✅ Check 'Remember me' if available"));
  console.log(chalk.white("   5. Complete any security checks (2FA, puzzles, etc.)"));
  console.log(chalk.white("   6. Wait for your feed to fully load"));
  console.log(chalk.white("   7. Browse around a bit (view profile, scroll feed)"));
  console.log(chalk.white("   8. Press Ctrl+C when done\n"));

  const stagehand = new Stagehand(StagehandConfig);
  
  try {
    await stagehand.init();
    console.log(chalk.green("✅ Browser opened\n"));
    
    // Navigate to LinkedIn
    await stagehand.page.goto("https://www.linkedin.com");
    
    console.log(chalk.yellow("👉 Now follow the steps above to login to LinkedIn\n"));
    
    // Monitor for successful login
    let isLoggedIn = false;
    const checkInterval = setInterval(async () => {
      try {
        const url = stagehand.page.url();
        const cookies = await stagehand.page.context().cookies();
        const liAtCookie = cookies.find(c => c.name === 'li_at' && c.domain.includes('linkedin'));
        
        if (liAtCookie && (url.includes('/feed') || url.includes('/in/'))) {
          if (!isLoggedIn) {
            isLoggedIn = true;
            console.log(chalk.green.bold("\n✅ Login detected! Session cookie found."));
            console.log(chalk.green("   Continue browsing to solidify the session..."));
            
            // Save cookies to a backup file
            const cookieBackup = path.join(os.homedir(), '.stagehand-linkedin-cookies.json');
            fs.writeFileSync(cookieBackup, JSON.stringify(cookies, null, 2));
            console.log(chalk.cyan(`\n💾 Cookies backed up to: ${cookieBackup}`));
          }
        }
      } catch (error) {
        // Ignore errors during checking
      }
    }, 2000);
    
    // Keep browser open until user closes
    await new Promise(() => {});
    
  } catch (error) {
    console.error(chalk.red("❌ Error:"), error);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(chalk.yellow("\n\n👋 Closing browser..."));
  
  // Final tips
  console.log(chalk.cyan("\n💡 Tips for persistent LinkedIn sessions:"));
  console.log(chalk.white("   - Use the same browser profile consistently"));
  console.log(chalk.white("   - Don't clear browser data between sessions"));
  console.log(chalk.white("   - If logged out, repeat this process"));
  console.log(chalk.white("   - Consider using LinkedIn less frequently to avoid detection"));
  
  console.log(chalk.green("\n✅ Session saved! Test with: npx tsx test-linkedin-persistence.ts"));
  process.exit(0);
});

linkedInManualHelper().catch(console.error); 