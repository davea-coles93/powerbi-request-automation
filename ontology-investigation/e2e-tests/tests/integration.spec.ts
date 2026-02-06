import { test, expect } from '@playwright/test';

test.describe('Full Integration Tests', () => {
  test('should load perspective data from API and display in UI', async ({ page }) => {
    await page.goto('/');

    // Wait for perspectives to load
    await page.waitForTimeout(1000);

    // Check that all three perspectives are available
    await expect(page.getByText('Operational')).toBeVisible();
    await expect(page.getByText('Management')).toBeVisible();
    await expect(page.getByText('Financial')).toBeVisible();

    // Click Financial
    await page.getByText('Financial').click();

    // Wait for metrics to load
    await page.waitForTimeout(1000);

    // Should show financial metrics from the API
    const pageContent = await page.content();
    expect(pageContent).toContain('Cost of Goods Sold');
  });

  test('should navigate through complete user flow', async ({ page }) => {
    // Start at home
    await page.goto('/');

    // 1. Select Financial perspective
    await page.getByText('Financial').click();
    await page.waitForTimeout(500);

    // 2. View metrics
    const cogsMetric = page.getByText('Cost of Goods Sold');
    await expect(cogsMetric).toBeVisible();

    // 3. Click on metric to see details
    await cogsMetric.click();
    await page.waitForTimeout(500);

    // 4. Switch to graph view (if available)
    const graphButton = page.getByText('Graph');
    if (await graphButton.count() > 0) {
      await graphButton.click();
      await page.waitForTimeout(1000);
    }

    // 5. Switch to process view (if available)
    const processButton = page.getByText('Process');
    if (await processButton.count() > 0) {
      await processButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should handle API errors gracefully', async ({ page, context }) => {
    // Intercept API calls and return errors
    await context.route('**/api/metrics', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await page.goto('/');
    await page.getByText('Financial').click();

    // App should not crash, might show error message
    await page.waitForTimeout(1000);

    // Page should still be functional
    await expect(page.getByText('Operational')).toBeVisible();
  });

  test('should maintain state when switching perspectives', async ({ page }) => {
    await page.goto('/');

    // Go to Financial
    await page.getByText('Financial').click();
    await page.waitForTimeout(500);

    // Switch to Management
    await page.getByText('Management').click();
    await page.waitForTimeout(500);

    // Switch back to Financial
    await page.getByText('Financial').click();
    await page.waitForTimeout(500);

    // Should still show financial metrics
    const pageContent = await page.content();
    expect(pageContent.toLowerCase()).toContain('financial');
  });

  test('should verify data consistency between API and UI', async ({ page, request }) => {
    // Fetch metrics from API
    const apiResponse = await request.get('http://localhost:8000/api/metrics');
    const apiMetrics = await apiResponse.json();

    // Navigate to UI
    await page.goto('/');
    await page.getByText('Financial').click();
    await page.waitForTimeout(1000);

    // Get page content
    const pageContent = await page.content();

    // Check that at least some metrics from API appear in UI
    const financialMetrics = apiMetrics.filter(m =>
      m.perspective_ids && m.perspective_ids.includes('financial')
    );

    expect(financialMetrics.length).toBeGreaterThan(0);

    // Check if first metric appears in UI
    if (financialMetrics.length > 0) {
      const firstMetric = financialMetrics[0];
      expect(pageContent).toContain(firstMetric.name);
    }
  });

  test('should load and display process flow correctly', async ({ page, request }) => {
    // Fetch process flow from API
    const apiResponse = await request.get('http://localhost:8000/api/graph/process/month_end_close/flow');
    const flowData = await apiResponse.json();

    expect(flowData.nodes.length).toBeGreaterThan(0);

    // Navigate to process view in UI
    await page.goto('/');

    const processButton = page.getByText('Process');
    if (await processButton.count() > 0) {
      await processButton.click();
      await page.waitForTimeout(1000);

      // Check if process name appears
      const pageContent = await page.content();
      expect(pageContent).toContain('Month');
    }
  });
});
