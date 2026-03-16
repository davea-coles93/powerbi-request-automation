import { X } from 'lucide-react';
import { useCanvasStore } from '../hooks/useCanvasStore';

interface InspectorPanelProps {
  children: React.ReactNode;
  title?: string;
}

export function InspectorPanel({ children, title }: InspectorPanelProps) {
  const inspectorOpen = useCanvasStore((s) => s.inspectorOpen);
  const selectedStep = useCanvasStore((s) => s.selectedStep);
  const selectedHandoff = useCanvasStore((s) => s.selectedHandoff);
  const selectedStepIds = useCanvasStore((s) => s.selectedStepIds);
  const closeInspector = useCanvasStore((s) => s.closeInspector);

  // Don't render at all when nothing is selected (prevents empty "Inspector" panel)
  const hasContent = selectedStep || selectedHandoff || selectedStepIds.size > 0;
  const isVisible = inspectorOpen && hasContent;

  return (
    <div
      className={`absolute top-0 right-0 h-full w-[400px] bg-white border-l border-gray-200 shadow-xl z-20 flex flex-col transition-transform duration-200 ease-out ${
        isVisible ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm">
        <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">
          {title || 'Inspector'}
        </h3>
        <button
          onClick={closeInspector}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          aria-label="Close inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
