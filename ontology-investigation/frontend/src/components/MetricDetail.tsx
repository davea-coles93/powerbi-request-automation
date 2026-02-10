import { useMetricTrace } from '../hooks/useOntology';
import { X, ArrowRight, Database, Calculator, Activity, Server } from 'lucide-react';

interface MetricDetailProps {
  metricId: string;
  onClose: () => void;
}

export function MetricDetail({ metricId, onClose }: MetricDetailProps) {
  const { data: trace, isLoading } = useMetricTrace(metricId);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-4xl w-full max-h-[80vh] overflow-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-8" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!trace) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{trace.metric.name}</h2>
            <p className="text-gray-600 mt-1">{trace.metric.business_question}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lineage flow */}
        <div className="space-y-6">
          {/* Metric */}
          <div className="flex items-center gap-3">
            <div className="p-3 bg-financial-100 rounded-lg">
              <Activity className="w-6 h-6 text-financial-600" />
            </div>
            <div>
              <span className="text-sm text-gray-500">Metric</span>
              <h3 className="font-semibold">{trace.metric.name}</h3>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="w-5 h-5 text-gray-400 rotate-90" />
          </div>

          {/* Measures */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-700">Calculated by Measures</span>
            </div>
            <div className="grid gap-3 ml-7">
              {trace.measures.map((measure) => (
                <div key={measure.id} className="bg-gray-50 p-3 rounded-lg border">
                  <h4 className="font-medium">{measure.name}</h4>
                  {measure.logic && (
                    <p className="text-sm text-gray-600 mt-1">{measure.logic}</p>
                  )}
                  {measure.formula && (
                    <code className="text-xs bg-gray-200 px-2 py-1 rounded mt-2 inline-block">
                      {measure.formula}
                    </code>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="w-5 h-5 text-gray-400 rotate-90" />
          </div>

          {/* Attributes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-700">Sourced from Attributes</span>
            </div>
            <div className="grid gap-3 ml-7">
              {trace.attributes.map((attr) => (
                <div key={attr.id} className="bg-gray-50 p-3 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{attr.name}</h4>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        attr.reliability === 'High'
                          ? 'bg-green-100 text-green-700'
                          : attr.reliability === 'Medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {attr.reliability} reliability
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Source: {attr.source_actor} | {attr.volatility}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="w-5 h-5 text-gray-400 rotate-90" />
          </div>

          {/* Systems */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-700">Data from Systems</span>
            </div>
            <div className="flex gap-3 ml-7 flex-wrap">
              {trace.systems.map((system) => (
                <div
                  key={system.id}
                  className="bg-gray-50 px-4 py-2 rounded-lg border flex items-center gap-2"
                >
                  <span className="font-medium">{system.name}</span>
                  <span className="text-xs text-gray-500">({system.type})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
