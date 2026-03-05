import { useDataFoundationStore, type ViewMode } from '../hooks/useDataFoundationStore';

const modes: { value: ViewMode; label: string }[] = [
  { value: 'table', label: 'Table' },
  { value: 'schema', label: 'Schema' },
  { value: 'lineage', label: 'Lineage' },
];

export function ViewModeToggle() {
  const viewMode = useDataFoundationStore((s) => s.viewMode);
  const setViewMode = useDataFoundationStore((s) => s.setViewMode);

  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
      {modes.map((mode) => (
        <button
          key={mode.value}
          onClick={() => setViewMode(mode.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === mode.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
