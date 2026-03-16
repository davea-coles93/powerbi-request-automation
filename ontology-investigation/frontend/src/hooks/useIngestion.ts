import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import * as api from '../services/api';

export type IngestionStage = 'idle' | 'uploading' | 'enriching' | 'enriched' | 'loading' | 'loaded' | 'error';

export interface StagedSource {
  id: string;
  fileName: string;
  sourceType: string; // 'excel' | 'csv' | 'powerbi' | 'powerapp'
  parsedAt: Date;
  data: any; // raw parse result
  counts: {
    entities: number;
    attributes: number;
    measures: number;
    systems: number;
    processes: number;
    relationships: number;
  };
}

export interface EnrichmentResult {
  analysis: string; // AI's prose analysis
  entities: any[];
  attributes: any[];
  measures: any[];
  metrics: any[];
  relationships: any[];
  systems: any[];
  perspectives: any[];
  gaps: any[];
  deduplicationLog: any[];
}

export function useIngestion() {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<IngestionStage>('idle');
  const [stagedSources, setStagedSources] = useState<StagedSource[]>([]);
  const [enrichmentText, setEnrichmentText] = useState('');
  const [enrichmentResult, setEnrichmentResult] = useState<EnrichmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const abortRef = useRef<AbortController | null>(null);

  const DOCUMENT_EXTENSIONS = ['.pdf', '.docx', '.pptx', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];

  // Detect file type and route to the right parser
  const detectSourceType = (file: File): 'spreadsheet' | 'powerbi' | 'powerapp' | 'document' | null => {
    const name = file.name.toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
      return 'spreadsheet';
    }
    if (name.endsWith('.zip')) {
      // Heuristic: if filename contains common PBI patterns, try PBI first
      // Otherwise we'll try PBI then fall back to PowerApp
      return 'powerbi'; // Will fall back to powerapp if PBI parse fails
    }
    if (DOCUMENT_EXTENSIONS.some(ext => name.endsWith(ext))) {
      return 'document';
    }
    return null;
  };

  const addFiles = useCallback(async (files: File[]) => {
    setStage('uploading');
    setError(null);

    for (const file of files) {
      const sourceType = detectSourceType(file);
      if (!sourceType) {
        toast.error(`Unsupported file type: ${file.name}`);
        continue;
      }

      setUploadProgress(`Parsing ${file.name}...`);

      try {
        let data: any;

        if (sourceType === 'spreadsheet') {
          data = await api.parseSpreadsheet(file);
        } else if (sourceType === 'document') {
          setUploadProgress(`Extracting elements from ${file.name} (AI)...`);
          data = await api.parseDocument(file);
        } else if (sourceType === 'powerbi') {
          try {
            data = await api.parsePowerBI(file);
          } catch (pbiError: any) {
            // If PBI parse fails (no TMDL found), try PowerApp
            try {
              data = await api.parsePowerApp(file);
            } catch (paError: any) {
              throw new Error(
                `Could not parse ${file.name} as Power BI or PowerApp. ` +
                `PBI: ${pbiError?.response?.data?.detail || pbiError.message}. ` +
                `PowerApp: ${paError?.response?.data?.detail || paError.message}.`
              );
            }
          }
        }

        if (!data) continue;

        const staged: StagedSource = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          fileName: file.name,
          sourceType: data.source_type || sourceType,
          parsedAt: new Date(),
          data,
          counts: {
            entities: data.entities?.length || 0,
            attributes: data.attributes?.length || 0,
            measures: data.measures?.length || 0,
            systems: data.systems?.length || 0,
            processes: data.processes?.length || 0,
            relationships: data.relationships?.length || 0,
          },
        };

        setStagedSources(prev => [...prev, staged]);
        toast.success(`Parsed ${file.name}`);
      } catch (err: any) {
        const msg = err?.response?.data?.detail || err.message || 'Parse failed';
        toast.error(`Failed to parse ${file.name}: ${msg}`);
      }
    }

    setUploadProgress('');
    setStage(prev => prev === 'uploading' ? 'idle' : prev);
  }, []);

  const addStagedSource = useCallback((name: string, sourceType: string, data: any) => {
    const staged: StagedSource = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fileName: name,
      sourceType,
      parsedAt: new Date(),
      data,
      counts: {
        entities: data.entities?.length || 0,
        attributes: data.attributes?.length || 0,
        measures: data.measures?.length || 0,
        systems: data.systems?.length || 0,
        processes: data.processes?.length || 0,
        relationships: data.relationships?.length || 0,
      },
    };
    setStagedSources(prev => [...prev, staged]);
  }, []);

  const removeSource = useCallback((sourceId: string) => {
    setStagedSources(prev => prev.filter(s => s.id !== sourceId));
    // Reset enrichment if sources change
    setEnrichmentResult(null);
    setEnrichmentText('');
  }, []);

  const clearAll = useCallback(() => {
    setStagedSources([]);
    setEnrichmentResult(null);
    setEnrichmentText('');
    setError(null);
    setStage('idle');
  }, []);

  // Parse the enrichment block from streamed text
  const parseEnrichmentBlock = (text: string): EnrichmentResult | null => {
    const match = text.match(/```enrichment\s*\n([\s\S]*?)```/);
    if (!match) return null;

    try {
      const json = JSON.parse(match[1]);
      // Extract the analysis text (everything before the enrichment block)
      const analysisEnd = text.indexOf('```enrichment');
      const analysis = text.slice(0, analysisEnd).trim();

      return {
        analysis,
        entities: json.entities || [],
        attributes: json.attributes || [],
        measures: json.measures || [],
        metrics: json.metrics || [],
        relationships: json.relationships || [],
        systems: json.systems || [],
        perspectives: json.perspectives || [],
        gaps: json.gaps || [],
        deduplicationLog: json.deduplication_log || [],
      };
    } catch {
      return null;
    }
  };

  const startEnrichment = useCallback(async (userGuidance: string = '') => {
    if (stagedSources.length === 0) return;

    setStage('enriching');
    setEnrichmentText('');
    setEnrichmentResult(null);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    let fullText = '';

    await api.enrichIngestionStream(
      stagedSources.map(s => s.data),
      userGuidance,
      (text) => {
        fullText += text;
        setEnrichmentText(fullText);
      },
      () => {
        // Done — try to parse the enrichment block
        const result = parseEnrichmentBlock(fullText);
        if (result) {
          setEnrichmentResult(result);
          setStage('enriched');
        } else {
          setStage('enriched');
          // Still mark as enriched even without a parseable block
          // The user can see the raw text
        }
      },
      (errMsg) => {
        setError(errMsg);
        setStage('error');
      },
      controller.signal,
    );
  }, [stagedSources]);

  const stopEnrichment = useCallback(() => {
    abortRef.current?.abort();
    setStage('idle');
  }, []);

  const loadToOntology = useCallback(async (conflictStrategy: string = 'skip') => {
    if (!enrichmentResult) return;

    setStage('loading');
    setError(null);

    try {
      const payload = {
        entities: enrichmentResult.entities,
        attributes: enrichmentResult.attributes,
        measures: enrichmentResult.measures,
        metrics: enrichmentResult.metrics,
        relationships: enrichmentResult.relationships,
        systems: enrichmentResult.systems,
        perspectives: enrichmentResult.perspectives,
        conflict_strategy: conflictStrategy,
      };

      await api.loadIngestedElements(payload, 'spreadsheet');
      queryClient.invalidateQueries();
      setStage('loaded');
      toast.success('Elements loaded into ontology');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Load failed';
      setError(msg);
      setStage('error');
      toast.error(`Load failed: ${msg}`);
    }
  }, [enrichmentResult, queryClient]);

  // Load raw staged elements directly (skip AI enrichment)
  const loadRawToOntology = useCallback(async (conflictStrategy: string = 'skip') => {
    if (stagedSources.length === 0) return;

    setStage('loading');
    setError(null);

    try {
      // Merge all staged sources into one payload
      const merged = {
        entities: [] as any[],
        attributes: [] as any[],
        measures: [] as any[],
        metrics: [] as any[],
        relationships: [] as any[],
        systems: [] as any[],
        perspectives: [] as any[],
        processes: [] as any[],
        conflict_strategy: conflictStrategy,
      };

      for (const source of stagedSources) {
        const d = source.data;
        if (d.entities) merged.entities.push(...d.entities);
        if (d.attributes) merged.attributes.push(...d.attributes);
        if (d.measures) merged.measures.push(...d.measures);
        if (d.metrics) merged.metrics.push(...d.metrics);
        if (d.relationships) merged.relationships.push(...d.relationships);
        if (d.systems) merged.systems.push(...d.systems);
        if (d.perspectives) merged.perspectives.push(...d.perspectives);
        if (d.processes) merged.processes.push(...d.processes);
      }

      await api.loadIngestedElements(merged);
      queryClient.invalidateQueries();
      setStage('loaded');
      toast.success('Elements loaded into ontology');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Load failed';
      setError(msg);
      setStage('error');
      toast.error(`Load failed: ${msg}`);
    }
  }, [stagedSources, queryClient]);

  return {
    stage,
    stagedSources,
    enrichmentText,
    enrichmentResult,
    error,
    uploadProgress,
    addFiles,
    addStagedSource,
    removeSource,
    clearAll,
    startEnrichment,
    stopEnrichment,
    loadToOntology,
    loadRawToOntology,
  };
}
