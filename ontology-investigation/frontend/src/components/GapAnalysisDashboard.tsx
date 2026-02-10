import { AlertTriangle, CheckCircle, XCircle, TrendingUp, Calculator, Database, Eye, ArrowRight, Download, Wand2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

// AI Hook placeholder for future integration
interface AIGapSuggestion {
  type: 'missing_measure' | 'broken_flow' | 'optimization';
  priority: 'high' | 'medium' | 'low';
  description: string;
  attribute_or_measure: string;
  suggested_action: string;
}

// AI Hook: This will be replaced with actual AI-powered gap analysis
const useAIGapAnalysis = (_mappingStatus: any): AIGapSuggestion[] => {
  // TODO: Implement AI-powered gap analysis using Claude API
  // This hook will analyze the mapping status and suggest fixes
  // Example: Suggest DAX formulas for unimplemented measures
  // Example: Suggest which measures should consume orphaned attributes
  return [];
};

interface GapAnalysisProps {
  mappingStatus: {
    // Legacy fields (minimized)
    total_tables?: number;
    mapped_tables?: number;
    unmapped_tables?: number;
    total_columns?: number;
    mapped_columns?: number;
    total_measures?: number;
    mapped_measures?: number;
    orphaned_tables?: string[];
    missing_columns?: any[];

    // New attribute → measure → semantic model linkage fields
    total_attributes?: number;
    attributes_used_by_measures?: number;
    orphaned_attributes: string[];
    total_business_measures?: number;
    implemented_measures?: number;
    unimplemented_measures?: string[];
    attributes_with_complete_flow?: number;
    attributes_with_broken_flow?: string[];
    measures_without_attributes?: string[];
    semantic_tables_with_measures?: number;
    semantic_tables_without_measures?: string[];
    orphaned_measures: string[];
    unmapped_columns: any[];
  };
}

export function GapAnalysisDashboard({ mappingStatus }: GapAnalysisProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isAutoFixing, setIsAutoFixing] = useState(false);

  // AI Hook for future intelligent gap suggestions
  const aiSuggestions = useAIGapAnalysis(mappingStatus);

  // Calculate data flow completeness metrics
  const totalAttributes = mappingStatus.total_attributes || 0;
  const attributesUsed = mappingStatus.attributes_used_by_measures || 0;
  const attributesWithCompleteFlow = mappingStatus.attributes_with_complete_flow || 0;

  const attributeUsagePercent = totalAttributes > 0
    ? Math.round((attributesUsed / totalAttributes) * 100)
    : 0;

  const completeFlowPercent = totalAttributes > 0
    ? Math.round((attributesWithCompleteFlow / totalAttributes) * 100)
    : 0;

  const totalBusinessMeasures = mappingStatus.total_business_measures || 0;
  const implementedMeasures = mappingStatus.implemented_measures || 0;
  const measureImplementationPercent = totalBusinessMeasures > 0
    ? Math.round((implementedMeasures / totalBusinessMeasures) * 100)
    : 0;

  const semanticTablesWithMeasures = mappingStatus.semantic_tables_with_measures || 0;
  const totalSemanticTables = mappingStatus.total_tables || 0;

  // Overall health score (weighted average)
  const overallHealth = Math.round(
    (completeFlowPercent * 0.5 + measureImplementationPercent * 0.3 + attributeUsagePercent * 0.2)
  );

  // Handler functions
  const handleCreateMeasure = (attributeName: string) => {
    // Copy attribute name to clipboard for easy creation
    navigator.clipboard.writeText(attributeName);
    toast.success(
      `Attribute "${attributeName}" copied to clipboard!`,
      {
        duration: 4000,
        icon: '📋',
      }
    );
    toast(
      'Next: Switch to Measures tab, create new measure, and add this attribute as input',
      {
        duration: 6000,
        icon: '💡',
      }
    );
  };

  const handleImplementDAX = (measureName: string) => {
    // Copy measure name to clipboard
    navigator.clipboard.writeText(measureName);
    toast.success(
      `Measure "${measureName}" copied to clipboard!`,
      {
        duration: 4000,
        icon: '📋',
      }
    );
    toast(
      'Next: Switch to Semantic Model tab, find the table, and add DAX implementation',
      {
        duration: 6000,
        icon: '💡',
      }
    );
  };

  const handleLinkToMeasure = (attributeName: string) => {
    // Copy attribute name to clipboard
    navigator.clipboard.writeText(attributeName);
    toast.success(
      `Attribute "${attributeName}" copied to clipboard!`,
      {
        duration: 4000,
        icon: '📋',
      }
    );
    toast(
      'Next: Switch to Measures tab, find or create a measure, and link this attribute as input',
      {
        duration: 6000,
        icon: '💡',
      }
    );
  };

  const handleAutoFix = async () => {
    setIsAutoFixing(true);
    try {
      // Analyze gaps and provide recommendations
      const gaps = [];

      if (mappingStatus.attributes_with_broken_flow && mappingStatus.attributes_with_broken_flow.length > 0) {
        gaps.push(`${mappingStatus.attributes_with_broken_flow.length} attributes not flowing to semantic model`);
      }

      if (mappingStatus.unimplemented_measures && mappingStatus.unimplemented_measures.length > 0) {
        gaps.push(`${mappingStatus.unimplemented_measures.length} measures need DAX implementation`);
      }

      if (mappingStatus.orphaned_attributes.length > 0) {
        gaps.push(`${mappingStatus.orphaned_attributes.length} unused attributes`);
      }

      if (gaps.length === 0) {
        toast.success('No gaps found! Your data flow is healthy.', {
          duration: 5000,
          icon: '✅',
        });
      } else {
        toast.error('Gaps Found', {
          duration: 6000,
          icon: '🔍',
        });

        gaps.forEach((gap, idx) => {
          setTimeout(() => {
            toast(gap, {
              duration: 5000,
              icon: idx < 2 ? '❌' : '⚠️',
            });
          }, idx * 500);
        });

        setTimeout(() => {
          toast('Use Export Gap Report for detailed analysis', {
            duration: 6000,
            icon: '💡',
          });
        }, gaps.length * 500);
      }
    } finally {
      setIsAutoFixing(false);
    }
  };

  const handleExportReport = () => {
    setIsExporting(true);
    try {
      // Create a comprehensive gap report
      const report = {
        timestamp: new Date().toISOString(),
        overall_health: overallHealth,
        summary: {
          total_attributes: totalAttributes,
          attributes_used: attributesUsed,
          attributes_with_complete_flow: attributesWithCompleteFlow,
          total_business_measures: totalBusinessMeasures,
          implemented_measures: implementedMeasures,
          measure_implementation_percent: measureImplementationPercent,
          complete_flow_percent: completeFlowPercent
        },
        gaps: {
          attributes_with_broken_flow: mappingStatus.attributes_with_broken_flow || [],
          unimplemented_measures: mappingStatus.unimplemented_measures || [],
          orphaned_attributes: mappingStatus.orphaned_attributes || [],
          measures_without_attributes: mappingStatus.measures_without_attributes || [],
          semantic_tables_without_measures: mappingStatus.semantic_tables_without_measures || []
        },
        recommendations: [] as Array<{
          priority: string;
          category: string;
          description: string;
          action: string;
        }>
      };

      // Add recommendations based on gaps
      if (mappingStatus.attributes_with_broken_flow && mappingStatus.attributes_with_broken_flow.length > 0) {
        report.recommendations.push({
          priority: 'HIGH',
          category: 'Broken Data Flow',
          description: `${mappingStatus.attributes_with_broken_flow.length} attributes are not flowing to the semantic model`,
          action: 'Create measures that consume these attributes or map them to existing DAX measures'
        });
      }

      if (mappingStatus.unimplemented_measures && mappingStatus.unimplemented_measures.length > 0) {
        report.recommendations.push({
          priority: 'HIGH',
          category: 'Missing DAX Implementation',
          description: `${mappingStatus.unimplemented_measures.length} business measures have no DAX implementation`,
          action: 'Implement these measures as DAX in the semantic model'
        });
      }

      if (mappingStatus.orphaned_attributes.length > 0) {
        report.recommendations.push({
          priority: 'MEDIUM',
          category: 'Unused Attributes',
          description: `${mappingStatus.orphaned_attributes.length} attributes are not used by any measure`,
          action: 'Either create measures using these attributes or consider if they are needed'
        });
      }

      // Create and download JSON file
      const dataStr = JSON.stringify(report, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gap-analysis-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Gap analysis report exported successfully!', {
        duration: 4000,
        icon: '📥',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Data Flow Gap Analysis</h2>
        <p className="text-gray-600 mt-1">
          Track the completeness of your data lineage: Attributes → Measures → Semantic Model
        </p>
      </div>

      {/* AI-Powered Insights Placeholder */}
      {aiSuggestions.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">AI-Powered Gap Suggestions</h3>
              <div className="space-y-2">
                {aiSuggestions.map((suggestion, idx) => (
                  <div key={idx} className="text-sm text-gray-700 bg-white rounded p-3 border border-purple-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        suggestion.priority === 'high' ? 'bg-red-100 text-red-700' :
                        suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {suggestion.priority.toUpperCase()}
                      </span>
                      <span className="font-medium">{suggestion.description}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{suggestion.suggested_action}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* A. Data Flow Completeness Overview */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Data Flow Health</h3>
            <p className="text-sm text-gray-600 mt-1">
              Overall completeness of attribute-to-semantic-model traceability
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-blue-600">{overallHealth}%</div>
            <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
              <TrendingUp className="w-4 h-4" />
              {overallHealth >= 80 ? 'Excellent' : overallHealth >= 50 ? 'Good progress' : 'Needs work'}
            </div>
          </div>
        </div>

        {/* Visual Flow Diagram */}
        <div className="bg-white rounded-lg p-4 mt-4">
          <div className="flex items-center justify-between">
            {/* Attributes */}
            <div className="flex-1 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 border-2 border-green-500 mb-2">
                <Eye className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-sm font-semibold text-gray-700">Attributes</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{totalAttributes}</div>
              <div className="text-xs text-gray-500 mt-1">Data sources</div>
            </div>

            <div className="flex flex-col items-center px-4">
              <ArrowRight className="w-6 h-6 text-gray-400" />
              <div className="text-xs font-medium text-gray-500 mt-1">
                {attributeUsagePercent}%
              </div>
            </div>

            {/* Measures */}
            <div className="flex-1 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 border-2 border-purple-500 mb-2">
                <Calculator className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-sm font-semibold text-gray-700">Measures</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{totalBusinessMeasures}</div>
              <div className="text-xs text-gray-500 mt-1">Business logic</div>
            </div>

            <div className="flex flex-col items-center px-4">
              <ArrowRight className="w-6 h-6 text-gray-400" />
              <div className="text-xs font-medium text-gray-500 mt-1">
                {measureImplementationPercent}%
              </div>
            </div>

            {/* Semantic Model */}
            <div className="flex-1 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 border-2 border-blue-500 mb-2">
                <Database className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-sm font-semibold text-gray-700">Semantic Model</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{implementedMeasures}</div>
              <div className="text-xs text-gray-500 mt-1">DAX measures</div>
            </div>
          </div>

          {/* Complete Flow Indicator */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Complete Data Flow</span>
              <span className="text-sm font-bold text-gray-900">{completeFlowPercent}%</span>
            </div>
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 via-purple-500 to-blue-500 h-full transition-all duration-500"
                style={{ width: `${completeFlowPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {attributesWithCompleteFlow} of {totalAttributes} attributes flow all the way to Power BI reports
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* B. Attribute Coverage */}
        <div className="bg-white border rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-700 flex items-center gap-2">
              <Eye className="w-5 h-5 text-green-500" />
              Attribute Coverage
            </h4>
            <div className={`${
              mappingStatus.orphaned_attributes.length === 0 ? 'text-green-500' : 'text-yellow-500'
            }`}>
              {mappingStatus.orphaned_attributes.length === 0 ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Attributes</span>
              <span className="font-medium">{totalAttributes}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-green-600">Used by Measures</span>
              <span className="font-medium text-green-700">{attributesUsed}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-red-600">Orphaned</span>
              <span className="font-medium text-red-700">{mappingStatus.orphaned_attributes.length}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Usage Rate</span>
              <span className="text-sm font-bold text-gray-900">{attributeUsagePercent}%</span>
            </div>
            <div className="mt-1 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-green-500 h-full transition-all"
                style={{ width: `${attributeUsagePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* C. Measure Implementation */}
        <div className="bg-white border rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-700 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-purple-500" />
              Measure Implementation
            </h4>
            <div className={`${
              measureImplementationPercent === 100 ? 'text-green-500' : 'text-yellow-500'
            }`}>
              {measureImplementationPercent === 100 ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Measures</span>
              <span className="font-medium">{totalBusinessMeasures}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-green-600">With DAX</span>
              <span className="font-medium text-green-700">{implementedMeasures}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-red-600">Without DAX</span>
              <span className="font-medium text-red-700">
                {totalBusinessMeasures - implementedMeasures}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Implementation</span>
              <span className="text-sm font-bold text-gray-900">{measureImplementationPercent}%</span>
            </div>
            <div className="mt-1 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-purple-500 h-full transition-all"
                style={{ width: `${measureImplementationPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* D. Semantic Model Coverage */}
        <div className="bg-white border rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-700 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              Semantic Model
            </h4>
            <div className="text-blue-500">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Tables</span>
              <span className="font-medium">{totalSemanticTables}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-green-600">With Measures</span>
              <span className="font-medium text-green-700">{semanticTablesWithMeasures}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Dimensions</span>
              <span className="font-medium text-gray-700">
                {totalSemanticTables - semanticTablesWithMeasures}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">DAX Coverage</span>
              <span className="text-sm font-bold text-gray-900">
                {totalSemanticTables > 0
                  ? Math.round((semanticTablesWithMeasures / totalSemanticTables) * 100)
                  : 0}%
              </span>
            </div>
            <div className="mt-1 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all"
                style={{
                  width: `${totalSemanticTables > 0
                    ? Math.round((semanticTablesWithMeasures / totalSemanticTables) * 100)
                    : 0}%`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* E. Critical Gaps */}
      {((mappingStatus.attributes_with_broken_flow && mappingStatus.attributes_with_broken_flow.length > 0) ||
        (mappingStatus.unimplemented_measures && mappingStatus.unimplemented_measures.length > 0) ||
        mappingStatus.orphaned_attributes.length > 0) && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            Critical Gaps - Action Required
          </h3>
          <p className="text-sm text-gray-700 mb-4">
            These gaps break the data lineage chain and prevent attributes from flowing to Power BI reports.
          </p>

          <div className="space-y-4">
            {/* Attributes with Broken Flow */}
            {mappingStatus.attributes_with_broken_flow && mappingStatus.attributes_with_broken_flow.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-red-300">
                <h4 className="text-sm font-medium text-red-900 mb-2 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  Attributes Not Reaching Semantic Model ({mappingStatus.attributes_with_broken_flow.length})
                </h4>
                <p className="text-xs text-gray-600 mb-3">
                  These attributes are not used by any implemented DAX measure
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {mappingStatus.attributes_with_broken_flow.map((obs) => (
                    <div
                      key={obs}
                      className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded text-sm"
                    >
                      <span className="font-mono text-red-800">{obs}</span>
                      <button
                        onClick={() => handleCreateMeasure(obs)}
                        className="text-red-700 hover:text-red-900 font-medium hover:underline transition-all"
                      >
                        Create Measure →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Measures Without DAX */}
            {mappingStatus.unimplemented_measures && mappingStatus.unimplemented_measures.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-red-300">
                <h4 className="text-sm font-medium text-red-900 mb-2 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-red-600" />
                  Business Measures Not Implemented in DAX ({mappingStatus.unimplemented_measures.length})
                </h4>
                <p className="text-xs text-gray-600 mb-3">
                  These measures are used by the business but have no DAX implementation
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {mappingStatus.unimplemented_measures.slice(0, 10).map((measureName) => (
                    <div
                      key={measureName}
                      className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded text-sm"
                    >
                      <span className="font-mono text-red-800">{measureName}</span>
                      <button
                        onClick={() => handleImplementDAX(measureName)}
                        className="text-red-700 hover:text-red-900 font-medium hover:underline transition-all"
                      >
                        Implement DAX →
                      </button>
                    </div>
                  ))}
                  {mappingStatus.unimplemented_measures.length > 10 && (
                    <div className="text-xs text-gray-500 text-center pt-2">
                      ... and {mappingStatus.unimplemented_measures.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Orphaned Attributes */}
            {mappingStatus.orphaned_attributes.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-yellow-300">
                <h4 className="text-sm font-medium text-yellow-900 mb-2 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-yellow-600" />
                  Orphaned Attributes ({mappingStatus.orphaned_attributes.length})
                </h4>
                <p className="text-xs text-gray-600 mb-3">
                  These attributes are not used by any measure
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {mappingStatus.orphaned_attributes.map((obs) => (
                    <div
                      key={obs}
                      className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded text-sm"
                    >
                      <span className="font-mono text-yellow-800">{obs}</span>
                      <button
                        onClick={() => handleLinkToMeasure(obs)}
                        className="text-yellow-700 hover:text-yellow-900 font-medium hover:underline transition-all"
                      >
                        Link to Measure →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Message */}
      {(!mappingStatus.attributes_with_broken_flow || mappingStatus.attributes_with_broken_flow.length === 0) &&
        mappingStatus.orphaned_attributes.length === 0 &&
        (!mappingStatus.unimplemented_measures || mappingStatus.unimplemented_measures.length === 0) && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            Excellent Data Flow Health!
          </h3>
          <p className="text-sm text-green-700">
            All attributes have a complete path to the semantic model. Your data lineage is fully traceable.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleAutoFix}
          disabled={isAutoFixing}
          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Wand2 className="w-5 h-5" />
          {isAutoFixing ? 'Analyzing...' : 'Auto-Fix Broken Flows'}
        </button>
        <button
          onClick={handleExportReport}
          disabled={isExporting}
          className="flex-1 bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          {isExporting ? 'Exporting...' : 'Export Gap Report'}
        </button>
      </div>
    </div>
  );
}
