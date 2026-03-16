import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import type { ProcessStep } from './types';

interface AnnualROISummaryProps {
  opportunities: ProcessStep[];
  hourlyRate: number;
  automationFactor?: number;
}

export function AnnualROISummary({ opportunities, hourlyRate, automationFactor = 0.8 }: AnnualROISummaryProps) {
  const [showAnnual, setShowAnnual] = useState(true);

  if (opportunities.length === 0) return null;

  const totalManualHours = opportunities.reduce((sum, step) => {
    const manualHours =
      ((step.estimated_duration_minutes || 0) / 60) *
      ((step.manual_effort_percentage || 0) / 100);
    return sum + manualHours;
  }, 0);

  const monthlySavings = totalManualHours * hourlyRate * automationFactor;
  const annualSavings = monthlySavings * 12;
  const displaySavings = showAnnual ? annualSavings : monthlySavings;

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Potential Savings</h3>
            <p className="text-sm text-gray-600">
              Across {opportunities.length} automation {opportunities.length === 1 ? 'opportunity' : 'opportunities'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-green-600">
            ${displaySavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <button
              onClick={() => setShowAnnual(false)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                !showAnnual ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setShowAnnual(true)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                showAnnual ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Annual
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-green-200/50">
        <div>
          <p className="text-xs text-gray-500">Manual Hours/Month</p>
          <p className="text-sm font-semibold text-gray-900">{totalManualHours.toFixed(1)}h</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Cost Basis</p>
          <p className="text-sm font-semibold text-gray-900">${hourlyRate}/hr</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Automation Factor</p>
          <p className="text-sm font-semibold text-gray-900">{Math.round(automationFactor * 100)}%</p>
        </div>
      </div>
    </div>
  );
}
