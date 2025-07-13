import { MCPAgent } from "./mcp-agent.js";

async function demo() {
  console.log("🤖 Starting Agent Demo...\n");

  const agent = new MCPAgent();
  await agent.init();

  try {
    // Simple task: Search for something on Google
    const result = await agent.executeHighLevelTask(
      "Go to Google and search for 'Stagehand browser automation' and tell me what the first result is"
    );

    console.log("\n📊 Task Results:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await agent.close();
  }
}

demo().catch(console.error); 