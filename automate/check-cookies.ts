import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig from "./stagehand.config";
import chalk from "chalk";

async function checkCookies() {
  console.log(chalk.blue.bold("🍪 Checking Browser Cookies\n"));

  const stagehand = new Stagehand(StagehandConfig);
  
  try {
    await stagehand.init();
    console.log(chalk.green("✅ Browser opened\n"));
    
    // Get all cookies
    const cookies = await stagehand.page.context().cookies();
    
    console.log(chalk.cyan(`📊 Total cookies: ${cookies.length}\n`));
    
    // Group cookies by domain
    const cookiesByDomain: { [key: string]: any[] } = {};
    cookies.forEach(cookie => {
      const domain = cookie.domain;
      if (!cookiesByDomain[domain]) {
        cookiesByDomain[domain] = [];
      }
      cookiesByDomain[domain].push(cookie);
    });
    
    // Show LinkedIn cookies specifically
    const linkedInDomains = ['.linkedin.com', 'linkedin.com', '.www.linkedin.com'];
    let hasLinkedInCookies = false;
    
    console.log(chalk.yellow("🔍 LinkedIn Cookies:"));
    linkedInDomains.forEach(domain => {
      if (cookiesByDomain[domain]) {
        hasLinkedInCookies = true;
        console.log(chalk.cyan(`\n  Domain: ${domain}`));
        cookiesByDomain[domain].forEach(cookie => {
          const sessionInfo = cookie.expires === -1 ? '(session)' : `(expires: ${new Date(cookie.expires * 1000).toLocaleString()})`;
          console.log(chalk.white(`    - ${cookie.name}: ${cookie.value.substring(0, 20)}... ${sessionInfo}`));
        });
      }
    });
    
    if (!hasLinkedInCookies) {
      console.log(chalk.red("  ❌ No LinkedIn cookies found\n"));
    }
    
    // Show other domains
    console.log(chalk.yellow("\n🌐 Other domains with cookies:"));
    Object.keys(cookiesByDomain).forEach(domain => {
      if (!linkedInDomains.includes(domain)) {
        console.log(chalk.white(`  - ${domain} (${cookiesByDomain[domain].length} cookies)`));
      }
    });
    
    // Navigate to LinkedIn to see what happens
    console.log(chalk.cyan("\n📍 Navigating to LinkedIn to check session..."));
    await stagehand.page.goto("https://www.linkedin.com", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    
    // Get cookies again after navigation
    const cookiesAfter = await stagehand.page.context().cookies();
    const linkedInCookiesAfter = cookiesAfter.filter(c => c.domain.includes('linkedin'));
    
    console.log(chalk.cyan(`\n📊 LinkedIn cookies after navigation: ${linkedInCookiesAfter.length}`));
    
    // Show important LinkedIn cookies
    const importantCookies = ['li_at', 'JSESSIONID', 'lidc', 'bcookie', 'bscookie'];
    console.log(chalk.yellow("\n🔑 Important LinkedIn cookies:"));
    importantCookies.forEach(name => {
      const cookie = linkedInCookiesAfter.find(c => c.name === name);
      if (cookie) {
        console.log(chalk.green(`  ✅ ${name}: Present`));
      } else {
        console.log(chalk.red(`  ❌ ${name}: Missing`));
      }
    });
    
    // Keep browser open for inspection
    console.log(chalk.yellow("\n⏱️  Keeping browser open for 10 seconds..."));
    console.log(chalk.yellow("   Check if you're logged in to LinkedIn"));
    await stagehand.page.waitForTimeout(10000);
    
  } catch (error) {
    console.error(chalk.red("❌ Error:"), error);
  } finally {
    await stagehand.close();
    console.log(chalk.blue("\n👋 Done!"));
  }
}

checkCookies().catch(console.error); 