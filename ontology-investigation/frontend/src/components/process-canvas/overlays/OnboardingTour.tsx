import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  targetSelector?: string;
  position: 'center' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-left';
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to the Process Canvas',
    description:
      'This is your infinite canvas for mapping business processes. Nodes represent process steps, and edges show dependencies and data flow between them.',
    position: 'center',
  },
  {
    title: 'Click to Inspect',
    description:
      'Click any step node to open the inspector panel on the right. You\'ll see details like duration, automation potential, and waste category.',
    position: 'top-right',
  },
  {
    title: 'Connection Mode',
    description:
      'Use the Connect button in the toolbar to draw dependency edges between steps. Click a source step, then a target step to create a connection.',
    position: 'top-left',
  },
  {
    title: 'Search & Filter',
    description:
      'Use the search bar (Ctrl+F) to find steps by name, actor, or category. Non-matching nodes dim so you can focus on what matters.',
    position: 'top-left',
  },
  {
    title: 'Layout Modes',
    description:
      'Toggle between "Flow" (hierarchical) and "Free" (force-directed) layouts to see your process from different angles.',
    position: 'top-left',
  },
  {
    title: 'Command Palette',
    description:
      'Press Ctrl+K to open the command palette for quick access to any action — switch processes, change layouts, add steps, and more.',
    position: 'center',
  },
];

const STORAGE_KEY = 'process-canvas-tour-completed';

export function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  // Show tour prompt if not completed yet
  useEffect(() => {
    try {
      const completed = localStorage.getItem(STORAGE_KEY);
      if (!completed) {
        // Small delay so the canvas loads first
        const timer = setTimeout(() => setActive(true), 1500);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage unavailable, skip
    }
  }, []);

  const handleComplete = useCallback(() => {
    setActive(false);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  }, []);

  const handleNext = useCallback(() => {
    if (step < TOUR_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleComplete();
    }
  }, [step, handleComplete]);

  const handlePrev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  if (!active) return null;

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const isFirst = step === 0;

  const positionClasses: Record<string, string> = {
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    'top-right': 'top-20 right-8',
    'bottom-left': 'bottom-20 left-8',
    'bottom-right': 'bottom-20 right-8',
    'top-left': 'top-20 left-8',
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-[60]" />

      {/* Tour card */}
      <div
        className={`fixed z-[61] w-[400px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden ${positionClasses[current.position]}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">
              Step {step + 1} of {TOUR_STEPS.length}
            </span>
          </div>
          <button
            onClick={handleComplete}
            className="text-white/70 hover:text-white transition-colors"
            title="Skip tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          <h3 className="font-bold text-gray-900 text-lg mb-2">{current.title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{current.description}</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 px-5 pb-3">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? 'bg-purple-600' : i < step ? 'bg-purple-300' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={handlePrev}
            disabled={isFirst}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleComplete}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              {isLast ? 'Get Started' : 'Next'}
              {!isLast && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
