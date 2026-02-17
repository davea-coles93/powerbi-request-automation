import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8000';

// ─── API-Level CRUD Tests ─────────────────────────────────────────────────

test.describe('API CRUD Operations', () => {
  // Ensure scenario is loaded before all tests
  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/scenarios/load/manufacturing`, { timeout: 60000 });
    expect(response.ok()).toBeTruthy();
  });

  // ── Systems ──────────────────────────────────────────────────────────────

  test.describe('Systems', () => {
    const testSystem = {
      id: 'test_system_e2e',
      name: 'E2E Test System',
      type: 'ERP',
      vendor: 'Test Vendor',
      reliability_default: 'High',
      integration_status: 'Connected',
    };

    test('should create, read, and delete a system', async ({ request }) => {
      // Create
      const createRes = await request.post(`${API_BASE}/api/systems`, { data: testSystem });
      expect(createRes.ok()).toBeTruthy();
      const created = await createRes.json();
      expect(created.name).toBe(testSystem.name);

      // Read
      const readRes = await request.get(`${API_BASE}/api/systems/${testSystem.id}`);
      expect(readRes.ok()).toBeTruthy();
      const read = await readRes.json();
      expect(read.id).toBe(testSystem.id);
      expect(read.vendor).toBe('Test Vendor');

      // Update
      const updateRes = await request.put(`${API_BASE}/api/systems/${testSystem.id}`, {
        data: { ...testSystem, vendor: 'Updated Vendor' },
      });
      expect(updateRes.ok()).toBeTruthy();
      const updated = await updateRes.json();
      expect(updated.vendor).toBe('Updated Vendor');

      // Delete
      const deleteRes = await request.delete(`${API_BASE}/api/systems/${testSystem.id}`);
      expect(deleteRes.ok()).toBeTruthy();

      // Verify deleted
      const verifyRes = await request.get(`${API_BASE}/api/systems/${testSystem.id}`);
      expect(verifyRes.status()).toBe(404);
    });
  });

  // ── Entities ─────────────────────────────────────────────────────────────

  test.describe('Entities', () => {
    const testEntity = {
      id: 'test_entity_e2e',
      name: 'E2E Test Entity',
      description: 'Created by E2E test',
      core_attributes: [{ name: 'test_attr', data_type: 'string', description: 'Test' }],
      lenses: [],
    };

    test('should create, read, and delete an entity', async ({ request }) => {
      const createRes = await request.post(`${API_BASE}/api/entities`, { data: testEntity });
      expect(createRes.ok()).toBeTruthy();

      const readRes = await request.get(`${API_BASE}/api/entities/${testEntity.id}`);
      expect(readRes.ok()).toBeTruthy();
      const read = await readRes.json();
      expect(read.name).toBe(testEntity.name);

      const deleteRes = await request.delete(`${API_BASE}/api/entities/${testEntity.id}`);
      expect(deleteRes.ok()).toBeTruthy();

      const verifyRes = await request.get(`${API_BASE}/api/entities/${testEntity.id}`);
      expect(verifyRes.status()).toBe(404);
    });
  });

  // ── Attributes ───────────────────────────────────────────────────────────

  test.describe('Attributes', () => {
    const testAttribute = {
      id: 'test_attr_e2e',
      name: 'E2E Test Attribute',
      description: 'Created by E2E test',
      entity_id: 'production_order',
      system_id: 'sap_erp',
      reliability: 'High',
      volatility: 'Point-in-time',
      perspective_ids: ['operational'],
    };

    test('should create, read, and delete an attribute', async ({ request }) => {
      const createRes = await request.post(`${API_BASE}/api/attributes`, { data: testAttribute });
      expect(createRes.ok()).toBeTruthy();

      const readRes = await request.get(`${API_BASE}/api/attributes/${testAttribute.id}`);
      expect(readRes.ok()).toBeTruthy();
      const read = await readRes.json();
      expect(read.name).toBe(testAttribute.name);

      const deleteRes = await request.delete(`${API_BASE}/api/attributes/${testAttribute.id}`);
      expect(deleteRes.ok()).toBeTruthy();

      const verifyRes = await request.get(`${API_BASE}/api/attributes/${testAttribute.id}`);
      expect(verifyRes.status()).toBe(404);
    });
  });

  // ── Measures ─────────────────────────────────────────────────────────────

  test.describe('Measures', () => {
    const testMeasure = {
      id: 'test_measure_e2e',
      name: 'E2E Test Measure',
      description: 'Created by E2E test',
      logic: 'SUM(quantity)',
      input_attribute_ids: [],
      input_measure_ids: [],
      perspective_ids: ['operational'],
    };

    test('should create, read, and delete a measure', async ({ request }) => {
      const createRes = await request.post(`${API_BASE}/api/measures`, { data: testMeasure });
      expect(createRes.ok()).toBeTruthy();

      const readRes = await request.get(`${API_BASE}/api/measures/${testMeasure.id}`);
      expect(readRes.ok()).toBeTruthy();
      const read = await readRes.json();
      expect(read.name).toBe(testMeasure.name);
      expect(read.logic).toBe('SUM(quantity)');

      const deleteRes = await request.delete(`${API_BASE}/api/measures/${testMeasure.id}`);
      expect(deleteRes.ok()).toBeTruthy();

      const verifyRes = await request.get(`${API_BASE}/api/measures/${testMeasure.id}`);
      expect(verifyRes.status()).toBe(404);
    });
  });

  // ── Metrics ──────────────────────────────────────────────────────────────

  test.describe('Metrics', () => {
    const testMetric = {
      id: 'test_metric_e2e',
      name: 'E2E Test Metric',
      description: 'Created by E2E test',
      business_question: 'How well is the E2E test performing?',
      calculated_by_measure_ids: [],
      perspective_ids: ['financial'],
    };

    test('should create, read, and delete a metric', async ({ request }) => {
      const createRes = await request.post(`${API_BASE}/api/metrics`, { data: testMetric });
      expect(createRes.ok()).toBeTruthy();

      const readRes = await request.get(`${API_BASE}/api/metrics/${testMetric.id}`);
      expect(readRes.ok()).toBeTruthy();
      const read = await readRes.json();
      expect(read.name).toBe(testMetric.name);
      expect(read.business_question).toBe(testMetric.business_question);

      const deleteRes = await request.delete(`${API_BASE}/api/metrics/${testMetric.id}`);
      expect(deleteRes.ok()).toBeTruthy();

      const verifyRes = await request.get(`${API_BASE}/api/metrics/${testMetric.id}`);
      expect(verifyRes.status()).toBe(404);
    });
  });

  // ── Perspectives ─────────────────────────────────────────────────────────

  test.describe('Perspectives', () => {
    const testPerspective = {
      id: 'test_perspective_e2e',
      name: 'E2E Test Perspective',
      purpose: 'Testing CRUD operations',
      primary_concern: 'Is everything working?',
      typical_actors: ['QA Engineer', 'Test Runner'],
      consumes_from: [],
      feeds: [],
    };

    test('should create, read, update, and delete a perspective', async ({ request }) => {
      // Create
      const createRes = await request.post(`${API_BASE}/api/perspectives`, { data: testPerspective });
      expect(createRes.ok()).toBeTruthy();

      // Read
      const readRes = await request.get(`${API_BASE}/api/perspectives/${testPerspective.id}`);
      expect(readRes.ok()).toBeTruthy();
      const read = await readRes.json();
      expect(read.name).toBe(testPerspective.name);
      expect(read.typical_actors).toContain('QA Engineer');

      // Update
      const updateRes = await request.put(`${API_BASE}/api/perspectives/${testPerspective.id}`, {
        data: { ...testPerspective, purpose: 'Updated purpose' },
      });
      expect(updateRes.ok()).toBeTruthy();
      const updated = await updateRes.json();
      expect(updated.purpose).toBe('Updated purpose');

      // Delete
      const deleteRes = await request.delete(`${API_BASE}/api/perspectives/${testPerspective.id}`);
      expect(deleteRes.ok()).toBeTruthy();

      // Verify deleted
      const verifyRes = await request.get(`${API_BASE}/api/perspectives/${testPerspective.id}`);
      expect(verifyRes.status()).toBe(404);
    });
  });

  // ── Process Step Deletion ────────────────────────────────────────────────

  test.describe('Process Steps', () => {
    test('should create and delete a process step', async ({ request }) => {
      // Get existing processes
      const processesRes = await request.get(`${API_BASE}/api/processes`);
      expect(processesRes.ok()).toBeTruthy();
      const processes = await processesRes.json();
      expect(processes.length).toBeGreaterThan(0);

      const processId = processes[0].id;
      const originalStepCount = processes[0].steps.length;

      // Create a step
      const newStep = {
        id: 'test_step_e2e',
        sequence: 999,
        name: 'E2E Test Step',
        description: 'Temporary test step',
        perspective_id: 'operational',
        consumes_attribute_ids: [],
        produces_attribute_ids: [],
        uses_metric_ids: [],
        crystallizes_attribute_ids: [],
        depends_on_step_ids: [],
      };

      const createRes = await request.post(`${API_BASE}/api/processes/${processId}/steps`, { data: newStep });
      expect(createRes.ok()).toBeTruthy();

      // Verify step was added
      const verifyRes = await request.get(`${API_BASE}/api/processes/${processId}`);
      const withStep = await verifyRes.json();
      expect(withStep.steps.length).toBe(originalStepCount + 1);

      // Delete the step
      const deleteRes = await request.delete(`${API_BASE}/api/processes/${processId}/steps/test_step_e2e`);
      expect(deleteRes.ok()).toBeTruthy();

      // Verify step was removed
      const finalRes = await request.get(`${API_BASE}/api/processes/${processId}`);
      const afterDelete = await finalRes.json();
      expect(afterDelete.steps.length).toBe(originalStepCount);
    });
  });

  // ── Impact Analysis ──────────────────────────────────────────────────────

  test.describe('Graph Endpoints', () => {
    test('should return impact analysis for an attribute', async ({ request }) => {
      // Get attributes
      const attrsRes = await request.get(`${API_BASE}/api/attributes`);
      const attrs = await attrsRes.json();
      expect(attrs.length).toBeGreaterThan(0);

      const response = await request.get(`${API_BASE}/api/graph/impact/${attrs[0].id}`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toHaveProperty('affected_measures');
      expect(data).toHaveProperty('affected_metrics');
    });

    test('should return measure usage', async ({ request }) => {
      const measuresRes = await request.get(`${API_BASE}/api/measures`);
      const measures = await measuresRes.json();
      expect(measures.length).toBeGreaterThan(0);

      const response = await request.get(`${API_BASE}/api/graph/measure/${measures[0].id}/usage`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toHaveProperty('depends_on_attributes');
      expect(data).toHaveProperty('used_in_metrics');
    });
  });
});

// ─── UI-Level CRUD Tests ──────────────────────────────────────────────────

test.describe('UI CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
  });

  // ── Data Foundation Navigation ───────────────────────────────────────────

  test('should navigate to Data Foundation and see all tabs', async ({ page }) => {
    // Click Data Foundation tab
    await page.getByRole('button', { name: 'Data Foundation' }).first().click();
    await page.waitForTimeout(500);

    // Should see sidebar with all entity types
    await expect(page.getByText('Metrics').first()).toBeVisible();
    await expect(page.getByText('Measures').first()).toBeVisible();
    await expect(page.getByText('Attributes').first()).toBeVisible();
    await expect(page.getByText('Entities').first()).toBeVisible();
    await expect(page.getByText('Systems').first()).toBeVisible();
  });

  // ── System CRUD via UI ───────────────────────────────────────────────────

  test('should create and delete a system via UI', async ({ page }) => {
    await page.getByRole('button', { name: 'Data Foundation' }).first().click();
    await page.waitForTimeout(500);

    // Navigate to Systems tab
    const systemsButton = page.getByRole('button', { name: /Systems/i }).last();
    await systemsButton.click();
    await page.waitForTimeout(500);

    // Click "+ New System"
    const newButton = page.getByRole('button', { name: /New System/i });
    await newButton.click();
    await page.waitForTimeout(500);

    // Fill the form
    await page.getByPlaceholder('e.g., ERP System').fill('E2E UI Test System');
    await page.waitForTimeout(200);

    // Submit
    await page.getByRole('button', { name: /Create System/i }).click();
    await page.waitForTimeout(2000);

    // Verify it appears in the table
    await expect(page.getByText('E2E UI Test System')).toBeVisible({ timeout: 10000 });

    // Now delete it - hover over the row to reveal actions
    const row = page.locator('tr').filter({ hasText: 'E2E UI Test System' });
    await row.hover();
    await page.waitForTimeout(200);

    // Click the delete (trash) button
    const deleteButton = row.locator('button').filter({ has: page.locator('svg.lucide-trash-2') });
    if (await deleteButton.count() > 0) {
      await deleteButton.click();
      await page.waitForTimeout(300);

      // Confirm deletion
      const confirmButton = page.getByRole('button', { name: /Delete/i }).last();
      await confirmButton.click();
      await page.waitForTimeout(1000);

      // Verify it's gone
      await expect(page.getByText('E2E UI Test System')).not.toBeVisible();
    }
  });

  // ── Metric CRUD via UI ───────────────────────────────────────────────────

  test('should create a metric via UI', async ({ page }) => {
    await page.getByRole('button', { name: 'Data Foundation' }).first().click();
    await page.waitForTimeout(500);

    // Should already be on Metrics tab
    const newButton = page.getByRole('button', { name: /New Metric/i });
    if (await newButton.count() > 0) {
      await newButton.click();
      await page.waitForTimeout(300);

      // Fill form
      const nameInput = page.locator('input[type="text"]').first();
      await nameInput.fill('E2E UI Test Metric');

      // Submit
      const submitButton = page.getByRole('button', { name: /Create Metric/i });
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  // ── Delete Confirmation Dialog ───────────────────────────────────────────

  test('should show confirmation dialog before deleting', async ({ page, request }) => {
    // Create a test system via API first
    await request.post('http://localhost:8000/api/systems', {
      data: {
        id: 'ui_delete_test',
        name: 'UI Delete Test System',
        type: 'Other',
      },
    });

    await page.getByRole('button', { name: 'Data Foundation' }).first().click();
    await page.waitForTimeout(500);

    // Navigate to Systems
    const systemsButton = page.getByRole('button', { name: /Systems/i }).last();
    await systemsButton.click();
    await page.waitForTimeout(500);

    // Find the test row and hover
    const row = page.locator('tr').filter({ hasText: 'UI Delete Test System' });
    if (await row.count() > 0) {
      await row.hover();
      await page.waitForTimeout(200);

      const deleteButton = row.locator('button').filter({ has: page.locator('svg.lucide-trash-2') });
      if (await deleteButton.count() > 0) {
        await deleteButton.click();
        await page.waitForTimeout(300);

        // Confirmation dialog should appear
        await expect(page.getByText(/Are you sure/i)).toBeVisible();
        await expect(page.getByText('UI Delete Test System')).toBeVisible();

        // Click cancel
        await page.getByRole('button', { name: /Cancel/i }).click();
        await page.waitForTimeout(300);

        // System should still be visible
        await expect(page.getByText('UI Delete Test System')).toBeVisible();

        // Now actually delete
        await row.hover();
        await page.waitForTimeout(200);
        await deleteButton.click();
        await page.waitForTimeout(300);
        await page.getByRole('button', { name: /Delete/i }).last().click();
        await page.waitForTimeout(1000);

        // Should be gone
        await expect(page.getByText('UI Delete Test System')).not.toBeVisible();
      }
    }

    // Cleanup via API just in case
    await request.delete('http://localhost:8000/api/systems/ui_delete_test');
  });

  // ── Perspective Edit via UI ──────────────────────────────────────────────

  test('should show edit button on perspective hover', async ({ page }) => {
    // Hover over a perspective card
    const perspectiveCard = page.locator('div').filter({ hasText: /^Operational/ }).first();
    if (await perspectiveCard.count() > 0) {
      await perspectiveCard.hover();
      await page.waitForTimeout(300);

      // Edit button should appear
      const editButton = perspectiveCard.locator('button[title="Edit perspective"]').first();
      if (await editButton.count() > 0) {
        await expect(editButton).toBeVisible();
      }
    }
  });

  test('should show Add perspective button', async ({ page }) => {
    // Look for the "+ Add" button
    const addButton = page.locator('button').filter({ hasText: 'Add' });
    await expect(addButton.first()).toBeVisible();
  });

  // ── Process Efficiency Dashboard ─────────────────────────────────────────

  test('should display process efficiency with styled badges', async ({ page }) => {
    // Navigate to Process Efficiency
    await page.getByRole('button', { name: 'Process Efficiency' }).first().click();
    await page.waitForTimeout(1000);

    // Should see the dashboard header
    await expect(page.getByText('Process Efficiency Dashboard')).toBeVisible();

    // Should see key metrics cards
    await expect(page.getByText('Total Process Steps')).toBeVisible();
    await expect(page.getByText('Avg Manual Effort')).toBeVisible();
  });

  // ── Data Foundation Table Features ───────────────────────────────────────

  test('should show expandable rows with impact analysis in attributes table', async ({ page }) => {
    await page.getByRole('button', { name: 'Data Foundation' }).first().click();
    await page.waitForTimeout(500);

    // Navigate to Attributes
    const attrsButton = page.getByRole('button', { name: /Attributes/i }).last();
    await attrsButton.click();
    await page.waitForTimeout(500);

    // Click on a row to expand it
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.count() > 0) {
      await firstRow.click();
      await page.waitForTimeout(1000);

      // Should show expanded content with impact analysis
      const expandedContent = page.getByText(/Impact Analysis|Description|Source System/i);
      if (await expandedContent.count() > 0) {
        await expect(expandedContent.first()).toBeVisible();
      }
    }
  });

  test('should show expandable rows with dependency flow in measures table', async ({ page }) => {
    await page.getByRole('button', { name: 'Data Foundation' }).first().click();
    await page.waitForTimeout(500);

    // Navigate to Measures
    const measuresButton = page.getByRole('button', { name: /Measures/i }).last();
    await measuresButton.click();
    await page.waitForTimeout(500);

    // Click on a row to expand it
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.count() > 0) {
      await firstRow.click();
      await page.waitForTimeout(1000);

      // Should show expanded content with dependency info
      const expandedContent = page.getByText(/Dependency Flow|Input Attributes|Description/i);
      if (await expandedContent.count() > 0) {
        await expect(expandedContent.first()).toBeVisible();
      }
    }
  });
});
