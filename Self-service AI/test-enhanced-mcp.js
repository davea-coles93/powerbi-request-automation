/**
 * Test Enhanced TMDL MCP Server
 * Tests all new tools: hierarchies, annotations, dependencies, complexity, quality
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

      // Try to parse complete JSON-RPC messages
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
            // Incomplete message, wait for more data
          }
        }
      }
      responseData = lines[lines.length - 1];
    };

    server.stdout.on('data', handleData);
    server.stdin.write(JSON.stringify(request) + '\n');

    // Timeout after 10 seconds
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
  console.log('Starting Enhanced TMDL MCP Server...');
  console.log('Model:', modelPath);

  server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, MODEL_PATH: modelPath },
  });

  server.stderr.on('data', (data) => {
    console.log('[Server]', data.toString().trim());
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n=== Testing Enhanced TMDL MCP Server ===\n');

  try {
    // 1. List tools
    console.log('1. Checking available tools...');
    const tools = await sendRequest('tools/list', {});
    console.log(`   Found ${tools.tools.length} tools`);
    const newTools = tools.tools.filter(t =>
      t.name.includes('hierarchy') ||
      t.name.includes('dependency') ||
      t.name.includes('complexity') ||
      t.name.includes('quality') ||
      t.name.includes('pattern') ||
      t.name.includes('naming') ||
      t.name.includes('circular')
    );
    console.log(`   New enhanced tools: ${newTools.map(t => t.name).join(', ')}\n`);

    // 2. Test hierarchies
    console.log('2. Testing hierarchy detection...');
    const allHierarchies = await callTool('list_hierarchies');
    console.log(`   Total hierarchies: ${allHierarchies.totalHierarchies}`);
    if (allHierarchies.tables.length > 0) {
      const firstTable = allHierarchies.tables[0];
      console.log(`   Example: ${firstTable.table} has ${firstTable.hierarchies.length} hierarchy(ies)`);
      if (firstTable.hierarchies.length > 0) {
        const hier = firstTable.hierarchies[0];
        console.log(`     - ${hier.name}: ${hier.levels.join(' → ')}`);
      }
    }
    console.log();

    // 3. Test column details
    console.log('3. Testing enhanced column metadata...');
    const dateColumns = await callTool('get_table_columns', { tableName: 'Date' });
    if (dateColumns.columns.length > 0) {
      const firstCol = dateColumns.columns[0];
      const details = await callTool('get_column_details', {
        tableName: 'Date',
        columnName: firstCol.name
      });
      console.log(`   Column: ${firstCol.name}`);
      console.log(`     Data type: ${details.dataType}`);
      if (details.dataCategory) console.log(`     Data category: ${details.dataCategory}`);
      if (details.sortByColumn) console.log(`     Sort by: ${details.sortByColumn}`);
      if (details.formatString) console.log(`     Format: ${details.formatString}`);
    }
    console.log();

    // 4. Test relationship details
    console.log('4. Testing enhanced relationship metadata...');
    const relDetails = await callTool('get_relationship_details');
    console.log(`   Total relationships: ${relDetails.count}`);
    if (relDetails.relationships.length > 0) {
      const rel = relDetails.relationships[0];
      console.log(`   Example: ${rel.from} → ${rel.to}`);
      if (rel.fromCardinality) console.log(`     Cardinality: ${rel.fromCardinality} to ${rel.toCardinality}`);
      if (rel.crossFilterDirection) console.log(`     Cross-filter: ${rel.crossFilterDirection}`);
      console.log(`     Active: ${rel.isActive}`);
    }
    console.log();

    // 5. Test measure dependencies
    console.log('5. Testing measure dependency analysis...');
    const measures = await callTool('search_measures', { pattern: '' });
    if (measures.count > 0) {
      const measure = measures.matches[0];
      console.log(`   Analyzing: ${measure.name}`);
      try {
        const deps = await callTool('get_measure_dependencies', { measureName: measure.name });
        console.log(`     References ${deps.dependencies.measures.length} measure(s)`);
        console.log(`     References ${deps.dependencies.columns.length} column(s)`);
        console.log(`     References ${deps.dependencies.tables.length} table(s)`);
        console.log(`     Referenced by ${deps.dependents.length} measure(s)`);
        console.log(`     Is leaf measure: ${deps.isLeaf}`);
      } catch (err) {
        console.log(`     (dependency analysis: ${err.message})`);
      }
    }
    console.log();

    // 6. Test unused measures
    console.log('6. Finding unused measures...');
    const unused = await callTool('find_unused_measures');
    console.log(`   Found ${unused.count} unused measure(s)`);
    if (unused.count > 0) {
      unused.unusedMeasures.slice(0, 3).forEach(m => {
        console.log(`     - ${m.table}[${m.measure}]`);
      });
    }
    console.log();

    // 7. Test complexity analysis
    console.log('7. Analyzing measure complexity...');
    if (measures.count > 0) {
      const measure = measures.matches[0];
      const complexity = await callTool('analyze_measure_complexity', { measureName: measure.name });
      console.log(`   Measure: ${complexity.measureName}`);
      console.log(`   Complexity score: ${complexity.score}/100`);
      console.log(`   Factors:`);
      console.log(`     - Nesting depth: ${complexity.factors.nestingDepth}`);
      console.log(`     - Function count: ${complexity.factors.functionCount}`);
      console.log(`     - Table references: ${complexity.factors.tableReferences}`);
      console.log(`     - Measure references: ${complexity.factors.measureReferences}`);
      console.log(`     - Has iterators: ${complexity.factors.hasIterators}`);
      console.log(`     - Has context transition: ${complexity.factors.hasContextTransition}`);
      console.log(`   Recommendation: ${complexity.recommendation}`);
    }
    console.log();

    // 8. Test pattern detection
    console.log('8. Detecting DAX patterns...');
    if (measures.count > 0) {
      const measure = measures.matches[0];
      const pattern = await callTool('detect_measure_pattern', { measureName: measure.name });
      console.log(`   Measure: ${pattern.measureName}`);
      console.log(`   Pattern: ${pattern.pattern.type}${pattern.pattern.subtype ? ' (' + pattern.pattern.subtype + ')' : ''}`);
      console.log(`   Confidence: ${(pattern.pattern.confidence * 100).toFixed(0)}%`);
      console.log(`   Description: ${pattern.pattern.description}`);
    }
    console.log();

    // 9. Test DAX quality check
    console.log('9. Checking DAX quality...');
    if (measures.count > 0) {
      const measure = measures.matches[0];
      const quality = await callTool('check_dax_quality', { measureName: measure.name });
      console.log(`   Measure: ${quality.measureName}`);
      console.log(`   Issues found: ${quality.issueCount}`);
      if (quality.issueCount > 0) {
        quality.issues.forEach(issue => {
          console.log(`     [${issue.severity.toUpperCase()}] ${issue.message}`);
          if (issue.suggestion) {
            console.log(`       Suggestion: ${issue.suggestion}`);
          }
        });
      } else {
        console.log(`   ✓ No issues found`);
      }
    }
    console.log();

    // 10. Test circular dependency detection
    console.log('10. Detecting circular dependencies...');
    const circular = await callTool('detect_circular_dependencies');
    console.log(`   Circular dependencies found: ${circular.count}`);
    if (circular.count > 0) {
      circular.circularDependencies.forEach(cycle => {
        console.log(`     ${cycle.description}`);
      });
    } else {
      console.log(`   ✓ No circular dependencies`);
    }
    console.log();

    // 11. Test model quality analysis
    console.log('11. Analyzing overall model quality...');
    const modelQuality = await callTool('analyze_model_quality');
    console.log(`   Overall score: ${modelQuality.overallScore}/100`);
    console.log(`   Metrics:`);
    console.log(`     - Measures without descriptions: ${modelQuality.metrics.measuresWithoutDescriptions}`);
    console.log(`     - Measures without display folders: ${modelQuality.metrics.measuresWithoutDisplayFolders}`);
    console.log(`     - Unused measures: ${modelQuality.metrics.unusedMeasures}`);
    console.log(`     - Naming consistency: ${modelQuality.metrics.namingConsistencyScore}/100`);
    console.log(`     - Relationship quality: ${modelQuality.metrics.relationshipQualityScore}/100`);
    console.log(`     - Hierarchies: ${modelQuality.metrics.hierarchyCount}`);
    console.log(`   Recommendations:`);
    modelQuality.recommendations.forEach(rec => {
      console.log(`     - ${rec}`);
    });
    console.log();

    // 12. Test naming convention check
    console.log('12. Checking naming conventions...');
    const naming = await callTool('check_naming_conventions');
    console.log(`   Naming issues found: ${naming.count}`);
    if (naming.count > 0) {
      naming.issues.slice(0, 5).forEach(issue => {
        console.log(`     [${issue.type}] ${issue.object}`);
        console.log(`       Issue: ${issue.issue}`);
        console.log(`       Suggestion: ${issue.suggestion}`);
      });
      if (naming.count > 5) {
        console.log(`     ... and ${naming.count - 5} more`);
      }
    } else {
      console.log(`   ✓ All names follow conventions`);
    }
    console.log();

    console.log('\n✓ All enhanced tests completed successfully!\n');
    console.log('Summary:');
    console.log(`  - Total tools: ${tools.tools.length}`);
    console.log(`  - New enhanced tools: ${newTools.length}`);
    console.log(`  - Model quality score: ${modelQuality.overallScore}/100`);
    console.log(`  - Hierarchies: ${allHierarchies.totalHierarchies}`);
    console.log(`  - Unused measures: ${unused.count}`);
    console.log(`  - Circular dependencies: ${circular.count}`);
    console.log(`  - Naming issues: ${naming.count}`);

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    server.kill();
    process.exit(0);
  }
}

runTests();
