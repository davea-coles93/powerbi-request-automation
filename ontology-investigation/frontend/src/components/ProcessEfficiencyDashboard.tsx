import { useMemo, useState, useEffect } from 'react';
import { useProcesses, useSystems, useAnalyzeProcesses } from '../hooks/useOntology';
import { ProcessStep } from '../types/ontology';
import {
  Clock,
  DollarSign,
  AlertTriangle,
  Zap,
  Activity,
  Sparkles,
  Loader2,
  GitBranch,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { StepLineageDrawer } from './StepLineageDrawer';
import { AutomationBadge } from './cells/AutomationBadge';
import { WasteCategoryTag } from './cells/WasteCategoryTag';
import { ManualEffortBar } from './cells/ManualEffortBar';

interface AIInsight {
  type: 'optimization' | 'automation' | 'consolidation';
  priority: 'high' | 'medium' | 'low';
  description: string;
  estimated_savings: string;
}

interface EfficiencyMetrics {
  totalSteps: number;
  avgManualEffort: number;
  totalManualHours: number;
  estimatedMonthlyCost: number;
  highWasteSteps: ProcessStep[];
  automationOpportunities: ProcessStep[];
  systemSwitchingCount: number;
  mostUsedSystems: { system: string; count: number }[];
}

interface WasteCategoryStats {
  category: string;
  count: number;
  avgManualEffort: number;
  totalEstimatedHours: number;
}

export function ProcessEfficiencyDashboard() {
  const { data: processes, isLoading: processesLoading } = useProcesses();
  const { data: systems, isLoading: systemsLoading } = useSystems();
  const [hourlyRate, setHourlyRate] = useState(75);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [lineageStepId, setLineageStepId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const analyzeProcesses = useAnalyzeProcesses();

  // Fetch AI process insights when processes are loaded
  useEffect(() => {
    if (!processes || processes.length === 0) return;
    setAiLoading(true);
    analyzeProcesses.mutateAsync()
      .then(data => {
        if (data?.insights) {
          setAiInsights(data.insights.map((i: any) => ({
            type: i.type === 'automation_opportunity' ? 'automation' :
                  i.type === 'system_switching' ? 'consolidation' : 'optimization',
            priority: i.priority,
            description: i.description,
            estimated_savings: i.estimated_savings || '',
          })));
        }
      })
      .catch(() => { /* silently fail */ })
      .finally(() => setAiLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processes]);

  const metrics = useMemo<EfficiencyMetrics>(() => {
    if (!processes || processes.length === 0) {
      return {
        totalSteps: 0,
        avgManualEffort: 0,
        totalManualHours: 0,
        estimatedMonthlyCost: 0,
        highWasteSteps: [],
        automationOpportunities: [],
        systemSwitchingCount: 0,
        mostUsedSystems: [],
      };
    }

    const allSteps: ProcessStep[] = processes.flatMap(p => p.steps);
    const totalSteps = allSteps.length;

    // Calculate manual effort statistics
    const stepsWithManualEffort = allSteps.filter(s => s.manual_effort_percentage !== undefined);
    const avgManualEffort = stepsWithManualEffort.length > 0
      ? stepsWithManualEffort.reduce((sum, s) => sum + (s.manual_effort_percentage || 0), 0) / stepsWithManualEffort.length
      : 0;

    // Calculate total manual hours (assuming monthly execution)
    const totalManualHours = allSteps.reduce((sum, step) => {
      const manualPct = step.manual_effort_percentage || 0;
      const durationHours = (step.estimated_duration_minutes || 0) / 60;
      return sum + (durationHours * manualPct / 100);
    }, 0);

    // Monthly cost estimate (assuming steps run monthly on average)
    const estimatedMonthlyCost = totalManualHours * hourlyRate;

    // High waste steps (>60% manual effort)
    const highWasteSteps = allSteps
      .filter(s => (s.manual_effort_percentage || 0) > 60)
      .sort((a, b) => (b.manual_effort_percentage || 0) - (a.manual_effort_percentage || 0));

    // Automation opportunities (High/Medium potential + High manual effort)
    const automationOpportunities = allSteps
      .filter(s =>
        (s.automation_potential === 'High' || s.automation_potential === 'Medium') &&
        (s.manual_effort_percentage || 0) > 50
      )
      .sort((a, b) => {
        const aScore = (a.manual_effort_percentage || 0) * (a.estimated_duration_minutes || 0);
        const bScore = (b.manual_effort_percentage || 0) * (b.estimated_duration_minutes || 0);
        return bScore - aScore;
      });

    // System switching analysis
    const stepsWithMultipleSystems = allSteps.filter(s =>
      s.systems_used_ids && s.systems_used_ids.length > 1
    );
    const systemSwitchingCount = stepsWithMultipleSystems.length;

    // Most used systems
    const systemUsageMap = new Map<string, number>();
    allSteps.forEach(step => {
      step.systems_used_ids?.forEach(sysId => {
        systemUsageMap.set(sysId, (systemUsageMap.get(sysId) || 0) + 1);
      });
    });
    const mostUsedSystems = Array.from(systemUsageMap.entries())
      .map(([system, count]) => ({ system, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalSteps,
      avgManualEffort,
      totalManualHours,
      estimatedMonthlyCost,
      highWasteSteps,
      automationOpportunities,
      systemSwitchingCount,
      mostUsedSystems,
    };
  }, [processes, hourlyRate]);

  const wasteCategoryStats = useMemo<WasteCategoryStats[]>(() => {
    if (!processes || processes.length === 0) return [];

    const categoryMap = new Map<string, { count: number; totalManualEffort: number; totalHours: number }>();

    processes.forEach(process => {
      process.steps.forEach(step => {
        if (step.waste_category) {
          const categories = step.waste_category.split(',').map(c => c.trim());
          categories.forEach(category => {
            const existing = categoryMap.get(category) || { count: 0, totalManualEffort: 0, totalHours: 0 };
            const manualHours = ((step.estimated_duration_minutes || 0) / 60) * ((step.manual_effort_percentage || 0) / 100);

            categoryMap.set(category, {
              count: existing.count + 1,
              totalManualEffort: existing.totalManualEffort + (step.manual_effort_percentage || 0),
              totalHours: existing.totalHours + manualHours,
            });
          });
        }
      });
    });

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        avgManualEffort: data.count > 0 ? data.totalManualEffort / data.count : 0,
        totalEstimatedHours: data.totalHours,
      }))
      .sort((a, b) => b.totalEstimatedHours - a.totalEstimatedHours);
  }, [processes]);

  const getSystemName = (systemId: string): string => {
    return systems?.find(s => s.id === systemId)?.name || systemId;
  };

  const getManualEffortColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-red-500';
    if (percentage >= 60) return 'bg-orange-500';
    if (percentage >= 40) return 'bg-yellow-500';
    if (percentage >= 20) return 'bg-blue-500';
    return 'bg-green-500';
  };

  if (processesLoading || systemsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!processes || processes.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Process Data</h3>
          <p className="text-gray-600">Load a scenario to view process efficiency metrics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Process Efficiency Dashboard</h2>
          <p className="text-gray-600 mt-1">Analyze waste, manual effort, and automation opportunities</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Hourly Rate:</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              className="pl-7 pr-3 py-2 border border-gray-300 rounded-lg w-24 text-sm"
              min="0"
              step="5"
            />
          </div>
        </div>
      </div>

      {/* AI Insights */}
      {aiLoading && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
            <span className="text-sm text-gray-600">Analyzing processes for insights...</span>
          </div>
        </div>
      )}
      {!aiLoading && aiInsights.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
          <button
            onClick={() => toggleSection('aiInsights')}
            className="w-full flex items-center gap-3 p-4 text-left hover:bg-purple-50/50 transition-colors rounded-lg"
          >
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900 flex-1">AI-Powered Insights</h3>
            <span className="text-xs text-gray-500">{aiInsights.length} insight{aiInsights.length !== 1 ? 's' : ''}</span>
            {collapsedSections.aiInsights ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {!collapsedSections.aiInsights && (
            <div className="px-4 pb-4 space-y-2 max-h-64 overflow-y-auto">
              {aiInsights.map((insight, idx) => (
                <div key={idx} className="text-sm text-gray-700 bg-white rounded p-2.5 border border-purple-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      insight.priority === 'high' ? 'bg-red-100 text-red-700' :
                      insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{insight.priority}</span>
                    <span className="font-medium">{insight.description}</span>
                  </div>
                  {insight.estimated_savings && (
                    <span className="text-xs text-gray-500">Est. savings: {insight.estimated_savings}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Process Steps</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.totalSteps}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Manual Effort</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.avgManualEffort.toFixed(1)}%</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Manual Hours/Month</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.totalManualHours.toFixed(1)}</p>
            </div>
            <Clock className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Est. Monthly Cost</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${metrics.estimatedMonthlyCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Waste Category Analysis */}
      {wasteCategoryStats.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <button
            onClick={() => toggleSection('waste')}
            className="w-full flex items-center justify-between p-6 pb-4 text-left hover:bg-gray-50 transition-colors rounded-t-lg"
          >
            <h3 className="text-lg font-semibold text-gray-900">Waste by Category</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{wasteCategoryStats.length} categor{wasteCategoryStats.length !== 1 ? 'ies' : 'y'}</span>
              {collapsedSections.waste ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
          </button>
          {!collapsedSections.waste && (
            <div className="px-6 pb-6 space-y-3">
              {wasteCategoryStats.map((stat) => (
                <div key={stat.category} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <WasteCategoryTag category={stat.category} />
                      <span className="text-sm text-gray-600">
                        {stat.count} step{stat.count !== 1 ? 's' : ''} · {stat.totalEstimatedHours.toFixed(1)}h/month ·
                        ${(stat.totalEstimatedHours * hourlyRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}/month
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getManualEffortColor(stat.avgManualEffort)}`}
                        style={{ width: `${stat.avgManualEffort}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* System Switching & High Waste */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200">
          <button
            onClick={() => toggleSection('systemSwitching')}
            className="w-full flex items-center justify-between p-6 pb-4 text-left hover:bg-gray-50 transition-colors rounded-t-lg"
          >
            <h3 className="text-lg font-semibold text-gray-900">System Switching Pain Points</h3>
            {collapsedSections.systemSwitching ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {!collapsedSections.systemSwitching && (
            <div className="px-6 pb-6">
              <div className="mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span>{metrics.systemSwitchingCount} steps require multiple systems</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 mb-2">Most Used Systems:</p>
                {metrics.mostUsedSystems.map((sys) => (
                  <div key={sys.system} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{getSystemName(sys.system)}</span>
                    <span className="text-gray-600">{sys.count} steps</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* High Waste Steps */}
        <div className="bg-white rounded-lg border border-gray-200">
          <button
            onClick={() => toggleSection('highWaste')}
            className="w-full flex items-center justify-between p-6 pb-4 text-left hover:bg-gray-50 transition-colors rounded-t-lg"
          >
            <h3 className="text-lg font-semibold text-gray-900">Highest Manual Effort Steps</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{metrics.highWasteSteps.length} steps</span>
              {collapsedSections.highWaste ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
          </button>
          {!collapsedSections.highWaste && (
            <div className="px-6 pb-6 space-y-3 max-h-64 overflow-y-auto">
              {metrics.highWasteSteps.slice(0, 10).map((step) => (
                <div key={step.id} className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{step.name}</p>
                    <div className="mt-1">
                      <WasteCategoryTag category={step.waste_category} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <AutomationBadge potential={step.automation_potential} />
                    <ManualEffortBar percentage={step.manual_effort_percentage} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Automation Opportunities - ROI Analysis */}
      <div className="bg-white rounded-lg border border-gray-200">
        <button
          onClick={() => toggleSection('automation')}
          className="w-full flex items-center justify-between p-6 pb-4 text-left hover:bg-gray-50 transition-colors rounded-t-lg"
        >
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-green-600" />
            Top Automation Opportunities (Ranked by ROI)
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{metrics.automationOpportunities.length} opportunities</span>
            {collapsedSections.automation ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </button>
        {!collapsedSections.automation && (
          <div className="px-6 pb-6 overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-200">
                  <th className="text-left text-sm font-medium text-gray-700 pb-2">Process Step</th>
                  <th className="text-center text-sm font-medium text-gray-700 pb-2">Manual %</th>
                  <th className="text-center text-sm font-medium text-gray-700 pb-2">Duration</th>
                  <th className="text-center text-sm font-medium text-gray-700 pb-2">Potential</th>
                  <th className="text-center text-sm font-medium text-gray-700 pb-2">Est. Savings/Month</th>
                  <th className="text-center text-sm font-medium text-gray-700 pb-2">Systems Used</th>
                  <th className="text-center text-sm font-medium text-gray-700 pb-2">Lineage</th>
                </tr>
              </thead>
              <tbody>
                {metrics.automationOpportunities.slice(0, 10).map((step) => {
                  const manualHours = ((step.estimated_duration_minutes || 0) / 60) * ((step.manual_effort_percentage || 0) / 100);
                  const monthlySavings = manualHours * hourlyRate * 0.8;

                  return (
                    <tr key={step.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 text-sm text-gray-900">{step.name}</td>
                      <td className="py-3 text-center">
                        <ManualEffortBar percentage={step.manual_effort_percentage} />
                      </td>
                      <td className="py-3 text-center text-sm text-gray-600">
                        {step.estimated_duration_minutes || 0}m
                      </td>
                      <td className="py-3 text-center">
                        <div className="flex items-center justify-center">
                          <AutomationBadge potential={step.automation_potential} />
                        </div>
                      </td>
                      <td className="py-3 text-center text-sm font-semibold text-green-600">
                        ${monthlySavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 text-center text-xs text-gray-600">
                        {step.systems_used_ids?.map(sId => getSystemName(sId)).join(', ') || 'None'}
                      </td>
                      <td className="py-3 text-center">
                        <button
                          onClick={() => setLineageStepId(step.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                          title="View full lineage"
                        >
                          <GitBranch className="w-3 h-3" />
                          Lineage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Annual ROI Summary */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Potential Annual Savings</h3>
            <p className="text-sm text-gray-600">
              If top {Math.min(metrics.automationOpportunities.length, 10)} automation opportunities are implemented (80% manual effort reduction)
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-green-600">
              ${(metrics.automationOpportunities.slice(0, 10).reduce((sum, step) => {
                const manualHours = ((step.estimated_duration_minutes || 0) / 60) * ((step.manual_effort_percentage || 0) / 100);
                return sum + (manualHours * hourlyRate * 0.8 * 12);
              }, 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-sm text-gray-600 mt-1">per year</p>
          </div>
        </div>
      </div>

      {/* Step Lineage Drawer */}
      {lineageStepId && (
        <StepLineageDrawer
          stepId={lineageStepId}
          onClose={() => setLineageStepId(null)}
        />
      )}
    </div>
  );
}
