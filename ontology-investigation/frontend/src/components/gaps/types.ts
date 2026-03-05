import type { ProcessStep, GapType, GapItem, GapAnalysisData } from '../../types/ontology';

export interface EfficiencyMetrics {
  totalSteps: number;
  avgManualEffort: number;
  totalManualHours: number;
  estimatedMonthlyCost: number;
  automationOpportunities: ProcessStep[];
  systemSwitchingCount: number;
}

export const GAP_TYPES: GapType[] = ['missing_supply', 'unused_supply', 'shadow_system', 'high_manual_effort'];

export function colorClasses(color: string) {
  const map: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100' },
  };
  return map[color] || map.red;
}

export type { GapType, GapItem, GapAnalysisData, ProcessStep };
