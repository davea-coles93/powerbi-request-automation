import type { ProcessStep, GapType, GapItem, GapAnalysisData } from '../../types/ontology';

export interface EfficiencyMetrics {
  totalSteps: number;
  avgManualEffort: number;
  totalManualHours: number;
  estimatedMonthlyCost: number;
  automationOpportunities: ProcessStep[];
  systemSwitchingCount: number;
}

export const GAP_TYPES: GapType[] = [
  'missing_supply',
  'unused_supply',
  'shadow_system',
  'high_manual_effort',
  'broken_lineage',
  'coverage_gap',
  'process_risk',
  'missing_crystallisation',
  'high_crystallisation_cost',
  'late_crystallisation',
];

export function colorClasses(color: string) {
  const map: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100' },
    teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', badge: 'bg-teal-100' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', badge: 'bg-indigo-100' },
    pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', badge: 'bg-pink-100' },
    cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', badge: 'bg-cyan-100' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100' },
  };
  return map[color] || map.red;
}

export type { GapType, GapItem, GapAnalysisData, ProcessStep };
