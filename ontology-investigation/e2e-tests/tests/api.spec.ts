import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8000';

test.describe('API Endpoints', () => {
  test('should return healthy status', async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('should fetch perspectives', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/perspectives`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
    expect(data.length).toBeGreaterThan(0);

    // Check structure
    expect(data[0]).toHaveProperty('id');
    expect(data[0]).toHaveProperty('name');
    expect(data[0]).toHaveProperty('purpose');
  });

  test('should fetch metrics', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/metrics`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
    expect(data.length).toBeGreaterThan(0);

    // Check structure
    expect(data[0]).toHaveProperty('id');
    expect(data[0]).toHaveProperty('name');
    expect(data[0]).toHaveProperty('business_question');
  });

  test('should trace metric lineage', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/graph/trace-metric/cogs`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('metric');
    expect(data).toHaveProperty('measures');
    expect(data).toHaveProperty('observations');
    expect(data).toHaveProperty('systems');
    expect(data).toHaveProperty('entities');

    // Verify lineage structure
    expect(data.metric.id).toBe('cogs');
    expect(Array.isArray(data.measures)).toBeTruthy();
    expect(data.measures.length).toBeGreaterThan(0);
  });

  test('should get perspective view', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/graph/perspective/financial`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('perspective');
    expect(data).toHaveProperty('metrics');
    expect(data).toHaveProperty('measures');
    expect(data).toHaveProperty('observations');

    expect(data.perspective.id).toBe('financial');
  });

  test('should get process flow', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/graph/process/month_end_close/flow`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('process');
    expect(data).toHaveProperty('nodes');
    expect(data).toHaveProperty('edges');

    expect(data.process.id).toBe('month_end_close');
    expect(Array.isArray(data.nodes)).toBeTruthy();
    expect(data.nodes.length).toBeGreaterThan(0);
  });

  test('should return 404 for non-existent metric', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/graph/trace-metric/nonexistent`);
    expect(response.status()).toBe(404);
  });

  test('should return 404 for non-existent process', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/graph/process/nonexistent/flow`);
    expect(response.status()).toBe(404);
  });
});
