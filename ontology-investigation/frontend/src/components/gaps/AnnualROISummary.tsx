import type { ProcessStep } from './types';

interface AnnualROISummaryProps {
  opportunities: ProcessStep[];
  hourlyRate: number;
}

export function AnnualROISummary({ opportunities, hourlyRate }: AnnualROISummaryProps) {
  if (opportunities.length === 0) return null;

  const annualSavings = opportunities.slice(0, 8).reduce((sum, step) => {
    const manualHours =
      ((step.estimated_duration_minutes || 0) / 60) *
      ((step.manual_effort_percentage || 0) / 100);
    return sum + manualHours * hourlyRate * 0.8 * 12;
  }, 0);

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Potential Annual Savings</h3>
          <p className="text-sm text-gray-600">
            If top {Math.min(opportunities.length, 8)} automation opportunities are implemented
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-green-600">
            ${annualSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-sm text-gray-600 mt-1">per year</p>
        </div>
      </div>
    </div>
  );
}
