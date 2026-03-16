import { useState } from 'react';
import { Zap, ChevronDown, ChevronRight, GitBranch } from 'lucide-react';
import { AutomationBadge } from '../cells/AutomationBadge';
import { ManualEffortBar } from '../cells/ManualEffortBar';
import type { ProcessStep } from './types';

interface AutomationOpportunitiesProps {
  opportunities: ProcessStep[];
  hourlyRate: number;
  automationFactor?: number;
  onViewLineage: (stepId: string) => void;
}

export function AutomationOpportunities({
  opportunities,
  hourlyRate,
  automationFactor = 0.8,
  onViewLineage,
}: AutomationOpportunitiesProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (opportunities.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors rounded-t-lg"
      >
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Zap className="w-5 h-5 text-green-600" />
          Top Automation Opportunities
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{opportunities.length} opportunities</span>
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>
      {!collapsed && (
        <div className="px-4 pb-4 overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-gray-200">
                <th className="text-left text-sm font-medium text-gray-700 pb-2">Process Step</th>
                <th className="text-center text-sm font-medium text-gray-700 pb-2">Manual %</th>
                <th className="text-center text-sm font-medium text-gray-700 pb-2">Duration</th>
                <th className="text-center text-sm font-medium text-gray-700 pb-2">Potential</th>
                <th className="text-center text-sm font-medium text-gray-700 pb-2">Est. Savings/Mo</th>
                <th className="text-center text-sm font-medium text-gray-700 pb-2">Lineage</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((step) => {
                const manualHours =
                  ((step.estimated_duration_minutes || 0) / 60) *
                  ((step.manual_effort_percentage || 0) / 100);
                const monthlySavings = manualHours * hourlyRate * automationFactor;
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
                    <td className="py-3 text-center">
                      <button
                        onClick={() => onViewLineage(step.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
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
  );
}
