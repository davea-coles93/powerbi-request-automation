import { useMemo } from 'react';
import { useMetrics, useMeasures, useAttributes, useEntities, useSystems, useRelationships } from '../../../hooks/useOntology';

// ── Types ────────────────────────────────────────────────────────────────

export interface RecommendedColumn {
  id: string;
  name: string;
  sourceAttributeId: string;
  dataType?: string;
  description?: string;
  sourceTable?: string;
  sourceColumn?: string;
}

export interface RecommendedDAXMeasure {
  id: string;
  name: string;
  sourceMeasureId: string;
  formula?: string;
  description?: string;
  /** IDs of metrics this measure supports */
  metricIds: string[];
}

export interface RecommendedTable {
  id: string;
  name: string;
  tableType: 'Fact' | 'Dimension';
  /** The ontology entity this dimension maps to (null for fact tables) */
  sourceEntityId: string | null;
  sourceEntityName: string | null;
  columns: RecommendedColumn[];
  measures: RecommendedDAXMeasure[];
  /** IDs of dimension tables this fact table relates to */
  relatedDimensionIds: string[];
}

export interface RecommendedRelationship {
  id: string;
  fromTableId: string;
  fromColumnId: string;
  toTableId: string;
  toColumnId: string;
  label: string;
}

export interface RecommendedSchema {
  tables: RecommendedTable[];
  relationships: RecommendedRelationship[];
  coverage: {
    entitiesMapped: number;
    totalEntities: number;
    attributesMapped: number;
    totalAttributes: number;
    measuresMapped: number;
    totalMeasures: number;
  };
  isLoading: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function toPascalCase(s: string): string {
  return s
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useRecommendedSchema(): RecommendedSchema {
  const { data: metrics = [], isLoading: metricsLoading } = useMetrics();
  const { data: measures = [], isLoading: measuresLoading } = useMeasures();
  const { data: attributes = [], isLoading: attributesLoading } = useAttributes();
  const { data: entities = [], isLoading: entitiesLoading } = useEntities();
  const { data: systems = [], isLoading: systemsLoading } = useSystems();
  const { data: entityRelationships = [], isLoading: relationshipsLoading } = useRelationships();

  const isLoading = metricsLoading || measuresLoading || attributesLoading || entitiesLoading || systemsLoading || relationshipsLoading;

  return useMemo(() => {
    if (isLoading || entities.length === 0) {
      return { tables: [], relationships: [], coverage: { entitiesMapped: 0, totalEntities: 0, attributesMapped: 0, totalAttributes: 0, measuresMapped: 0, totalMeasures: 0 }, isLoading };
    }

    // ── Step 1: Build Dimension tables (one per entity) ──────────────

    const entityMap = new Map(entities.map((e: any) => [e.id, e]));
    // systemMap reserved for future use (e.g. system-level lineage)
    void systems;

    // Group attributes by entity
    const attrsByEntity = new Map<string, any[]>();
    for (const attr of attributes) {
      const eid = (attr as any).entity_id;
      if (!eid) continue;
      if (!attrsByEntity.has(eid)) attrsByEntity.set(eid, []);
      attrsByEntity.get(eid)!.push(attr);
    }

    const dimensionTables: RecommendedTable[] = entities.map((entity: any) => {
      const entityAttrs = attrsByEntity.get(entity.id) || [];
      const dimId = `dim-${entity.id}`;

      // Primary key column (always present)
      const pkCol: RecommendedColumn = {
        id: `${dimId}-pk`,
        name: `${toPascalCase(entity.name)}Key`,
        sourceAttributeId: '',
        dataType: 'int',
        description: `Surrogate key for ${entity.name}`,
      };

      const columns: RecommendedColumn[] = [
        pkCol,
        ...entityAttrs.map((attr: any) => ({
          id: `${dimId}-${attr.id}`,
          name: attr.name,
          sourceAttributeId: attr.id,
          dataType: attr.data_type || 'string',
          description: attr.description,
          sourceTable: attr.source_table,
          sourceColumn: attr.source_column,
        })),
      ];

      return {
        id: dimId,
        name: `Dim_${toPascalCase(entity.name)}`,
        tableType: 'Dimension' as const,
        sourceEntityId: entity.id,
        sourceEntityName: entity.name,
        columns,
        measures: [],
        relatedDimensionIds: [],
      };
    });

    // ── Step 2: Build Fact tables from measures ──────────────────────

    // For each measure, find which entities its input attributes belong to.
    // Group measures by their entity combination to form fact tables.

    // Build attribute→entity lookup
    const attrToEntity = new Map<string, string>();
    for (const attr of attributes) {
      const eid = (attr as any).entity_id;
      if (eid) attrToEntity.set((attr as any).id, eid);
    }

    // Build metric→measure lookup
    const measureToMetrics = new Map<string, string[]>();
    for (const metric of metrics) {
      const mids: string[] = (metric as any).calculated_by_measure_ids || [];
      for (const mid of mids) {
        if (!measureToMetrics.has(mid)) measureToMetrics.set(mid, []);
        measureToMetrics.get(mid)!.push((metric as any).id);
      }
    }

    // Group measures by their entity set (sorted for stable keys)
    const factGroups = new Map<string, { entityIds: string[]; measures: any[] }>();

    for (const measure of measures) {
      const inputAttrIds: string[] = (measure as any).input_attribute_ids || [];
      const entityIds = [...new Set(inputAttrIds.map((aid) => attrToEntity.get(aid)).filter(Boolean) as string[])].sort();

      if (entityIds.length === 0) continue; // orphaned measure — skip

      const key = entityIds.join('|');
      if (!factGroups.has(key)) factGroups.set(key, { entityIds, measures: [] });
      factGroups.get(key)!.measures.push(measure);
    }

    const factTables: RecommendedTable[] = [];
    let factIdx = 0;

    for (const [, group] of factGroups) {
      factIdx++;
      // Name the fact table after the entity combination
      const entityNames = group.entityIds
        .map((eid) => entityMap.get(eid)?.name || eid)
        .map(toPascalCase);

      const factName = entityNames.length <= 2
        ? `Fact_${entityNames.join('')}`
        : `Fact_${entityNames[0]}${entityNames.length > 1 ? 'Mix' : ''}`;

      const factId = `fact-${factIdx}`;

      // Foreign key columns (one per related dimension)
      const fkColumns: RecommendedColumn[] = group.entityIds.map((eid) => {
        const entity = entityMap.get(eid);
        const name = entity ? toPascalCase(entity.name) : eid;
        return {
          id: `${factId}-fk-${eid}`,
          name: `${name}Key`,
          sourceAttributeId: '',
          dataType: 'int',
          description: `Foreign key to Dim_${name}`,
        };
      });

      // DAX measures
      const daxMeasures: RecommendedDAXMeasure[] = group.measures.map((m: any) => ({
        id: `${factId}-m-${m.id}`,
        name: m.name,
        sourceMeasureId: m.id,
        formula: m.formula || undefined,
        description: m.description,
        metricIds: measureToMetrics.get(m.id) || [],
      }));

      factTables.push({
        id: factId,
        name: factName,
        tableType: 'Fact',
        sourceEntityId: null,
        sourceEntityName: null,
        columns: fkColumns,
        measures: daxMeasures,
        relatedDimensionIds: group.entityIds.map((eid) => `dim-${eid}`),
      });
    }

    // ── Step 3: Orphaned measures (no input attributes) → general fact ─

    const mappedMeasureIds = new Set(
      [...factGroups.values()].flatMap((g) => g.measures.map((m: any) => m.id))
    );
    const orphanedMeasures = measures.filter((m: any) => !mappedMeasureIds.has(m.id));

    if (orphanedMeasures.length > 0) {
      const generalFactId = 'fact-general';
      factTables.push({
        id: generalFactId,
        name: 'Fact_General',
        tableType: 'Fact',
        sourceEntityId: null,
        sourceEntityName: null,
        columns: [],
        measures: orphanedMeasures.map((m: any) => ({
          id: `${generalFactId}-m-${m.id}`,
          name: m.name,
          sourceMeasureId: m.id,
          formula: m.formula || undefined,
          description: m.description,
          metricIds: measureToMetrics.get(m.id) || [],
        })),
        relatedDimensionIds: [],
      });
    }

    // ── Step 4: Build relationships ──────────────────────────────────

    const relationships: RecommendedRelationship[] = [];
    for (const fact of factTables) {
      for (const dimId of fact.relatedDimensionIds) {
        const dim = [...dimensionTables, ...factTables].find((t) => t.id === dimId);
        if (!dim) continue;

        const fkCol = fact.columns.find((c) => c.name === dim.columns[0]?.name);
        const pkCol = dim.columns[0];
        if (!fkCol || !pkCol) continue;

        relationships.push({
          id: `rel-${fact.id}-${dimId}`,
          fromTableId: fact.id,
          fromColumnId: fkCol.id,
          toTableId: dimId,
          toColumnId: pkCol.id,
          label: `${fact.name} → ${dim.name}`,
        });
      }
    }

    // Dimension-to-dimension relationships from entity relationships
    for (const rel of entityRelationships as any[]) {
      if (!rel.is_active) continue;
      const fromDimId = `dim-${rel.from_entity_id}`;
      const toDimId = `dim-${rel.to_entity_id}`;
      const fromDim = dimensionTables.find((t) => t.id === fromDimId);
      const toDim = dimensionTables.find((t) => t.id === toDimId);
      if (!fromDim || !toDim) continue;

      // The "from" dimension gets an FK column pointing to the "to" dimension's PK
      const toPk = toDim.columns[0];
      if (!toPk) continue;

      // Add FK column to the from dimension if it doesn't already have one
      let fkCol = fromDim.columns.find((c) => c.name === toPk.name);
      if (!fkCol) {
        fkCol = {
          id: `${fromDimId}-fk-${rel.to_entity_id}`,
          name: toPk.name,
          sourceAttributeId: '',
          dataType: 'int',
          description: `Foreign key to ${toDim.name}`,
        };
        fromDim.columns.push(fkCol);
      }

      relationships.push({
        id: `rel-${fromDimId}-${toDimId}`,
        fromTableId: fromDimId,
        fromColumnId: fkCol.id,
        toTableId: toDimId,
        toColumnId: toPk.id,
        label: `${fromDim.name} → ${toDim.name}`,
      });
    }

    // ── Step 5: Coverage stats ───────────────────────────────────────

    const tables = [...dimensionTables, ...factTables];

    const coverage = {
      entitiesMapped: dimensionTables.length,
      totalEntities: entities.length,
      // Attributes in dimension columns (minus PKs)
      attributesMapped: dimensionTables.reduce((sum, t) => sum + t.columns.filter((c) => c.sourceAttributeId).length, 0),
      totalAttributes: attributes.length,
      measuresMapped: factTables.reduce((sum, t) => sum + t.measures.length, 0),
      totalMeasures: measures.length,
    };

    return { tables, relationships, coverage, isLoading };
  }, [metrics, measures, attributes, entities, systems, entityRelationships, isLoading]);
}
