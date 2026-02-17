import { ArrowRight, Factory, BarChart3, DollarSign } from 'lucide-react';
import { usePerspectives } from '../hooks/useOntology';

const perspectiveConfig: Record<string, {
  icon: typeof Factory;
  bg: string;
  border: string;
  text: string;
  defaultConcern: string;
}> = {
  operational: {
    icon: Factory,
    bg: 'bg-green-50',
    border: 'border-green-300',
    text: 'text-green-800',
    defaultConcern: 'What work is being done?',
  },
  management: {
    icon: BarChart3,
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    text: 'text-yellow-800',
    defaultConcern: 'How are we performing?',
  },
  financial: {
    icon: DollarSign,
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-800',
    defaultConcern: "What's the financial position?",
  },
};

const perspectiveOrder = ['operational', 'management', 'financial'];

export function PerspectiveFlowHeader() {
  const { data: perspectives, isLoading } = usePerspectives();

  if (isLoading) {
    return (
      <div className="px-6 py-3 bg-white border-b flex items-center gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-10 w-48 bg-gray-100 animate-pulse rounded-lg"></div>
            {i < 3 && <ArrowRight className="w-4 h-4 text-gray-300" />}
          </div>
        ))}
      </div>
    );
  }

  // Build perspective map from data (with fallback to defaults)
  const perspectiveMap = new Map(
    (perspectives || []).map(p => [p.id, p])
  );

  return (
    <div className="px-6 py-3 bg-white border-b">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2">Value Flow:</span>
        {perspectiveOrder.map((pid, index) => {
          const perspective = perspectiveMap.get(pid);
          const config = perspectiveConfig[pid];
          if (!config) return null;

          const Icon = config.icon;
          const concern = perspective?.primary_concern || config.defaultConcern;

          return (
            <div key={pid} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.bg} ${config.border}`}>
                <Icon className={`w-4 h-4 ${config.text}`} />
                <div>
                  <div className={`text-sm font-semibold ${config.text}`}>
                    {perspective?.name || pid.charAt(0).toUpperCase() + pid.slice(1)}
                  </div>
                  <div className="text-xs text-gray-500">{concern}</div>
                </div>
              </div>
              {index < perspectiveOrder.length - 1 && (
                <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              )}
            </div>
          );
        })}
        <div className="ml-auto text-xs text-gray-400 italic">
          Data flows up from operations, requirements flow down from finance
        </div>
      </div>
    </div>
  );
}
