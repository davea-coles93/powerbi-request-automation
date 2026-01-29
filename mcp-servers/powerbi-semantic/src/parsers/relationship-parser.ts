/**
 * Enhanced TMDL Relationship Parser
 * Parses cardinality, cross-filter direction, etc.
 */

import { TmdlRelationship } from '../types.js';

export async function parseRelationshipsFile(content: string): Promise<TmdlRelationship[]> {
  const lines = content.split('\n');
  const relationships: TmdlRelationship[] = [];

  let currentRel: Partial<TmdlRelationship> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // New relationship
    if (trimmed.startsWith('relationship ')) {
      // Save previous
      if (currentRel && currentRel.fromTable && currentRel.toTable) {
        relationships.push(currentRel as TmdlRelationship);
      }

      const nameMatch = trimmed.match(/relationship\s+(.+)/);
      currentRel = {
        name: nameMatch ? nameMatch[1].trim() : undefined,
        fromTable: '',
        fromColumn: '',
        toTable: '',
        toColumn: '',
        isActive: true, // default
      };
      continue;
    }

    if (!currentRel) continue;

    // fromColumn: Table.Column or Table.'Column Name'
    if (trimmed.startsWith('fromColumn:')) {
      const colPart = trimmed.replace('fromColumn:', '').trim();
      const match = colPart.match(/^([^.]+)\.(?:'([^']+)'|(\S+))$/);
      if (match) {
        currentRel.fromTable = match[1];
        currentRel.fromColumn = match[2] || match[3];
      }
    }

    // toColumn: Table.Column or Table.'Column Name'
    if (trimmed.startsWith('toColumn:')) {
      const colPart = trimmed.replace('toColumn:', '').trim();
      const match = colPart.match(/^([^.]+)\.(?:'([^']+)'|(\S+))$/);
      if (match) {
        currentRel.toTable = match[1];
        currentRel.toColumn = match[2] || match[3];
      }
    }

    // Cardinality
    if (trimmed.startsWith('fromCardinality:')) {
      const card = trimmed.replace('fromCardinality:', '').trim();
      currentRel.fromCardinality = card as 'one' | 'many';
    }

    if (trimmed.startsWith('toCardinality:')) {
      const card = trimmed.replace('toCardinality:', '').trim();
      currentRel.toCardinality = card as 'one' | 'many';
    }

    // Active status
    if (trimmed === 'isActive: false') {
      currentRel.isActive = false;
    }

    // Cross-filtering behavior
    if (trimmed.startsWith('crossFilteringBehavior:')) {
      const behavior = trimmed.replace('crossFilteringBehavior:', '').trim();
      currentRel.crossFilterDirection = behavior as 'oneDirection' | 'bothDirections';
    }

    // Security filtering
    if (trimmed.startsWith('securityFilteringBehavior:')) {
      currentRel.securityFilteringBehavior = trimmed.replace('securityFilteringBehavior:', '').trim();
    }

    // Lineage tag
    if (trimmed.startsWith('lineageTag:')) {
      currentRel.lineageTag = trimmed.replace('lineageTag:', '').trim();
    }
  }

  // Save last relationship
  if (currentRel && currentRel.fromTable && currentRel.toTable) {
    relationships.push(currentRel as TmdlRelationship);
  }

  return relationships;
}
