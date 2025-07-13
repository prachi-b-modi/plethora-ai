import chalk from "chalk";
import path from "path";
import os from "os";
import fs from "fs";
import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);
const userDataDir = path.join(os.homedir(), ".stagehand-browser-data");

async function showInfo() {
  console.log(chalk.blue.bold("📁 Local Browser Data Info\n"));
  
  console.log(chalk.cyan("Location:"), userDataDir);
  
  if (fs.existsSync(userDataDir)) {
    const stats = fs.statSync(userDataDir);
    console.log(chalk.cyan("Created:"), stats.birthtime.toLocaleString());
    console.log(chalk.cyan("Modified:"), stats.mtime.toLocaleString());
    
    // Get directory size
    try {
      const { stdout } = await execAsync(`du -sh "${userDataDir}" | cut -f1`);
      console.log(chalk.cyan("Size:"), stdout.trim());
    } catch (error) {
      console.log(chalk.cyan("Size:"), "Unable to calculate");
    }
    
    // Check for key directories
    const keyDirs = ['Default', 'Default/Cookies', 'Default/Local Storage'];
    console.log(chalk.cyan("\nKey directories:"));
    keyDirs.forEach(dir => {
      const fullPath = path.join(userDataDir, dir);
      if (fs.existsSync(fullPath)) {
        console.log(chalk.green(`  ✓ ${dir}`));
      } else {
        console.log(chalk.gray(`  ✗ ${dir}`));
      }
    });
  } else {
    console.log(chalk.yellow("\n⚠️  Browser data directory doesn't exist yet"));
    console.log(chalk.yellow("   Run 'npx tsx manual-login.ts' to create it"));
  }
}

async function clearData() {
  console.log(chalk.red.bold("🗑️  Clearing Browser Data\n"));
  
  if (!fs.existsSync(userDataDir)) {
    console.log(chalk.yellow("No browser data to clear"));
    return;
  }
  
  console.log(chalk.yellow("⚠️  This will delete all saved logins, cookies, and sessions!"));
  console.log(chalk.yellow(`⚠️  Directory: ${userDataDir}`));
  console.log(chalk.red("\nAre you sure? Type 'yes' to confirm: "));
  
  // Read user input
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const answer = await new Promise<string>(resolve => {
    readline.question('', resolve);
  });
  readline.close();
  
  if (answer.toLowerCase() === 'yes') {
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
      console.log(chalk.green("\n✅ Browser data cleared successfully!"));
    } catch (error) {
      console.error(chalk.red("\n❌ Error clearing data:"), error);
    }
  } else {
    console.log(chalk.yellow("\n❌ Cancelled"));
  }
}

async function backup() {
  console.log(chalk.blue.bold("💾 Backing up Browser Data\n"));
  
  if (!fs.existsSync(userDataDir)) {
    console.log(chalk.yellow("No browser data to backup"));
    return;
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `stagehand-browser-backup-${timestamp}`;
  const backupPath = path.join(os.homedir(), backupName);
  
  try {
    // Create backup using tar
    await execAsync(`tar -czf "${backupPath}.tar.gz" -C "${os.homedir()}" ".stagehand-browser-data"`);
    console.log(chalk.green("✅ Backup created successfully!"));
    console.log(chalk.cyan("Location:"), `${backupPath}.tar.gz`);
    
    // Get backup size
    const { stdout } = await execAsync(`ls -lh "${backupPath}.tar.gz" | awk '{print $5}'`);
    console.log(chalk.cyan("Size:"), stdout.trim());
  } catch (error) {
    console.error(chalk.red("❌ Error creating backup:"), error);
  }
}

async function restore(backupFile: string) {
  console.log(chalk.blue.bold("📥 Restoring Browser Data\n"));
  
  if (!fs.existsSync(backupFile)) {
    console.log(chalk.red("❌ Backup file not found:"), backupFile);
    return;
  }
  
  if (fs.existsSync(userDataDir)) {
    console.log(chalk.yellow("⚠️  Existing browser data will be overwritten!"));
    console.log(chalk.red("Type 'yes' to confirm: "));
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise<string>(resolve => {
      readline.question('', resolve);
    });
    readline.close();
    
    if (answer.toLowerCase() !== 'yes') {
      console.log(chalk.yellow("\n❌ Cancelled"));
      return;
    }
    
    // Remove existing data
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
  
  try {
    // Extract backup
    await execAsync(`tar -xzf "${backupFile}" -C "${os.homedir()}"`);
    console.log(chalk.green("\n✅ Browser data restored successfully!"));
  } catch (error) {
    console.error(chalk.red("\n❌ Error restoring backup:"), error);
  }
}

// Main CLI
const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  switch (command) {
    case "info":
      await showInfo();
      break;
    case "clear":
      await clearData();
      break;
    case "backup":
      await backup();
      break;
    case "restore":
      if (!arg) {
        console.error(chalk.red("❌ Please provide a backup file path"));
        process.exit(1);
      }
      await restore(arg);
      break;
    default:
      console.log(chalk.yellow("🛠️  Local Browser Data Manager\n"));
      console.log(chalk.white("Usage:"));
      console.log(chalk.white("  npx tsx local-browser-manager.ts info           - Show browser data info"));
      console.log(chalk.white("  npx tsx local-browser-manager.ts clear          - Clear all browser data"));
      console.log(chalk.white("  npx tsx local-browser-manager.ts backup         - Backup browser data"));
      console.log(chalk.white("  npx tsx local-browser-manager.ts restore <file> - Restore from backup"));
  }
}

main().catch(console.error); 