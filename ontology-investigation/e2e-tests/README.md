# End-to-End Tests

Playwright-based E2E tests for the Business Ontology Framework.

## Setup

1. Install dependencies:
```bash
npm install
npx playwright install
```

2. Ensure Docker containers are running:
```bash
cd ..
docker compose up -d
```

3. Verify services are accessible:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

## Running Tests

```bash
# Run all tests (headless)
npm test

# Run with browser visible
npm run test:headed

# Debug mode
npm run test:debug

# View test report
npm run test:report
```

## Test Suites

### 1. App Tests (`tests/app.spec.ts`)
Tests the frontend user interface:
- Application loads correctly
- Perspective navigation works
- Metric cards display
- Modal/detail views open
- Graph visualization renders
- Process flow displays

### 2. API Tests (`tests/api.spec.ts`)
Tests the backend API endpoints:
- Health check endpoint
- Perspectives endpoint
- Metrics endpoint
- Metric tracing endpoint
- Perspective view endpoint
- Process flow endpoint
- Error handling (404s)

### 3. Integration Tests (`tests/integration.spec.ts`)
Tests the full stack integration:
- Data flows from API to UI correctly
- Complete user journeys work
- State management across navigation
- Error handling doesn't crash app
- Data consistency between API and UI
- Process flow integration

## Test Coverage

- **UI Components:** Perspective navigation, metric cards, modals, graphs, process flows
- **API Endpoints:** All major CRUD and graph endpoints
- **Integration:** End-to-end user flows, error handling, data consistency

## Running in CI/CD

The tests are configured to work in CI environments:
- Uses retries for flaky tests
- Generates HTML reports
- Takes screenshots on failure
- Creates traces for debugging

Example CI command:
```bash
npm test -- --reporter=html
```

## Troubleshooting

**Tests can't connect to services:**
- Ensure `docker compose up -d` is running
- Check http://localhost:3000 and http://localhost:8000 are accessible
- Wait a few seconds for services to fully start

**Tests are flaky:**
- Increase wait times in tests (`page.waitForTimeout`)
- Check network conditions
- Verify Docker containers are healthy

**Specific test fails:**
- Check test report: `npm run test:report`
- View screenshot in `test-results/` directory
- Check trace file for detailed debugging
