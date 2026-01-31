#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Parse TMDL files and extract model structure
 * Creates a schema-only deployment (tables/columns without data)
 * for DAX validation purposes
 */

// Parse a single table TMDL file
function parseTableTmdl(content, tableName) {
  const lines = content.split('\n');
  const table = {
    name: tableName,
    columns: [],
    measures: [],
    hierarchies: []
  };

  let currentColumn = null;
  let currentMeasure = null;
  let currentHierarchy = null;
  let inDaxBlock = false;
  let daxLines = [];
  let indentLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect indentation level
    const currentIndent = line.search(/\S/);

    // Column definition
    if (trimmed.startsWith('column ')) {
      const colName = trimmed.substring(7).trim();
      currentColumn = { name: colName, dataType: 'string', sourceColumn: colName };
      table.columns.push(currentColumn);
      indentLevel = currentIndent;
      continue;
    }

    // Data type for current column
    if (currentColumn && trimmed.startsWith('dataType:')) {
      currentColumn.dataType = trimmed.substring(9).trim();
      continue;
    }

    // Source column
    if (currentColumn && trimmed.startsWith('sourceColumn:')) {
      currentColumn.sourceColumn = trimmed.substring(13).trim();
      continue;
    }

    // Measure definition
    const measureMatch = trimmed.match(/^measure\s+(?:'([^']+)'|(\S+))\s*=\s*```/);
    if (measureMatch) {
      const measureName = measureMatch[1] || measureMatch[2];
      currentMeasure = { name: measureName, expression: '' };
      inDaxBlock = true;
      daxLines = [];
      continue;
    }

    // End of DAX block
    if (inDaxBlock && trimmed === '```') {
      currentMeasure.expression = daxLines.join('\n').trim();
      table.measures.push(currentMeasure);
      currentMeasure = null;
      inDaxBlock = false;
      daxLines = [];
      continue;
    }

    // Collect DAX lines
    if (inDaxBlock) {
      daxLines.push(line);
      continue;
    }

    // Reset current objects when we're back at same/lower indent
    if (currentIndent <= indentLevel && trimmed && !trimmed.startsWith('annotation')) {
      if (!trimmed.startsWith('column') && !trimmed.startsWith('measure') &&
          !trimmed.startsWith('hierarchy') && !trimmed.startsWith('partition')) {
        currentColumn = null;
      }
    }
  }

  return table;
}

// Map TMDL data types to TMSL data types
function mapDataType(tmdlType) {
  const typeMap = {
    'int64': 'int64',
    'string': 'string',
    'double': 'double',
    'decimal': 'decimal',
    'boolean': 'boolean',
    'datetime': 'dateTime',
    'date': 'dateTime'
  };
  return typeMap[tmdlType] || 'string';
}

// Read all table TMDL files and build model structure
function buildModelFromTmdl(modelPath) {
  const defPath = path.join(modelPath, 'definition');
  const tablesPath = path.join(defPath, 'tables');

  if (!fs.existsSync(tablesPath)) {
    throw new Error(`Tables directory not found: ${tablesPath}`);
  }

  const tables = [];
  const tableFiles = fs.readdirSync(tablesPath).filter(f => f.endsWith('.tmdl'));

  for (const file of tableFiles) {
    const tableName = file.replace('.tmdl', '');
    const content = fs.readFileSync(path.join(tablesPath, file), 'utf8');
    const table = parseTableTmdl(content, tableName);

    // Only include tables with columns
    if (table.columns.length > 0) {
      tables.push(table);
    }
  }

  // Read database metadata
  const dbTmdl = fs.readFileSync(path.join(defPath, 'database.tmdl'), 'utf8');
  const compatMatch = dbTmdl.match(/compatibilityLevel:\s*(\d+)/);
  const compatibilityLevel = compatMatch ? parseInt(compatMatch[1]) : 1600;

  return { tables, compatibilityLevel };
}

// Convert to TMSL JSON format
function buildTmslDatabase(model, databaseName) {
  const tmslTables = model.tables.map(table => {
    const tmslTable = {
      name: table.name,
      columns: table.columns.map(col => ({
        name: col.name,
        dataType: mapDataType(col.dataType),
        sourceColumn: col.sourceColumn
      })),
      partitions: [{
        name: 'Partition',
        mode: 'import',
        source: {
          type: 'm',
          // Create empty table with column structure
          expression: `let\n    Source = #table(${JSON.stringify(table.columns.map(c => c.name))}, {})\nin\n    Source`
        }
      }]
    };

    // Add measures if any
    if (table.measures.length > 0) {
      tmslTable.measures = table.measures.map(m => ({
        name: m.name,
        expression: m.expression
      }));
    }

    return tmslTable;
  });

  return {
    name: databaseName,
    compatibilityLevel: model.compatibilityLevel,
    model: {
      culture: 'en-US',
      tables: tmslTables
    }
  };
}

// Deploy database to AAS using .NET validator
function deployToAas(tmslDatabase, server, token) {
  const tmslCommand = {
    createOrReplace: {
      object: { database: tmslDatabase.name },
      database: tmslDatabase
    }
  };

  const tmslJson = JSON.stringify(tmslCommand);

  // Write to temp file to avoid command line length issues
  const tempFile = path.join(__dirname, '.tmsl-temp.json');
  fs.writeFileSync(tempFile, tmslJson, 'utf8');

  try {
    // Deploy using TMSL command via .NET validator
    const validatorPath = path.join(__dirname, '..', 'aas-validator', 'AasValidator');

    const result = execSync(
      `dotnet run --project "${validatorPath}" -- --server "${server}" --token "${token}" --command executetmsl --file "${tempFile}"`,
      { encoding: 'utf8', stdio: 'pipe' }
    );

    const response = JSON.parse(result.trim());

    // Cleanup temp file
    fs.unlinkSync(tempFile);

    return response;

  } catch (error) {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    throw error;
  }
}

// Delete database from AAS
function deleteDatabase(databaseName, server, token) {
  const validatorPath = path.join(__dirname, '..', 'aas-validator', 'AasValidator');

  try {
    execSync(
      `dotnet run --project "${validatorPath}" -- --server "${server}" --database "${databaseName}" --token "${token}" --command deletedb`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
  } catch (error) {
    // Ignore errors - database may not exist
  }
}

// Validate all measures in deployed model
function validateMeasures(tables, databaseName, server, token) {
  console.log('\n📊 Validating DAX measures...\n');

  const validatorPath = path.join(__dirname, '..', 'aas-validator', 'AasValidator');
  let validCount = 0;
  let errorCount = 0;

  for (const table of tables) {
    for (const measure of table.measures) {
      try {
        const result = execSync(
          `dotnet run --project "${validatorPath}" -- --server "${server}" --database "${databaseName}" --token "${token}" --command validate --query "${measure.expression.replace(/"/g, '\\"')}"`,
          { encoding: 'utf8', stdio: 'pipe' }
        );

        const response = JSON.parse(result.trim());
        if (response.valid) {
          console.log(`  ✅ ${table.name}[${measure.name}]`);
          validCount++;
        } else {
          console.log(`  ❌ ${table.name}[${measure.name}]`);
          console.log(`     Error: ${response.error}`);
          errorCount++;
        }
      } catch (error) {
        console.log(`  ❌ ${table.name}[${measure.name}]`);
        console.log(`     Error: ${error.message}`);
        errorCount++;
      }
    }
  }

  return { validCount, errorCount };
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const modelPath = args[0] || 'models/adventure-works/sales-sample.SemanticModel';

  console.log(`\n🚀 Deploying TMDL model for validation: ${modelPath}\n`);

  // Get AAS credentials
  const server = process.env.AZURE_AAS_SERVER;
  const token = process.env.AAS_ACCESS_TOKEN;

  if (!server || !token) {
    console.error('❌ Missing required environment variables:');
    console.error('   AZURE_AAS_SERVER - AAS server URL');
    console.error('   AAS_ACCESS_TOKEN - Access token for authentication');
    process.exit(1);
  }

  // Step 1: Parse TMDL model
  console.log('📖 Parsing TMDL model...');
  const model = buildModelFromTmdl(modelPath);
  console.log(`   Found ${model.tables.length} tables`);

  const totalMeasures = model.tables.reduce((sum, t) => sum + t.measures.length, 0);
  console.log(`   Found ${totalMeasures} measures`);

  if (totalMeasures === 0) {
    console.log('\n⚠️  No measures found in model');
    process.exit(0);
  }

  // Step 2: Build TMSL database
  console.log('\n🔨 Building TMSL deployment...');
  const databaseName = `tmdl-test-${Date.now()}`;
  const tmslDatabase = buildTmslDatabase(model, databaseName);
  console.log(`   Database: ${databaseName}`);
  console.log(`   Compatibility: ${tmslDatabase.compatibilityLevel}`);

  try {
    // Step 3: Deploy to AAS
    console.log('\n☁️  Deploying to Azure Analysis Services...');
    console.log('   (This creates a schema-only model for validation)');

    const deployResult = deployToAas(tmslDatabase, server, token);
    console.log(`   ✅ ${deployResult.message}`);

    // Step 4: Validate measures
    const { validCount, errorCount } = validateMeasures(model.tables, databaseName, server, token);

    // Step 5: Cleanup - delete test database
    console.log('\n🧹 Cleaning up...');
    deleteDatabase(databaseName, server, token);
    console.log('   ✅ Test database deleted');

    console.log('\n📋 Summary:');
    console.log(`   Tables deployed: ${model.tables.length}`);
    console.log(`   Measures validated: ${validCount} passed, ${errorCount} failed`);

    if (errorCount > 0) {
      console.log('\n❌ Some measures failed validation');
      process.exit(1);
    } else {
      console.log('\n✅ All measures validated successfully!');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);

    // Try to cleanup on error
    try {
      deleteDatabase(databaseName, server, token);
    } catch (e) {
      // Ignore cleanup errors
    }

    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
