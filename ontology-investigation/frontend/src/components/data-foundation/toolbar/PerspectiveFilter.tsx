import { useDataFoundationStore } from '../hooks/useDataFoundationStore';

interface PerspectivePill {
  id: string | null;
  label: string;
  activeClass: string;
  inactiveClass: string;
}

const pills: PerspectivePill[] = [
  {
    id: null,
    label: 'All',
    activeClass: 'bg-gray-800 text-white',
    inactiveClass: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
  },
  {
    id: 'operational',
    label: 'Operational',
    activeClass: 'bg-green-600 text-white',
    inactiveClass: 'bg-green-50 text-green-700 hover:bg-green-100',
  },
  {
    id: 'management',
    label: 'Management',
    activeClass: 'bg-yellow-500 text-white',
    inactiveClass: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100',
  },
  {
    id: 'financial',
    label: 'Financial',
    activeClass: 'bg-blue-600 text-white',
    inactiveClass: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
  },
];

export function PerspectiveFilter() {
  const perspectiveFilter = useDataFoundationStore((s) => s.perspectiveFilter);
  const setPerspectiveFilter = useDataFoundationStore((s) => s.setPerspectiveFilter);

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-500 mr-1">Filter:</span>
      {pills.map((pill) => (
        <button
          key={pill.id ?? 'all'}
          onClick={() => setPerspectiveFilter(pill.id)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            perspectiveFilter === pill.id ? pill.activeClass : pill.inactiveClass
          }`}
        >
          {pill.label}
        </button>
      ))}
    </div>
  );
}
