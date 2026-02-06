import { useState } from 'react';
import { useScenarioStatus, useLoadScenario } from '../hooks/useOntology';

export function ScenarioSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: status, isLoading } = useScenarioStatus();
  const loadScenario = useLoadScenario();

  const handleScenarioSelect = async (scenarioId: string) => {
    if (scenarioId === status?.current_scenario) {
      setIsOpen(false);
      return;
    }

    try {
      await loadScenario.mutateAsync(scenarioId);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to load scenario:', error);
    }
  };

  if (isLoading || !status) {
    return null;
  }

  const currentScenario = status.available_scenarios.find(s => s.id === status.current_scenario);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
        disabled={loadScenario.isPending}
      >
        <span className="text-lg">{currentScenario?.icon || '🏭'}</span>
        <div className="flex flex-col items-start">
          <span className="text-xs text-gray-500 font-medium">Scenario</span>
          <span className="text-sm font-semibold text-gray-900">
            {currentScenario?.name || 'Select Scenario'}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 mb-1">Select Scenario</h3>
              <p className="text-xs text-gray-600">
                Choose a scenario to explore different business contexts
              </p>
            </div>

            <div className="p-2 max-h-96 overflow-y-auto">
              {status.available_scenarios.map((scenario) => {
                const isCurrent = scenario.id === status.current_scenario;
                const isLoading = loadScenario.isPending;

                return (
                  <button
                    key={scenario.id}
                    onClick={() => handleScenarioSelect(scenario.id)}
                    disabled={isLoading}
                    className={`w-full text-left p-4 rounded-lg transition-all duration-200 ${
                      isCurrent
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                        : 'hover:bg-gray-50 text-gray-900'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{scenario.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{scenario.name}</span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 text-xs bg-white/20 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        <p className={`text-sm ${isCurrent ? 'text-white/90' : 'text-gray-600'}`}>
                          {scenario.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {loadScenario.isPending && (
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                <span className="text-sm text-gray-600">Loading scenario...</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
