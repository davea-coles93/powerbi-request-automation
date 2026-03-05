import { useDataFoundationStore, type ActiveView } from '../hooks/useDataFoundationStore';
import { useDataFoundationData } from '../hooks/useDataFoundationData';
import { useWorkshopSessions } from '../../../hooks/useOntology';

interface NavButton {
  view: ActiveView;
  label: string;
  icon: string;
  gradient: string;
  shadowColor: string;
}

const demandSignalButtons: NavButton[] = [
  {
    view: 'businessQuestions',
    label: 'Business Questions',
    icon: '\uD83C\uDFAF',
    gradient: 'from-purple-500 to-purple-600',
    shadowColor: 'shadow-purple-500/30',
  },
];

const insightButtons: NavButton[] = [
  {
    view: 'metrics',
    label: 'Metrics',
    icon: '\uD83D\uDCCA',
    gradient: 'from-blue-500 to-blue-600',
    shadowColor: 'shadow-blue-500/30',
  },
  {
    view: 'measures',
    label: 'Measures',
    icon: '\uD83E\uDDEE',
    gradient: 'from-blue-500 to-blue-600',
    shadowColor: 'shadow-blue-500/30',
  },
];

const sourceButtons: NavButton[] = [
  {
    view: 'attributes',
    label: 'Attributes',
    icon: '\uD83D\uDD37',
    gradient: 'from-blue-500 to-blue-600',
    shadowColor: 'shadow-blue-500/30',
  },
  {
    view: 'entities',
    label: 'Entities',
    icon: '\uD83C\uDFE2',
    gradient: 'from-blue-500 to-blue-600',
    shadowColor: 'shadow-blue-500/30',
  },
  {
    view: 'systems',
    label: 'Systems',
    icon: '\uD83D\uDCBB',
    gradient: 'from-blue-500 to-blue-600',
    shadowColor: 'shadow-blue-500/30',
  },
];

function SidebarButton({ button, isActive, count, onClick }: {
  button: NavButton;
  isActive: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-between ${
        isActive
          ? `bg-gradient-to-r ${button.gradient} text-white shadow-lg ${button.shadowColor}`
          : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
      }`}
    >
      <span className="flex items-center gap-2">
        <span className={isActive ? 'text-xl' : 'text-lg'}>{button.icon}</span>
        {button.label}
      </span>
      {count !== undefined && (
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            isActive ? 'bg-white/20' : 'bg-gray-200'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function NavigationSidebar() {
  const activeView = useDataFoundationStore((s) => s.activeView);
  const setActiveView = useDataFoundationStore((s) => s.setActiveView);
  const { metrics, measures, attributes, entities, systems } = useDataFoundationData();

  // Workshop session for business questions count
  const { data: allSessions } = useWorkshopSessions();
  const topDownSession = allSessions?.find((s) => s.session_type === 'top_down') ?? null;
  const businessQuestionsCount = topDownSession?.top_down_data?.metrics?.length;

  const getCount = (view: ActiveView): number | undefined => {
    switch (view) {
      case 'businessQuestions':
        return businessQuestionsCount;
      case 'metrics':
        return metrics?.length;
      case 'measures':
        return measures?.length;
      case 'attributes':
        return attributes?.length;
      case 'entities':
        return entities?.length;
      case 'systems':
        return systems?.length;
      default:
        return undefined;
    }
  };

  return (
    <div className="w-72 bg-white/80 backdrop-blur-sm border-r border-gray-200/80 flex flex-col overflow-y-auto shadow-lg">
      {/* Demand Signal Section */}
      <div className="p-6 pb-3">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <div className="h-1 w-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
          Demand Signal
        </h3>
        <nav className="space-y-2">
          {demandSignalButtons.map((button) => (
            <SidebarButton
              key={button.view}
              button={button}
              isActive={activeView === button.view}
              count={getCount(button.view)}
              onClick={() => setActiveView(button.view)}
            />
          ))}
        </nav>
      </div>

      {/* Insights Section */}
      <div className="p-6 pt-3 border-t border-gray-200/80">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <div className="h-1 w-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
          Insights
        </h3>
        <nav className="space-y-2">
          {insightButtons.map((button) => (
            <SidebarButton
              key={button.view}
              button={button}
              isActive={activeView === button.view}
              count={getCount(button.view)}
              onClick={() => setActiveView(button.view)}
            />
          ))}
        </nav>
      </div>

      {/* Sources Section */}
      <div className="p-6 border-t border-gray-200/80">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <div className="h-1 w-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" />
          Sources
        </h3>
        <nav className="space-y-2">
          {sourceButtons.map((button) => (
            <SidebarButton
              key={button.view}
              button={button}
              isActive={activeView === button.view}
              count={getCount(button.view)}
              onClick={() => setActiveView(button.view)}
            />
          ))}
        </nav>
      </div>

      {/* Info Panel */}
      <div className="mt-auto p-6 border-t border-gray-200/80 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-white text-lg">{'\uD83D\uDC8E'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 mb-1">Data Foundation</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              Tool-agnostic business ontology that represents your core semantics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
