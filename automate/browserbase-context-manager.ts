import chalk from "chalk";
import dotenv from "dotenv";

dotenv.config();

const BROWSERBASE_API_KEY = process.env.BROWSERBASE_API_KEY;
const BROWSERBASE_PROJECT_ID = process.env.BROWSERBASE_PROJECT_ID;

if (!BROWSERBASE_API_KEY || !BROWSERBASE_PROJECT_ID) {
  console.error(chalk.red("❌ Missing BROWSERBASE_API_KEY or BROWSERBASE_PROJECT_ID in .env file"));
  process.exit(1);
}

async function createContext(name: string = "persistent-login-context") {
  console.log(chalk.blue.bold("🔧 Creating Browserbase Context...\n"));

  try {
    const response = await fetch("https://api.browserbase.com/v1/contexts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bb-api-key": BROWSERBASE_API_KEY,
      },
      body: JSON.stringify({
        projectId: BROWSERBASE_PROJECT_ID,
        name: name,
        browserSettings: {
          viewport: {
            width: 1024,
            height: 768,
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create context: ${error}`);
    }

    const data = await response.json();
    console.log(chalk.green("✅ Context created successfully!\n"));
    console.log(chalk.cyan("Context ID:"), data.id);
    console.log(chalk.cyan("Name:"), data.name);
    
    console.log(chalk.yellow("\n📝 Add this to your .env file:"));
    console.log(chalk.white(`BROWSERBASE_CONTEXT_ID=${data.id}`));
    
    return data.id;
  } catch (error) {
    console.error(chalk.red("❌ Error creating context:"), error);
    throw error;
  }
}

async function listContexts() {
  console.log(chalk.blue.bold("📋 Listing Browserbase Contexts...\n"));

  try {
    const response = await fetch(
      `https://api.browserbase.com/v1/contexts?projectId=${BROWSERBASE_PROJECT_ID}`,
      {
        headers: {
          "x-bb-api-key": BROWSERBASE_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to list contexts: ${error}`);
    }

    const data = await response.json();
    
    if (data.contexts && data.contexts.length > 0) {
      console.log(chalk.green(`Found ${data.contexts.length} context(s):\n`));
      
      data.contexts.forEach((ctx: any, index: number) => {
        console.log(chalk.cyan(`${index + 1}. ${ctx.name || "Unnamed Context"}`));
        console.log(chalk.white(`   ID: ${ctx.id}`));
        console.log(chalk.white(`   Created: ${new Date(ctx.createdAt).toLocaleString()}`));
        console.log(chalk.white(`   Updated: ${new Date(ctx.updatedAt).toLocaleString()}\n`));
      });
    } else {
      console.log(chalk.yellow("No contexts found. Create one with: npx tsx browserbase-context-manager.ts create"));
    }
  } catch (error) {
    console.error(chalk.red("❌ Error listing contexts:"), error);
    throw error;
  }
}

async function deleteContext(contextId: string) {
  console.log(chalk.blue.bold(`🗑️  Deleting Context ${contextId}...\n`));

  try {
    const response = await fetch(
      `https://api.browserbase.com/v1/contexts/${contextId}`,
      {
        method: "DELETE",
        headers: {
          "x-bb-api-key": BROWSERBASE_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete context: ${error}`);
    }

    console.log(chalk.green("✅ Context deleted successfully!"));
  } catch (error) {
    console.error(chalk.red("❌ Error deleting context:"), error);
    throw error;
  }
}

// Main CLI
const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  switch (command) {
    case "create":
      await createContext(arg);
      break;
    case "list":
      await listContexts();
      break;
    case "delete":
      if (!arg) {
        console.error(chalk.red("❌ Please provide a context ID to delete"));
        process.exit(1);
      }
      await deleteContext(arg);
      break;
    default:
      console.log(chalk.yellow("Usage:"));
      console.log(chalk.white("  npx tsx browserbase-context-manager.ts create [name]  - Create a new context"));
      console.log(chalk.white("  npx tsx browserbase-context-manager.ts list           - List all contexts"));
      console.log(chalk.white("  npx tsx browserbase-context-manager.ts delete <id>    - Delete a context"));
  }
}

main().catch(console.error); 