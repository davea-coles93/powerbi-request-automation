import { useState } from 'react';
import { Check, ChevronDown, ChevronRight, Link, Sparkles } from 'lucide-react';
import type { WorkshopProposals } from '../../types/ontology';

interface ProposalCardProps {
  proposals: WorkshopProposals;
  onMaterialize: (proposals: WorkshopProposals) => Promise<any>;
  disabled?: boolean;
}

const perspectiveColors: Record<string, string> = {
  operational: 'bg-emerald-100 text-emerald-700',
  management: 'bg-amber-100 text-amber-700',
  financial: 'bg-blue-100 text-blue-700',
};

function PerspectivePill({ id }: { id: string }) {
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${perspectiveColors[id] || 'bg-gray-100 text-gray-600'}`}>
      {id}
    </span>
  );
}

export function ProposalCard({ proposals, onMaterialize, disabled }: ProposalCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [materializing, setMaterializing] = useState(false);
  const [materialized, setMaterialized] = useState(false);

  const totalNew =
    proposals.metrics.filter((m) => !m.is_existing).length +
    proposals.measures.filter((m) => !m.is_existing).length +
    proposals.attributes.filter((a) => !a.is_existing).length;

  const totalExisting =
    proposals.metrics.filter((m) => m.is_existing).length +
    proposals.measures.filter((m) => m.is_existing).length +
    proposals.attributes.filter((a) => a.is_existing).length;

  const handleMaterialize = async () => {
    setMaterializing(true);
    try {
      await onMaterialize(proposals);
      setMaterialized(true);
    } catch {
      // error handled in hook
    } finally {
      setMaterializing(false);
    }
  };

  return (
    <div className="mt-3 border border-purple-200 rounded-lg bg-purple-50/50 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-purple-100/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-purple-500" /> : <ChevronRight className="w-3.5 h-3.5 text-purple-500" />}
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          <span className="text-xs font-semibold text-purple-700">
            Proposed Elements
          </span>
          <span className="text-[10px] text-purple-500">
            {totalNew} new{totalExisting > 0 ? `, ${totalExisting} linked` : ''}
          </span>
        </div>
        {!materialized && totalNew > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); handleMaterialize(); }}
            disabled={disabled || materializing}
            className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 text-white rounded-md text-[11px] font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {materializing ? (
              <span className="animate-pulse">Creating...</span>
            ) : (
              <>
                <Check className="w-3 h-3" />
                Accept & Create
              </>
            )}
          </button>
        )}
        {materialized && (
          <span className="flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-md text-[11px] font-medium">
            <Check className="w-3 h-3" />
            Created
          </span>
        )}
      </div>

      {/* Body */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Metrics */}
          {proposals.metrics.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Metrics</div>
              {proposals.metrics.map((m) => (
                <div key={m.id} className="flex items-start gap-2 py-1">
                  <span className="text-sm">🎯</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-medium ${m.is_existing ? 'text-gray-500' : 'text-gray-900'}`}>
                        {m.name}
                      </span>
                      {m.is_existing && <Link className="w-3 h-3 text-blue-400" />}
                      {m.perspective_ids?.map((p) => <PerspectivePill key={p} id={p} />)}
                    </div>
                    <div className="text-[11px] text-gray-500 italic">"{m.business_question}"</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Measures */}
          {proposals.measures.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Measures</div>
              {proposals.measures.map((m) => (
                <div key={m.id} className="flex items-start gap-2 py-1">
                  <span className="text-sm">📐</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-medium ${m.is_existing ? 'text-gray-500' : 'text-gray-900'}`}>
                        {m.name}
                      </span>
                      {m.is_existing && <Link className="w-3 h-3 text-blue-400" />}
                      {m.perspective_ids?.map((p) => <PerspectivePill key={p} id={p} />)}
                    </div>
                    <div className="text-[11px] text-gray-500">{m.logic || m.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Attributes */}
          {proposals.attributes.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Attributes</div>
              {proposals.attributes.map((a) => (
                <div key={a.id} className="flex items-start gap-2 py-1">
                  <span className="text-sm">📊</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-medium ${a.is_existing ? 'text-gray-500' : 'text-gray-900'}`}>
                        {a.name}
                      </span>
                      {a.is_existing && <Link className="w-3 h-3 text-blue-400" />}
                      {a.perspective_ids?.map((p) => <PerspectivePill key={p} id={p} />)}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {a.entity_id && <span>Entity: {a.entity_id}</span>}
                      {a.system_id && <span> | System: {a.system_id}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
