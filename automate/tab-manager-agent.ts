import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig from "./stagehand.config";

async function runTabManagementAgent() {
  console.log("🚀 Tab Management Agent Starting...\n");

  const stagehand = new Stagehand(StagehandConfig);
  
  try {
    await stagehand.init();
    console.log("✅ Browser initialized\n");

    // Define the task for the agent
    const task = `
      Please complete the following browser tab management tasks:
      1. Create 5 new tabs
      2. Navigate through each tab (from tab 1 to tab 5) 
      3. In each tab, navigate to a different website (you can choose any websites)
      4. Switch between the tabs in order (1, 2, 3, 4, 5)
      5. After visiting all tabs, close the browser
    `;

    console.log("📋 Task for agent:");
    console.log(task);
    console.log("\n🤖 Agent is planning and executing...\n");

    // Let the agent plan and execute the task autonomously
    await stagehand.act({ action: task });

    console.log("\n✅ Task completed successfully!");
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await stagehand.close();
    console.log("\n👋 Browser closed. Agent finished!");
  }
}

// Run the agent
runTabManagementAgent().catch(console.error); 