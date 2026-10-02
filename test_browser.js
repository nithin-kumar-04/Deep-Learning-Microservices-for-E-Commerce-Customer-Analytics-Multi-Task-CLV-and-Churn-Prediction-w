const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ 
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage();
  
  // Set viewport
  await page.setViewport({ width: 1280, height: 1024 });

  console.log("Navigating to URL...");
  // Avoid cache
  await page.setCacheEnabled(false);
  await page.goto('http://ecommerce-frontend-e82c3453.s3-website-us-east-1.amazonaws.com/?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));
  
  // 1. Initial Load & Quick Picks
  console.log("Taking screenshot 1: Initial Load");
  await page.screenshot({ path: 'screenshot_1_initial.png' });

  console.log("Selecting Quick Pick 13000...");
  await page.click('button[role="combobox"]');
  await new Promise(r => setTimeout(r, 500));
  
  // Find the option
  const options = await page.$$('[role="option"]');
  for (const opt of options) {
    const text = await page.evaluate(el => el.textContent, opt);
    if (text && text.includes('13000')) {
      await opt.click();
      break;
    }
  }
  
  // Wait for network request to finish (the prediction)
  await new Promise(r => setTimeout(r, 2000)); 
  console.log("Taking screenshot 2: Quick Pick filled");
  await page.screenshot({ path: 'screenshot_2_quickpick.png' });

  // 2. Missing ID Error
  console.log("Testing Missing ID Error...");
  // Clear input
  await page.click('input[id="customer-id"]', { clickCount: 3 });
  await page.type('input[id="customer-id"]', '99999');
  
  console.log("Clicking Generate AI Insights...");
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Generate AI Insights')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 2000));
  console.log("Taking screenshot 3: Missing ID");
  await page.screenshot({ path: 'screenshot_3_missing_id.png' });

  // 3. Batch Processing
  console.log("Switching to Batch Processing tab...");
  const tabs = await page.$$('button[role="tab"]');
  for (const tab of tabs) {
    const text = await page.evaluate(el => el.textContent, tab);
    if (text && text.includes('Batch Processing')) {
      await tab.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));
  console.log("Taking screenshot 4: Batch Processing");
  await page.screenshot({ path: 'screenshot_4_batch.png' });

  // 4. At-Risk Customers
  console.log("Switching to At-Risk Customers tab...");
  for (const tab of tabs) {
    const text = await page.evaluate(el => el.textContent, tab);
    if (text && text.includes('At-Risk Customers')) {
      await tab.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 2000));
  console.log("Taking screenshot 5: At-Risk Customers");
  await page.screenshot({ path: 'screenshot_5_at_risk.png' });

  await browser.close();
  console.log("Done.");
})();
