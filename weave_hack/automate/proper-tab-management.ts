import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig from "./stagehand.config";

async function properTabManagement() {
  console.log("🚀 Proper Tab Management Demo\n");

  const stagehand = new Stagehand(StagehandConfig);
  
  try {
    await stagehand.init();
    console.log("✅ Browser initialized\n");

    // The proper way to create new tabs in Playwright/Puppeteer
    const context = stagehand.context;
    const pages = [];
    
    // Tab 1 - Already exists (stagehand.page)
    pages.push(stagehand.page);
    console.log("📑 Tab 1: Using existing page");
    
    // Create 4 more tabs (pages)
    for (let i = 2; i <= 5; i++) {
      const newPage = await context.newPage();
      pages.push(newPage);
      console.log(`📑 Tab ${i}: Created new page`);
    }
    
    console.log(`\n✅ Created ${pages.length} tabs total\n`);
    
    // Navigate each tab to a different website
    const websites = [
      "https://www.google.com",
      "https://www.github.com", 
      "https://www.stackoverflow.com",
      "https://www.wikipedia.org",
      "https://www.reddit.com"
    ];
    
    console.log("🌐 Navigating to websites...\n");
    
    for (let i = 0; i < pages.length; i++) {
      await pages[i].goto(websites[i]);
      console.log(`Tab ${i + 1}: Navigated to ${websites[i]}`);
    }
    
    // Switch between tabs (bring to front)
    console.log("\n🔄 Switching between tabs...\n");
    
    for (let i = 0; i < pages.length; i++) {
      await pages[i].bringToFront();
      console.log(`Switched to Tab ${i + 1}: ${await pages[i].title()}`);
      
      // Take a screenshot to prove we're on this tab
      await pages[i].screenshot({ 
        path: `tab-${i + 1}-screenshot.png` 
      });
      
      // Wait a bit so you can see the tab switch
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log("\n📸 Screenshots saved for each tab");
    
    // Close individual tabs (except the first one)
    console.log("\n🚫 Closing tabs 2-5...\n");
    
    for (let i = pages.length - 1; i > 0; i--) {
      await pages[i].close();
      console.log(`Closed Tab ${i + 1}`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log("\n✅ Demo completed! Only Tab 1 remains open.");
    
    // Keep the last tab open for a few seconds
    await new Promise(resolve => setTimeout(resolve, 3000));
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await stagehand.close();
    console.log("\n👋 Browser closed!");
  }
}

// Run the demo
properTabManagement().catch(console.error); 