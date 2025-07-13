import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig from "./stagehand.config";
import chalk from "chalk";

async function testLinkedInPersistence() {
  console.log(chalk.blue.bold("🔍 Testing LinkedIn Session Persistence\n"));

  const stagehand = new Stagehand(StagehandConfig);
  
  try {
    await stagehand.init();
    console.log(chalk.green("✅ Browser opened\n"));
    
    // Navigate to LinkedIn
    console.log(chalk.cyan("📍 Navigating to LinkedIn..."));
    await stagehand.page.goto("https://www.linkedin.com", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    
    // Wait a bit for page to fully load
    await stagehand.page.waitForTimeout(3000);
    
    // Check if we're logged in by looking for specific elements
    console.log(chalk.cyan("\n🔍 Checking login status..."));
    
    try {
      // Look for elements that indicate we're logged in
      const isLoggedIn = await stagehand.page.evaluate(() => {
        // Check for various logged-in indicators
        const feedExists = !!document.querySelector('[data-test-app-aware-link="/feed/"]');
        const profileExists = !!document.querySelector('[data-test-global-nav-link="profile"]');
        const homeNavExists = !!document.querySelector('a[href="/feed/"]');
        const signInButtonExists = !!document.querySelector('a[data-tracking-control-name="guest_homepage-basic_nav-header-signin"]');
        
        return {
          feedExists,
          profileExists,
          homeNavExists,
          signInButtonExists,
          url: window.location.href,
          title: document.title,
        };
      });
      
      console.log(chalk.yellow("\n📊 Page Status:"));
      console.log(chalk.white(`   URL: ${isLoggedIn.url}`));
      console.log(chalk.white(`   Title: ${isLoggedIn.title}`));
      console.log(chalk.white(`   Feed Link: ${isLoggedIn.feedExists ? '✅' : '❌'}`));
      console.log(chalk.white(`   Profile Link: ${isLoggedIn.profileExists ? '✅' : '❌'}`));
      console.log(chalk.white(`   Home Nav: ${isLoggedIn.homeNavExists ? '✅' : '❌'}`));
      console.log(chalk.white(`   Sign In Button: ${isLoggedIn.signInButtonExists ? '✅' : '❌'}`));
      
      if (isLoggedIn.feedExists || isLoggedIn.profileExists || isLoggedIn.homeNavExists) {
        console.log(chalk.green.bold("\n✅ You are logged in to LinkedIn!"));
        console.log(chalk.green("   Your session was preserved successfully! 🎉"));
      } else if (isLoggedIn.signInButtonExists) {
        console.log(chalk.red.bold("\n❌ You are NOT logged in to LinkedIn"));
        console.log(chalk.yellow("\n💡 To fix this:"));
        console.log(chalk.yellow("   1. Run: npx tsx manual-login.ts"));
        console.log(chalk.yellow("   2. Navigate to LinkedIn and sign in"));
        console.log(chalk.yellow("   3. Make sure to check 'Remember me' if available"));
        console.log(chalk.yellow("   4. Close the browser with Ctrl+C"));
        console.log(chalk.yellow("   5. Run this test again"));
      } else {
        console.log(chalk.yellow("\n⚠️  Unable to determine login status"));
        console.log(chalk.yellow("   The page might still be loading or LinkedIn might have changed their UI"));
      }
      
      // Take a screenshot for debugging
      await stagehand.page.screenshot({ 
        path: "linkedin-test-screenshot.png",
        fullPage: false 
      });
      console.log(chalk.cyan("\n📸 Screenshot saved: linkedin-test-screenshot.png"));
      
    } catch (error) {
      console.error(chalk.red("\n❌ Error checking login status:"), error);
    }
    
    // Keep browser open for a few seconds so you can see
    console.log(chalk.yellow("\n⏱️  Keeping browser open for 5 seconds..."));
    await stagehand.page.waitForTimeout(5000);
    
  } catch (error) {
    console.error(chalk.red("❌ Error:"), error);
  } finally {
    await stagehand.close();
    console.log(chalk.blue("\n👋 Test completed!"));
  }
}

testLinkedInPersistence().catch(console.error); 