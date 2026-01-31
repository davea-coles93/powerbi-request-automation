#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function extractMeasures(tmdlContent, filePath) {
  const measures = [];
  const lines = tmdlContent.split('\n');
  let currentMeasure = null;
  let inDaxBlock = false;
  let daxLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const measureMatch = line.match(/^\s*measure\s+(?:'([^']+)'|(\S+))\s*=\s*```/);

    if (measureMatch) {
      currentMeasure = measureMatch[1] || measureMatch[2];
      inDaxBlock = true;
      daxLines = [];
      continue;
    }

    if (inDaxBlock && line.trim() === '```') {
      measures.push({
        name: currentMeasure,
        dax: daxLines.join('\n').trim(),
        file: filePath
      });
      currentMeasure = null;
      inDaxBlock = false;
      daxLines = [];
      continue;
    }

    if (inDaxBlock) {
      daxLines.push(line);
    }
  }

  return measures;
}

// Main
const modelPath = process.argv[2] || 'models/adventure-works/sales-sample.SemanticModel';
const tablesPath = path.join(modelPath, 'definition', 'tables');

if (!fs.existsSync(tablesPath)) {
  console.error(`Tables directory not found: ${tablesPath}`);
  process.exit(1);
}

const files = fs.readdirSync(tablesPath).filter(f => f.endsWith('.tmdl'));

let allMeasures = [];
for (const file of files) {
  const content = fs.readFileSync(path.join(tablesPath, file), 'utf8');
  const measures = extractMeasures(content, file);
  allMeasures = allMeasures.concat(measures);
}

// Write measures to file for validation
fs.writeFileSync('measures.json', JSON.stringify(allMeasures, null, 2));
console.log(`Found ${allMeasures.length} measures to validate`);
