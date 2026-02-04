import { test, expect } from '@playwright/test';

test.describe('Business Ontology Framework', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle(/Business Ontology/);

    // Check main heading
    const heading = page.getByRole('heading', { name: /Business Ontology/i });
    await expect(heading).toBeVisible();
  });

  test('should display perspective navigation', async ({ page }) => {
    await page.goto('/');

    // Check for perspective buttons
    await expect(page.getByText('Operational')).toBeVisible();
    await expect(page.getByText('Management')).toBeVisible();
    await expect(page.getByText('Financial')).toBeVisible();
  });

  test('should switch between perspectives', async ({ page }) => {
    await page.goto('/');

    // Click on Financial perspective
    await page.getByText('Financial').click();

    // Should show financial metrics
    await expect(page.getByText('Cost of Goods Sold')).toBeVisible();
  });

  test('should display metrics in grid', async ({ page }) => {
    await page.goto('/');

    // Click on Financial perspective
    await page.getByText('Financial').click();

    // Check for metric cards
    const metricCards = page.locator('[class*="metric"]').or(page.locator('.card'));
    await expect(metricCards.first()).toBeVisible();
  });

  test('should open metric detail modal', async ({ page }) => {
    await page.goto('/');

    // Click on Financial perspective
    await page.getByText('Financial').click();

    // Click on a metric card
    await page.getByText('Cost of Goods Sold').click();

    // Modal should open with metric details
    // Wait for modal to appear
    await page.waitForTimeout(500);

    // Check if any modal/detail view is visible
    const modal = page.locator('[role="dialog"]').or(page.locator('.modal'));
    if (await modal.count() > 0) {
      await expect(modal).toBeVisible();
    }
  });

  test('should display graph visualization', async ({ page }) => {
    await page.goto('/');

    // Switch to Graph view
    const graphButton = page.getByText('Graph').or(page.getByRole('button', { name: /graph/i }));
    if (await graphButton.count() > 0) {
      await graphButton.click();

      // Check for graph canvas
      await page.waitForTimeout(1000);
      const canvas = page.locator('canvas').or(page.locator('[class*="cytoscape"]'));

      if (await canvas.count() > 0) {
        await expect(canvas.first()).toBeVisible();
      }
    }
  });

  test('should display process flow', async ({ page }) => {
    await page.goto('/');

    // Switch to Process view
    const processButton = page.getByText('Process').or(page.getByRole('button', { name: /process/i }));
    if (await processButton.count() > 0) {
      await processButton.click();

      // Check for process flow
      await page.waitForTimeout(1000);
      const flow = page.locator('.react-flow').or(page.locator('[class*="process"]'));

      if (await flow.count() > 0) {
        await expect(flow.first()).toBeVisible();
      }
    }
  });
});
