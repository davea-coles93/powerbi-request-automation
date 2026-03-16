import type { OntologyState } from '../../types/ontology';

interface StateSelectorProps {
  value: OntologyState;
  onChange: (state: OntologyState) => void;
  label?: string;
}

const states: { key: OntologyState; label: string; color: string; activeColor: string }[] = [
  { key: 'as-is', label: 'As-Is', color: 'text-blue-600', activeColor: 'bg-blue-100 border-blue-300 text-blue-700' },
  { key: 'to-be', label: 'To-Be', color: 'text-amber-600', activeColor: 'bg-amber-100 border-amber-300 text-amber-700' },
];

export function StateSelector({ value, onChange, label = 'State' }: StateSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex gap-2">
        {states.map(({ key, label: stateLabel, activeColor }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
              value === key
                ? activeColor
                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {stateLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
