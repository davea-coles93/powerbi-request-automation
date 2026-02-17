import { useEffect, useState } from 'react';
import { X, Lock, ArrowRight, Clock, Server } from 'lucide-react';
import { useStepFullLineage } from '../hooks/useOntology';

interface StepLineageDrawerProps {
  stepId: string;
  onClose: () => void;
}

const perspectiveBadgeColors: Record<string, { bg: string; text: string }> = {
  operational: { bg: 'bg-green-100', text: 'text-green-700' },
  management: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  financial: { bg: 'bg-blue-100', text: 'text-blue-700' },
};

function getManualEffortColor(pct: number): string {
  if (pct > 80) return 'bg-red-500';
  if (pct > 60) return 'bg-orange-500';
  if (pct > 40) return 'bg-yellow-500';
  return 'bg-green-500';
}

function getManualEffortTextColor(pct: number): string {
  if (pct > 80) return 'text-red-600';
  if (pct > 60) return 'text-orange-600';
  if (pct > 40) return 'text-yellow-600';
  return 'text-green-600';
}

export function StepLineageDrawer({ stepId, onClose }: StepLineageDrawerProps) {
  const { data: lineage, isLoading } = useStepFullLineage(stepId);
  const [visible, setVisible] = useState(false);

  // Animate in
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const step = lineage?.step;
  const perspectiveId = step?.perspective_id || '';
  const badge = perspectiveBadgeColors[perspectiveId] || { bg: 'bg-gray-100', text: 'text-gray-700' };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-200 z-40 ${
          visible ? 'opacity-30' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-[500px] bg-white shadow-xl z-50 transform transition-transform duration-200 ease-out overflow-y-auto ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading lineage data...</div>
          </div>
        ) : !lineage || !step ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">No lineage data available for this step.</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 truncate">{step.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                      {perspectiveId}
                    </span>
                    {step.actor && (
                      <span className="text-sm text-gray-600">{step.actor}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="ml-4 p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 space-y-6">
              {/* Step Details */}
              <section>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Step Details</h3>
                <div className="space-y-3">
                  {step.estimated_duration_minutes != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        <Clock className="w-4 h-4" /> Duration
                      </span>
                      <span className="text-sm font-medium">{step.estimated_duration_minutes} minutes</span>
                    </div>
                  )}

                  {step.manual_effort_percentage != null && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">Manual Effort</span>
                        <span className={`text-sm font-semibold ${getManualEffortTextColor(step.manual_effort_percentage)}`}>
                          {step.manual_effort_percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getManualEffortColor(step.manual_effort_percentage)}`}
                          style={{ width: `${step.manual_effort_percentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {step.automation_potential && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Automation Potential</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        step.automation_potential === 'High' ? 'bg-green-100 text-green-700' :
                        step.automation_potential === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                        step.automation_potential === 'Low' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {step.automation_potential}
                      </span>
                    </div>
                  )}

                  {step.waste_category && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Waste Category</span>
                      <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs font-medium">
                        {step.waste_category}
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* Data Flow */}
              {(lineage.consumes_attributes?.length > 0 ||
                lineage.produces_attributes?.length > 0 ||
                lineage.crystallizes_attributes?.length > 0) && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Data Flow</h3>
                  <div className="space-y-3">
                    {lineage.consumes_attributes?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Consumes</p>
                        <div className="flex flex-wrap gap-1">
                          {lineage.consumes_attributes.map((obs: any) => (
                            <span key={obs.id} className="px-2 py-1 bg-gray-100 text-indigo-700 rounded text-xs font-medium">
                              {obs.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {lineage.produces_attributes?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Produces</p>
                        <div className="flex flex-wrap gap-1">
                          {lineage.produces_attributes.map((obs: any) => (
                            <span key={obs.id} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                              {obs.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {lineage.crystallizes_attributes?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Crystallizes
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {lineage.crystallizes_attributes.map((obs: any) => (
                            <span key={obs.id} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              {obs.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Business Impact Chain */}
              {(lineage.attributes_feed_measures?.length > 0 ||
                lineage.measures_calculate_metrics?.length > 0) && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Business Impact Chain</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {/* Produced attributes */}
                    {lineage.produces_attributes?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Attributes produced</p>
                        <div className="flex flex-wrap gap-1">
                          {lineage.produces_attributes.map((obs: any) => (
                            <span key={obs.id} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                              {obs.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {lineage.attributes_feed_measures?.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <ArrowRight className="w-3 h-3" />
                          <span>feed into</span>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Measures</p>
                          <div className="flex flex-wrap gap-1">
                            {lineage.attributes_feed_measures.map((m: any) => (
                              <span key={m.id} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                                {m.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {lineage.measures_calculate_metrics?.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <ArrowRight className="w-3 h-3" />
                          <span>which calculate</span>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Metrics</p>
                          <div className="space-y-2">
                            {lineage.measures_calculate_metrics.map((metric: any) => (
                              <div key={metric.id} className="px-2 py-1.5 bg-green-100 text-green-800 rounded text-xs">
                                <span className="font-medium">{metric.name}</span>
                                {metric.business_question && (
                                  <p className="text-green-600 mt-0.5">{metric.business_question}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </section>
              )}

              {/* Waste Analysis */}
              {lineage.waste_analysis && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Waste Analysis</h3>
                  <div className="bg-orange-50 rounded-lg p-4 space-y-2 text-sm">
                    {lineage.waste_analysis.potential_time_savings_minutes > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Potential Time Savings</span>
                        <span className="font-semibold text-orange-700">
                          {lineage.waste_analysis.potential_time_savings_minutes} min/cycle
                        </span>
                      </div>
                    )}

                    {lineage.measures_calculate_metrics?.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Feeds</span>
                        <span className="font-medium">
                          {lineage.measures_calculate_metrics.length} metric{lineage.measures_calculate_metrics.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    {lineage.measures_calculate_metrics?.length > 0 && (
                      <div className="pt-2 border-t border-orange-200">
                        <p className="text-xs font-medium text-gray-500 mb-1">Business questions answered:</p>
                        <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
                          {lineage.measures_calculate_metrics
                            .filter((m: any) => m.business_question)
                            .map((m: any) => (
                              <li key={m.id}>{m.business_question}</li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Systems Used */}
              {lineage.systems_used?.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Systems Used</h3>
                  <div className="flex flex-wrap gap-2">
                    {lineage.systems_used.map((sys: any) => (
                      <span
                        key={sys.id}
                        className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium flex items-center gap-1"
                      >
                        <Server className="w-3 h-3" />
                        {sys.name}
                        {sys.type && (
                          <span className="text-slate-400 ml-1">({sys.type})</span>
                        )}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
