import { useMemo, useState } from 'react';
import { useProcesses, useSystems } from '../hooks/useOntology';
import { Process, ProcessStep } from '../types/ontology';
import {
  TrendingUp,
  Clock,
  DollarSign,
  AlertTriangle,
  Zap,
  XCircle,
  Activity,
  Sparkles
} from 'lucide-react';

// AI Hook placeholder for future integration
interface AIInsight {
  type: 'optimization' | 'automation' | 'consolidation';
  priority: 'high' | 'medium' | 'low';
  description: string;
  estimated_savings: number;
}

// AI Hook: This will be replaced with actual AI-powered analysis
const useAIProcessInsights = (_processes: Process[] | undefined): AIInsight[] => {
  // TODO: Implement AI-powered insights using Claude API
  // This hook will analyze process steps and suggest optimizations
  return [];
};

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
  const [hourlyRate, setHourlyRate] = useState(75); // Default hourly rate in USD

  // AI Hook for future insights
  const aiInsights = useAIProcessInsights(processes);

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

  const getAutomationPotentialIcon = (potential?: string) => {
    switch (potential) {
      case 'High': return <Zap className="w-4 h-4 text-green-600" />;
      case 'Medium': return <TrendingUp className="w-4 h-4 text-yellow-600" />;
      case 'Low': return <Activity className="w-4 h-4 text-gray-600" />;
      default: return <XCircle className="w-4 h-4 text-gray-400" />;
    }
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

      {/* AI Insights Placeholder */}
      {aiInsights.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">AI-Powered Insights</h3>
              <div className="space-y-2">
                {aiInsights.map((insight, idx) => (
                  <div key={idx} className="text-sm text-gray-700">
                    <span className="font-medium">{insight.description}</span>
                    <span className="text-gray-500 ml-2">
                      (Est. savings: ${insight.estimated_savings.toLocaleString()}/year)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Waste by Category</h3>
          <div className="space-y-3">
            {wasteCategoryStats.map((stat) => (
              <div key={stat.category} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{stat.category}</span>
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
        </div>
      )}

      {/* System Switching Analysis */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Switching Pain Points</h3>
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

        {/* High Waste Steps */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Highest Manual Effort Steps</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {metrics.highWasteSteps.slice(0, 10).map((step) => (
              <div key={step.id} className="flex items-start justify-between border-b border-gray-100 pb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{step.name}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {step.waste_category || 'No waste category specified'}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {getAutomationPotentialIcon(step.automation_potential)}
                  <span className="text-sm font-semibold text-gray-900">
                    {step.manual_effort_percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Automation Opportunities - ROI Analysis */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-green-600" />
          Top Automation Opportunities (Ranked by ROI)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-sm font-medium text-gray-700 pb-2">Process Step</th>
                <th className="text-center text-sm font-medium text-gray-700 pb-2">Manual %</th>
                <th className="text-center text-sm font-medium text-gray-700 pb-2">Duration</th>
                <th className="text-center text-sm font-medium text-gray-700 pb-2">Potential</th>
                <th className="text-center text-sm font-medium text-gray-700 pb-2">Est. Savings/Month</th>
                <th className="text-center text-sm font-medium text-gray-700 pb-2">Systems Used</th>
              </tr>
            </thead>
            <tbody>
              {metrics.automationOpportunities.slice(0, 10).map((step) => {
                const manualHours = ((step.estimated_duration_minutes || 0) / 60) * ((step.manual_effort_percentage || 0) / 100);
                const monthlySavings = manualHours * hourlyRate * 0.8; // Assume 80% reduction with automation

                return (
                  <tr key={step.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 text-sm text-gray-900">{step.name}</td>
                    <td className="py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium text-white ${getManualEffortColor(step.manual_effort_percentage || 0)}`}>
                        {step.manual_effort_percentage}%
                      </span>
                    </td>
                    <td className="py-3 text-center text-sm text-gray-600">
                      {step.estimated_duration_minutes || 0}m
                    </td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getAutomationPotentialIcon(step.automation_potential)}
                        <span className="text-xs text-gray-700">{step.automation_potential}</span>
                      </div>
                    </td>
                    <td className="py-3 text-center text-sm font-semibold text-green-600">
                      ${monthlySavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 text-center text-xs text-gray-600">
                      {step.systems_used_ids?.map(sId => getSystemName(sId)).join(', ') || 'None'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
    </div>
  );
}
