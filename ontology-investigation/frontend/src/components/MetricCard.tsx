import { ChevronRight, HelpCircle } from 'lucide-react';
import type { Metric } from '../types/ontology';

interface MetricCardProps {
  metric: Metric;
  onClick: () => void;
}

export function MetricCard({ metric, onClick }: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{metric.name}</h3>
          <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
            <HelpCircle className="w-4 h-4" />
            <span>{metric.business_question}</span>
          </div>
          {metric.description && (
            <p className="text-sm text-gray-600 mt-2">{metric.description}</p>
          )}
          <div className="flex gap-2 mt-3">
            {metric.perspective_ids.map((pid) => (
              <span
                key={pid}
                className={`px-2 py-1 text-xs rounded-full ${
                  pid === 'operational'
                    ? 'bg-operational-100 text-operational-700'
                    : pid === 'management'
                    ? 'bg-management-100 text-management-700'
                    : 'bg-financial-100 text-financial-700'
                }`}
              >
                {pid}
              </span>
            ))}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
    </div>
  );
}
