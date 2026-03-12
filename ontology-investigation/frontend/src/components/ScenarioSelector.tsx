import { useState, useRef } from 'react';
import { Trash2, Download, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useScenarioStatus, useLoadScenario, useClearWorkspace } from '../hooks/useOntology';
import { exportOntology, importOntology } from '../services/api';

export function ScenarioSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { data: status, isLoading } = useScenarioStatus();
  const loadScenario = useLoadScenario();
  const clearWorkspace = useClearWorkspace();

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

  const handleClearWorkspace = async () => {
    try {
      await clearWorkspace.mutateAsync();
      toast.success('Workspace cleared');
      setShowClearConfirm(false);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to clear workspace:', error);
      toast.error('Failed to clear workspace');
    }
  };

  const handleExport = async () => {
    try {
      await exportOntology();
      toast.success('Ontology exported');
    } catch (error) {
      console.error('Failed to export ontology:', error);
      toast.error('Failed to export ontology');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const result = await importOntology(file);
      toast.success(result.message);
      queryClient.invalidateQueries();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to import ontology:', error);
      toast.error('Failed to import ontology');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (isLoading || !status) {
    return null;
  }

  const currentScenario = status.available_scenarios.find(s => s.id === status.current_scenario);
  const isBusy = loadScenario.isPending || clearWorkspace.isPending || isImporting;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
        disabled={isBusy}
      >
        <span className="text-lg">{currentScenario?.icon || (status.current_scenario === null ? '📄' : '🏭')}</span>
        <div className="flex flex-col items-start">
          <span className="text-xs text-gray-500 font-medium">Scenario</span>
          <span className="text-sm font-semibold text-gray-900 max-w-[180px] truncate">
            {currentScenario?.name || (status.current_scenario === null ? 'Custom Workspace' : 'Select Scenario')}
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
            onClick={() => { setIsOpen(false); setShowClearConfirm(false); }}
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

                return (
                  <button
                    key={scenario.id}
                    onClick={() => handleScenarioSelect(scenario.id)}
                    disabled={isBusy}
                    className={`w-full text-left p-4 rounded-lg transition-all duration-200 ${
                      isCurrent
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                        : 'hover:bg-gray-50 text-gray-900'
                    } ${isBusy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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

              {/* Divider + Save / Restore */}
              <div className="my-2 border-t border-gray-200" />

              <button
                onClick={handleExport}
                disabled={isBusy}
                className="w-full text-left p-3 rounded-lg hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-colors flex items-center gap-3"
              >
                <Download className="w-4 h-4" />
                <div>
                  <span className="text-sm font-medium">Save Ontology</span>
                  <p className="text-xs text-gray-400">Export current state as JSON</p>
                </div>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy || isImporting}
                className="w-full text-left p-3 rounded-lg hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-colors flex items-center gap-3"
              >
                <Upload className="w-4 h-4" />
                <div>
                  <span className="text-sm font-medium">
                    {isImporting ? 'Importing...' : 'Restore Ontology'}
                  </span>
                  <p className="text-xs text-gray-400">Load from a saved JSON file</p>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportFile}
              />

              {/* Divider + Clear Workspace */}
              <div className="my-2 border-t border-gray-200" />

              {!showClearConfirm ? (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  disabled={isBusy}
                  className="w-full text-left p-3 rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-700 transition-colors flex items-center gap-3"
                >
                  <Trash2 className="w-4 h-4" />
                  <div>
                    <span className="text-sm font-medium">New Workspace</span>
                    <p className="text-xs text-gray-400">Clear all data and start fresh</p>
                  </div>
                </button>
              ) : (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs text-red-700 mb-2">
                    This will delete all data. The three default perspectives will be preserved.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleClearWorkspace}
                      disabled={isBusy}
                      className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                    >
                      {clearWorkspace.isPending ? 'Clearing...' : 'Clear Everything'}
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-3 py-1 text-xs font-medium text-gray-600 bg-white rounded border hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {isBusy && (
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                <span className="text-sm text-gray-600">
                  {clearWorkspace.isPending ? 'Clearing workspace...' : 'Loading scenario...'}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
