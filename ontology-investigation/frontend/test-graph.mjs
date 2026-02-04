import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Capture console messages and errors
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', error => {
    consoleMessages.push({ type: 'pageerror', text: error.toString() });
  });

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Wait for the page to load
  await page.waitForTimeout(3000);

  // Click on Data Lineage tab
  console.log('Clicking Data Lineage tab...');
  await page.click('text=Data Lineage');

  // Wait for graph to render
  await page.waitForTimeout(2000);

  // Take screenshot
  console.log('Taking screenshot...');
  await page.screenshot({ path: 'graph-screenshot.png', fullPage: true });

  // Get the HTML of the graph container
  const graphHTML = await page.evaluate(() => {
    // Try multiple selectors
    let container = document.querySelector('[style*="height: 800px"]');
    if (!container) container = document.querySelector('[style*="height:800px"]');
    if (!container) container = document.querySelector('div[ref]');
    if (!container) {
      // Just get the whole page content
      const body = document.body.innerHTML;
      return {
        error: 'Graph container not found',
        bodyPreview: body.substring(0, 1000),
        hasCytoscape: body.includes('cytoscape'),
        hasReactFlow: body.includes('react-flow'),
        hasCanvas: !!document.querySelector('canvas'),
      };
    }

    // Check if it's Cytoscape or ReactFlow
    const hasCytoscape = !!container.querySelector('canvas');
    const hasReactFlow = !!container.querySelector('.react-flow');

    return {
      hasCytoscape,
      hasReactFlow,
      innerHTML: container.innerHTML.substring(0, 500),
      children: Array.from(container.children).map(c => c.tagName),
    };
  });

  console.log('\nGraph container analysis:');
  console.log(JSON.stringify(graphHTML, null, 2));

  console.log('\nConsole messages:');
  consoleMessages.forEach(msg => {
    console.log(`[${msg.type}] ${msg.text}`);
  });

  console.log('\nScreenshot saved to graph-screenshot.png');

  await browser.close();
})();
