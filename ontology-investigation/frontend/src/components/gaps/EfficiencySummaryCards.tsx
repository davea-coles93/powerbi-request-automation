import { Activity, AlertTriangle, Clock, DollarSign } from 'lucide-react';
import type { EfficiencyMetrics } from './types';

interface EfficiencySummaryCardsProps {
  efficiency: EfficiencyMetrics;
}

export function EfficiencySummaryCards({ efficiency }: EfficiencySummaryCardsProps) {
  if (efficiency.totalSteps === 0) return null;

  const cards = [
    {
      label: 'Total Process Steps',
      value: String(efficiency.totalSteps),
      icon: Activity,
      iconColor: 'text-blue-500',
    },
    {
      label: 'Avg Manual Effort',
      value: `${efficiency.avgManualEffort.toFixed(1)}%`,
      icon: AlertTriangle,
      iconColor: 'text-orange-500',
    },
    {
      label: 'Manual Hours/Month',
      value: efficiency.totalManualHours.toFixed(1),
      icon: Clock,
      iconColor: 'text-purple-500',
    },
    {
      label: 'Est. Monthly Cost',
      value: `$${efficiency.estimatedMonthlyCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      iconColor: 'text-green-500',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, iconColor }) => (
        <div key={label} className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
            <Icon className={`w-8 h-8 ${iconColor}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
