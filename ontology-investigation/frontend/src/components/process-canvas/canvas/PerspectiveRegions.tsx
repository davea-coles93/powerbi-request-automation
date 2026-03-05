import { useEffect, useState, useCallback } from 'react';
import type cytoscape from 'cytoscape';
import { perspectiveColors, perspectiveLabels } from '../nodes/perspectiveConfig';

interface Region {
  perspectiveId: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

interface PerspectiveRegionsProps {
  cyRef: React.MutableRefObject<cytoscape.Core | null>;
}

const PADDING = 40; // px padding around the bounding box

export function PerspectiveRegions({ cyRef }: PerspectiveRegionsProps) {
  const [regions, setRegions] = useState<Region[]>([]);

  const computeRegions = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const container = cy.container();
    if (!container) return;

    const pan = cy.pan();
    const zoom = cy.zoom();

    // Group nodes by perspective
    const groups: Record<string, cytoscape.NodeCollection> = {};
    cy.nodes('.step-node').forEach((node) => {
      const pid = node.data('perspective_id');
      if (!pid) return;
      if (!groups[pid]) {
        groups[pid] = cy.collection();
      }
      groups[pid] = groups[pid].union(node);
    });

    const newRegions: Region[] = [];
    for (const [pid, nodes] of Object.entries(groups)) {
      if (nodes.length === 0) continue;

      const bb = nodes.boundingBox({});
      // Convert model coords → rendered (screen) coords
      const left = bb.x1 * zoom + pan.x - PADDING;
      const top = bb.y1 * zoom + pan.y - PADDING;
      const width = bb.w * zoom + PADDING * 2;
      const height = bb.h * zoom + PADDING * 2;

      newRegions.push({ perspectiveId: pid, left, top, width, height });
    }

    setRegions(newRegions);
  }, [cyRef]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    // Recompute on layout, viewport change, node position change
    const events = ['render', 'pan', 'zoom', 'layoutstop', 'position'];
    const handler = () => computeRegions();

    // Debounce render events to avoid excessive updates
    let rafId: number | null = null;
    const debouncedHandler = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(handler);
    };

    events.forEach((evt) => cy.on(evt, debouncedHandler));
    // Initial compute
    computeRegions();

    return () => {
      events.forEach((evt) => cy.off(evt, debouncedHandler));
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [cyRef, computeRegions]);

  return (
    <div className="absolute inset-0 pointer-events-none z-[1]">
      {regions.map((r) => {
        const colors = perspectiveColors[r.perspectiveId];
        const label = perspectiveLabels[r.perspectiveId]?.label || r.perspectiveId;
        if (!colors) return null;

        return (
          <div
            key={r.perspectiveId}
            className="absolute rounded-xl transition-all duration-150 ease-out"
            style={{
              left: r.left,
              top: r.top,
              width: r.width,
              height: r.height,
              backgroundColor: colors.lightBg,
              border: `1.5px solid ${colors.border}30`,
            }}
          >
            <span
              className="absolute top-2 left-3 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: colors.border + '80' }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
