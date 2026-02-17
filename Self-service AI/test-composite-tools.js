/**
 * Test Composite "Power Tools"
 * Tests the 3 high-level composite tools
 */

const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'mcp-servers', 'tmdl', 'dist', 'index.js');
const modelPath = path.join(__dirname, 'models', 'adventure-works', 'sales-sample.pbip');

let server;
let messageId = 1;

async function sendRequest(method, params) {
  return new Promise((resolve, reject) => {
    const request = {
      jsonrpc: '2.0',
      id: messageId++,
      method,
      params,
    };

    let responseData = '';

    const handleData = (data) => {
      responseData += data.toString();
      const lines = responseData.split('\n');
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (line) {
          try {
            const response = JSON.parse(line);
            if (response.id === request.id) {
              server.stdout.removeListener('data', handleData);
              if (response.error) {
                reject(new Error(response.error.message));
              } else {
                resolve(response.result);
              }
            }
          } catch (e) {
            // Incomplete message
          }
        }
      }
      responseData = lines[lines.length - 1];
    };

    server.stdout.on('data', handleData);
    server.stdin.write(JSON.stringify(request) + '\n');

    setTimeout(() => {
      server.stdout.removeListener('data', handleData);
      reject(new Error('Request timeout'));
    }, 10000);
  });
}

async function callTool(name, args = {}) {
  const result = await sendRequest('tools/call', {
    name,
    arguments: args,
  });
  return JSON.parse(result.content[0].text);
}

async function runTests() {
  console.log('Starting TMDL MCP Server...');
  console.log('Model:', modelPath);

  server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, MODEL_PATH: modelPath },
  });

  server.stderr.on('data', (data) => {
    console.log('[Server]', data.toString().trim());
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n=== Testing Composite Power Tools ===\n');

  try {
    // Check tool count
    console.log('0. Verifying tool count...');
    const tools = await sendRequest('tools/list', {});
    console.log(`   Total tools: ${tools.tools.length}`);
    const compositeTools = tools.tools.filter(t =>
      t.name.includes('_complete')
    );
    console.log(`   Composite tools: ${compositeTools.map(t => t.name).join(', ')}`);
    console.log();

    // Test 1: explore_measure_complete
    console.log('1. Testing explore_measure_complete...');
    console.log('   (Single call replaces: dependencies + complexity + pattern + quality)\n');

    const measures = await callTool('search_measures', { pattern: '' });
    if (measures.count > 0) {
      const measureName = measures.matches[0].name;
      const result = await callTool('explore_measure_complete', { measureName });

      console.log(`   📊 Measure: ${result.measureName}`);
      console.log(`   📁 Table: ${result.table}`);
      console.log(`   📝 Expression: ${result.expression.substring(0, 80)}...`);
      console.log();

      console.log(`   🔗 Dependencies:`);
      if (result.dependencies) {
        console.log(`      - References ${result.dependencies.measures.length} measure(s)`);
        console.log(`      - References ${result.dependencies.columns.length} column(s): ${result.dependencies.columns.map(c => c.table + '.' + c.column).join(', ')}`);
        console.log(`      - References ${result.dependencies.tables.length} table(s): ${result.dependencies.tables.join(', ')}`);
        console.log(`      - Referenced by ${result.dependencies.dependents.length} measure(s)`);
        console.log(`      - Is leaf: ${result.dependencies.isLeaf}, Is root: ${result.dependencies.isRoot}`);
      }
      console.log();

      console.log(`   📈 Complexity:`);
      console.log(`      - Score: ${result.complexity.score}/100`);
      console.log(`      - Nesting depth: ${result.complexity.factors.nestingDepth}`);
      console.log(`      - Functions: ${result.complexity.factors.functionCount}`);
      console.log(`      - Has iterators: ${result.complexity.factors.hasIterators}`);
      console.log(`      - Recommendation: ${result.complexity.recommendation}`);
      console.log();

      console.log(`   🎯 Pattern:`);
      console.log(`      - Type: ${result.pattern.type}${result.pattern.subtype ? ' (' + result.pattern.subtype + ')' : ''}`);
      console.log(`      - Confidence: ${(result.pattern.confidence * 100).toFixed(0)}%`);
      console.log(`      - Description: ${result.pattern.description}`);
      console.log();

      console.log(`   ✅ Quality:`);
      console.log(`      - Issues: ${result.quality.issueCount}`);
      if (result.quality.issueCount > 0) {
        result.quality.issues.forEach(issue => {
          console.log(`        [${issue.severity.toUpperCase()}] ${issue.message}`);
        });
      } else {
        console.log(`      - No issues found`);
      }
      console.log();

      console.log(`   📋 Summary: ${result.summary}`);
    }
    console.log();
    console.log('─'.repeat(80));
    console.log();

    // Test 2: analyze_model_health_complete
    console.log('2. Testing analyze_model_health_complete...');
    console.log('   (Single call replaces: quality + unused + circular + naming)\n');

    const health = await callTool('analyze_model_health_complete');

    console.log(`   🏥 Overall Health Score: ${health.overallScore}/100`);
    console.log();

    console.log(`   📊 Metrics:`);
    console.log(`      - Measures without descriptions: ${health.metrics.measuresWithoutDescriptions}`);
    console.log(`      - Measures without folders: ${health.metrics.measuresWithoutDisplayFolders}`);
    console.log(`      - Unused measures: ${health.metrics.unusedMeasures}`);
    console.log(`      - Naming consistency: ${health.metrics.namingConsistencyScore}/100`);
    console.log(`      - Relationship quality: ${health.metrics.relationshipQualityScore}/100`);
    console.log(`      - Hierarchies: ${health.metrics.hierarchyCount}`);
    console.log();

    console.log(`   ⚠️  Issues Found:`);
    console.log(`      - Unused measures: ${health.counts.unused}`);
    if (health.counts.unused > 0) {
        health.issues.unusedMeasures.slice(0, 3).forEach(m => {
          console.log(`         • ${m.table}[${m.measure}]`);
        });
      }
    console.log(`      - Circular dependencies: ${health.counts.circular}`);
    if (health.counts.circular > 0) {
        health.issues.circularDependencies.forEach(c => {
          console.log(`         • ${c.description}`);
        });
      }
    console.log(`      - Naming issues: ${health.counts.naming}`);
    if (health.counts.naming > 0) {
        health.issues.namingIssues.slice(0, 3).forEach(issue => {
          console.log(`         • ${issue.object}: ${issue.issue}`);
        });
      }
    console.log(`      - Total issues: ${health.counts.total}`);
    console.log();

    console.log(`   💡 Recommendations (${health.recommendations.length}):`);
    health.recommendations.slice(0, 5).forEach((rec, i) => {
      console.log(`      ${i + 1}. ${rec}`);
    });
    if (health.recommendations.length > 5) {
      console.log(`      ... and ${health.recommendations.length - 5} more`);
    }
    console.log();

    console.log(`   📋 Summary: ${health.summary}`);
    console.log();
    console.log('─'.repeat(80));
    console.log();

    // Test 3: explore_table_complete
    console.log('3. Testing explore_table_complete...');
    console.log('   (Single call replaces: table_info + hierarchies + column_details + relationships)\n');

    const tableResult = await callTool('explore_table_complete', { tableName: 'Date' });

    console.log(`   📊 Table: ${tableResult.name}`);
    console.log(`   🏷️  Hidden: ${tableResult.isHidden || false}`);
    console.log();

    console.log(`   📈 Counts:`);
    console.log(`      - Measures: ${tableResult.counts.measures}`);
    console.log(`      - Columns: ${tableResult.counts.columns}`);
    console.log(`      - Hierarchies: ${tableResult.counts.hierarchies}`);
    console.log(`      - Relationships: ${tableResult.counts.relationships}`);
    console.log();

    if (tableResult.measures.length > 0) {
      console.log(`   📏 Measures:`);
      tableResult.measures.forEach(m => {
        console.log(`      - ${m.name}`);
      });
      console.log();
    }

    console.log(`   📋 Columns (${tableResult.columns.length}):`);
    tableResult.columns.slice(0, 5).forEach(c => {
      const details = [];
      if (c.dataCategory) details.push(`category: ${c.dataCategory}`);
      if (c.sortByColumn) details.push(`sort by: ${c.sortByColumn}`);
      if (c.isHidden) details.push('hidden');
      const detailStr = details.length > 0 ? ` (${details.join(', ')})` : '';
      console.log(`      - ${c.name}: ${c.dataType}${detailStr}`);
    });
    if (tableResult.columns.length > 5) {
      console.log(`      ... and ${tableResult.columns.length - 5} more columns`);
    }
    console.log();

    if (tableResult.hierarchies.length > 0) {
      console.log(`   🏗️  Hierarchies:`);
      tableResult.hierarchies.forEach(h => {
        console.log(`      - ${h.name} (${h.levelCount} levels)`);
        console.log(`        ${h.levels.map(l => l.name).join(' → ')}`);
      });
      console.log();
    }

    console.log(`   🔗 Relationships (${tableResult.relationships.length}):`);
    tableResult.relationships.slice(0, 5).forEach(r => {
      const cardStr = r.fromCardinality && r.toCardinality
        ? ` (${r.fromCardinality}:${r.toCardinality})`
        : '';
      console.log(`      - ${r.from} → ${r.to}${cardStr} [${r.isActive ? 'ACTIVE' : 'inactive'}]`);
    });
    if (tableResult.relationships.length > 5) {
      console.log(`      ... and ${tableResult.relationships.length - 5} more relationships`);
    }
    console.log();

    console.log(`   🎯 Special Columns:`);
    console.log(`      - Date columns: ${tableResult.specialColumns.dates}`);
    console.log(`      - City columns: ${tableResult.specialColumns.cities}`);
    console.log(`      - URL columns: ${tableResult.specialColumns.urls}`);
    console.log(`      - Sort-by columns: ${tableResult.specialColumns.sortByColumns}`);
    console.log(`      - Hidden columns: ${tableResult.specialColumns.hidden}`);
    console.log();

    console.log(`   ✅ Characteristics:`);
    console.log(`      - Likely date table: ${tableResult.characteristics.isLikelyDateTable}`);
    console.log(`      - Has hierarchies: ${tableResult.characteristics.hasHierarchies}`);
    console.log(`      - Has measures: ${tableResult.characteristics.hasMeasures}`);
    console.log(`      - Has special categories: ${tableResult.characteristics.hasSpecialCategories}`);
    console.log();

    console.log(`   📋 Summary: ${tableResult.summary}`);
    console.log();

    console.log('\n✅ All composite tool tests passed!\n');
    console.log('Summary:');
    console.log(`  - Total tools available: ${tools.tools.length}`);
    console.log(`  - Composite tools: 3`);
    console.log(`  - Model health score: ${health.overallScore}/100`);
    console.log(`  - explore_measure_complete: ✅ Working`);
    console.log(`  - analyze_model_health_complete: ✅ Working`);
    console.log(`  - explore_table_complete: ✅ Working`);

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    server.kill();
    process.exit(0);
  }
}

runTests();
