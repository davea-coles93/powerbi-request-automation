import { useState, useRef, useCallback } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Table,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

interface ExcelImportPanelProps {
  onClose: () => void;
  onImported: () => void;
}

type ImportMode = 'excel' | 'csv';

type EntityType =
  | 'perspectives'
  | 'systems'
  | 'entities'
  | 'attributes'
  | 'measures'
  | 'metrics'
  | 'processes';

interface ImportResultData {
  success: boolean;
  entity_type?: string;
  items_created?: number;
  sheets_processed?: string[];
  summary?: Record<string, number>;
  errors?: string[];
}

// Known model fields per entity type for column mapping
const MODEL_FIELDS: Record<EntityType, string[]> = {
  perspectives: ['id', 'name', 'purpose', 'primary_concern', 'typical_actors', 'consumes_from', 'feeds'],
  systems: ['id', 'name', 'type', 'vendor', 'reliability_default', 'integration_status', 'notes'],
  entities: ['id', 'name', 'description'],
  attributes: [
    'id', 'name', 'description', 'entity_id', 'system_id', 'source_actor',
    'reliability', 'volatility', 'notes', 'source_table', 'source_column',
    'source_connection', 'perspective_ids',
  ],
  measures: [
    'id', 'name', 'description', 'logic', 'formula',
    'input_attribute_ids', 'input_measure_ids', 'perspective_ids',
  ],
  metrics: [
    'id', 'name', 'description', 'business_question',
    'calculated_by_measure_ids', 'perspective_ids',
  ],
  processes: ['id', 'name', 'description'],
};

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  perspectives: 'Perspectives',
  systems: 'Systems',
  entities: 'Entities',
  attributes: 'Attributes',
  measures: 'Measures',
  metrics: 'Metrics',
  processes: 'Processes',
};

export function ExcelImportPanel({ onClose, onImported }: ExcelImportPanelProps) {
  const [mode, setMode] = useState<ImportMode>('excel');
  const [file, setFile] = useState<File | null>(null);
  const [csvEntityType, setCsvEntityType] = useState<EntityType>('systems');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [csvPreviewRows, setCsvPreviewRows] = useState<string[][]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResultData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile);
      setResult(null);

      if (mode === 'csv') {
        // Parse CSV headers for mapping
        try {
          const text = await selectedFile.text();
          const lines = text.split('\n').filter((l) => l.trim());
          if (lines.length > 0) {
            // Simple CSV parse for headers (handles basic cases)
            const headers = parseCSVLine(lines[0]);
            setCsvHeaders(headers);

            // Auto-detect mapping
            const autoMapping: Record<string, string> = {};
            const fields = MODEL_FIELDS[csvEntityType] || [];
            for (const header of headers) {
              const clean = header.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
              if (fields.includes(clean)) {
                autoMapping[header] = clean;
              }
            }
            setColumnMapping(autoMapping);

            // Preview rows (up to 3)
            const preview: string[][] = [];
            for (let i = 1; i < Math.min(lines.length, 4); i++) {
              preview.push(parseCSVLine(lines[i]));
            }
            setCsvPreviewRows(preview);
          }
        } catch {
          setCsvHeaders([]);
          setCsvPreviewRows([]);
        }
      }
    },
    [mode, csvEntityType]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      if (mode === 'csv') {
        formData.append('entity_type', csvEntityType);
        formData.append('column_mapping', JSON.stringify(columnMapping));

        const response = await api.post('/discovery/import/csv', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setResult(response.data);
      } else {
        const response = await api.post('/discovery/import/excel', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setResult(response.data);
      }

      onImported();
    } catch (err: any) {
      setResult({
        success: false,
        errors: [err?.response?.data?.detail || 'Import failed. Please check the file format.'],
      });
    } finally {
      setImporting(false);
    }
  };

  const resetFile = () => {
    setFile(null);
    setCsvHeaders([]);
    setColumnMapping({});
    setCsvPreviewRows([]);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const totalImported = result?.summary
    ? Object.values(result.summary).reduce((sum, n) => sum + n, 0)
    : result?.items_created ?? 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[85vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-purple-600" />
              Import Data
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Import Excel or CSV files to add data incrementally to the ontology
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Info banner */}
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-green-800">
              Data will be <strong>added incrementally</strong> to the existing ontology. Existing records will not be overwritten.
            </p>
          </div>

          {/* Mode Selector */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('excel');
                resetFile();
              }}
              className={`flex-1 p-3 rounded-lg border-2 transition-all text-left ${
                mode === 'excel'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <FileSpreadsheet
                  className={`w-4 h-4 ${mode === 'excel' ? 'text-purple-600' : 'text-gray-400'}`}
                />
                <span className="font-medium text-sm">Quick Import (Excel)</span>
              </div>
              <p className="text-xs text-gray-500">
                Upload .xlsx with sheets named by entity type
              </p>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('csv');
                resetFile();
              }}
              className={`flex-1 p-3 rounded-lg border-2 transition-all text-left ${
                mode === 'csv'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Table className={`w-4 h-4 ${mode === 'csv' ? 'text-purple-600' : 'text-gray-400'}`} />
                <span className="font-medium text-sm">CSV Import</span>
              </div>
              <p className="text-xs text-gray-500">Upload .csv with column mapping</p>
            </button>
          </div>

          {/* CSV Entity Type Selector */}
          {mode === 'csv' && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Target Entity Type
              </label>
              <div className="relative">
                <select
                  value={csvEntityType}
                  onChange={(e) => {
                    setCsvEntityType(e.target.value as EntityType);
                    setColumnMapping({});
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  {Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* File Upload */}
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 hover:bg-purple-50/30 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">
                Drop your {mode === 'excel' ? '.xlsx' : '.csv'} file here
              </p>
              <p className="text-xs text-gray-500 mt-1">or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                accept={mode === 'excel' ? '.xlsx,.xls' : '.csv'}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />
            </div>
          ) : (
            <div className="mb-4">
              {/* File Info */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-purple-500" />
                  <div>
                    <span className="text-sm font-medium text-gray-900">{file.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetFile}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                >
                  Change file
                </button>
              </div>

              {/* Excel Mode Info */}
              {mode === 'excel' && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-gray-600 mb-2">Sheet Convention</h4>
                  <p className="text-xs text-gray-500 mb-3">
                    Each sheet name should match an entity type. The first row is used as headers.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.values(ENTITY_TYPE_LABELS).map((label) => (
                      <span
                        key={label}
                        className="inline-flex items-center px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-md"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* CSV Column Mapping */}
              {mode === 'csv' && csvHeaders.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-600 mb-2">Column Mapping</h4>
                  <p className="text-xs text-gray-500 mb-3">
                    Map CSV columns to {ENTITY_TYPE_LABELS[csvEntityType]} fields. Unmapped columns will be ignored.
                  </p>
                  <div className="space-y-2 mb-4">
                    {csvHeaders.map((header) => (
                      <div key={header} className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded min-w-[120px] truncate">
                          {header}
                        </span>
                        <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <select
                          value={columnMapping[header] || ''}
                          onChange={(e) => {
                            const newMapping = { ...columnMapping };
                            if (e.target.value) {
                              newMapping[header] = e.target.value;
                            } else {
                              delete newMapping[header];
                            }
                            setColumnMapping(newMapping);
                          }}
                          className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="">(skip)</option>
                          {(MODEL_FIELDS[csvEntityType] || []).map((field) => (
                            <option key={field} value={field}>
                              {field}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  {/* Preview */}
                  {csvPreviewRows.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-600 mb-2">
                        Preview ({csvPreviewRows.length} rows shown)
                      </h4>
                      <div className="overflow-x-auto border rounded-lg">
                        <table className="min-w-full text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              {csvHeaders.map((h) => (
                                <th
                                  key={h}
                                  className="px-3 py-2 text-left font-medium text-gray-600 border-b"
                                >
                                  {h}
                                  {columnMapping[h] && (
                                    <span className="block text-purple-600 font-normal">
                                      {'->'} {columnMapping[h]}
                                    </span>
                                  )}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {csvPreviewRows.map((row, ri) => (
                              <tr key={ri} className="border-b last:border-b-0">
                                {row.map((cell, ci) => (
                                  <td key={ci} className="px-3 py-2 text-gray-700 truncate max-w-[200px]">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <div
              className={`mt-4 p-4 rounded-lg border ${
                result.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      result.success ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {result.success
                      ? `Successfully imported ${totalImported} item${totalImported !== 1 ? 's' : ''}`
                      : 'Import encountered issues'}
                  </p>

                  {/* Summary for Excel */}
                  {result.summary && Object.keys(result.summary).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(result.summary).map(([sheet, count]) => (
                        <span
                          key={sheet}
                          className="inline-flex items-center px-2 py-1 bg-white text-green-700 text-xs rounded-md border border-green-200"
                        >
                          {sheet}: {count}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Errors */}
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 mb-1">
                        {result.errors.length} warning{result.errors.length !== 1 ? 's' : ''}:
                      </p>
                      <ul className="text-xs text-gray-600 space-y-0.5 max-h-32 overflow-y-auto">
                        {result.errors.map((err, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-amber-500 mt-0.5">-</span>
                            {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={importing}
          >
            {result?.success ? 'Close' : 'Cancel'}
          </button>
          {!result?.success && (
            <button
              type="button"
              onClick={handleImport}
              disabled={!file || importing}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import Data
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Simple CSV line parser that handles quoted fields.
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}
