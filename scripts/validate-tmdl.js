#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all TMDL files in a model
function findTmdlFiles(modelPath) {
  const defPath = path.join(modelPath, 'definition');
  if (!fs.existsSync(defPath)) {
    console.error(`No definition folder found at ${defPath}`);
    process.exit(1);
  }

  const files = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.tmdl')) {
        files.push(fullPath);
      }
    }
  }
  walk(defPath);
  return files;
}

// Extract DAX measures from TMDL content
function extractMeasures(tmdlContent, filePath) {
  const measures = [];
  const lines = tmdlContent.split('\n');

  let currentMeasure = null;
  let inDaxBlock = false;
  let daxLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match measure definition: measure 'Name' = ```
    const measureMatch = line.match(/^\s*measure\s+(?:'([^']+)'|(\S+))\s*=\s*```/);
    if (measureMatch) {
      currentMeasure = measureMatch[1] || measureMatch[2];
      inDaxBlock = true;
      daxLines = [];
      continue;
    }

    // End of DAX block
    if (inDaxBlock && line.trim() === '```') {
      measures.push({
        name: currentMeasure,
        dax: daxLines.join('\n').trim(),
        file: filePath,
        line: i - daxLines.length
      });
      currentMeasure = null;
      inDaxBlock = false;
      daxLines = [];
      continue;
    }

    // Collect DAX lines
    if (inDaxBlock) {
      daxLines.push(line);
    }
  }

  return measures;
}

// Validate DAX expression using AAS validator
function validateDax(dax, server, database, token) {
  try {
    const result = execSync(
      `dotnet run --project aas-validator/AasValidator -- --server "${server}" --database "${database}" --token "${token}" --command validate --query "${dax.replace(/"/g, '\\"')}"`,
      { encoding: 'utf8', stdio: 'pipe' }
    );

    const response = JSON.parse(result.trim());
    return response;
  } catch (error) {
    // Parse error from stderr
    try {
      const output = error.stdout || error.stderr || '';
      const jsonMatch = output.match(/\{.*\}/s);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Ignore
    }
    return { success: false, valid: false, error: error.message };
  }
}

// Main validation
async function main() {
  const args = process.argv.slice(2);
  const modelPath = args[0] || 'models/adventure-works/sales-sample.SemanticModel';

  console.log(`\n🔍 Validating TMDL model: ${modelPath}\n`);

  // Step 1: Find all TMDL files
  const tmdlFiles = findTmdlFiles(modelPath);
  console.log(`Found ${tmdlFiles.length} TMDL files`);

  // Step 2: Extract all measures
  let allMeasures = [];
  for (const file of tmdlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const measures = extractMeasures(content, file);
    allMeasures = allMeasures.concat(measures);
  }

  console.log(`Found ${allMeasures.length} measures\n`);

  if (allMeasures.length === 0) {
    console.log('✅ No measures to validate');
    process.exit(0);
  }

  // Step 3: Validate syntax (basic checks)
  console.log('📋 Syntax validation:');
  let syntaxErrors = 0;

  for (const measure of allMeasures) {
    // Basic syntax checks
    const issues = [];

    if (!measure.dax || measure.dax.trim().length === 0) {
      issues.push('Empty DAX expression');
    }

    // Check for unbalanced parentheses
    const openParens = (measure.dax.match(/\(/g) || []).length;
    const closeParens = (measure.dax.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      issues.push(`Unbalanced parentheses (${openParens} open, ${closeParens} close)`);
    }

    if (issues.length > 0) {
      syntaxErrors++;
      console.log(`  ❌ ${measure.name}`);
      console.log(`     File: ${measure.file}:${measure.line}`);
      issues.forEach(issue => console.log(`     - ${issue}`));
    } else {
      console.log(`  ✅ ${measure.name}`);
    }
  }

  if (syntaxErrors > 0) {
    console.log(`\n❌ ${syntaxErrors} measure(s) with syntax errors`);
    process.exit(1);
  }

  console.log(`\n✅ All ${allMeasures.length} measures passed syntax validation`);

  // Step 4: Optional - Validate against AAS if credentials provided
  const server = process.env.AZURE_AAS_SERVER;
  const database = process.env.AZURE_AAS_DATABASE || process.env.CI_DATABASE_NAME;
  const token = process.env.AAS_ACCESS_TOKEN;

  if (server && database && token) {
    console.log(`\n🔗 Validating DAX against AAS: ${database}\n`);

    let validationErrors = 0;
    for (const measure of allMeasures) {
      const result = validateDax(measure.dax, server, database, token);

      if (!result.valid) {
        validationErrors++;
        console.log(`  ❌ ${measure.name}`);
        console.log(`     ${result.error}`);
      } else {
        console.log(`  ✅ ${measure.name}`);
      }
    }

    if (validationErrors > 0) {
      console.log(`\n❌ ${validationErrors} measure(s) failed DAX validation`);
      process.exit(1);
    }

    console.log(`\n✅ All measures validated successfully against AAS`);
  } else {
    console.log('\nℹ️  Skipping AAS validation (no credentials provided)');
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
