import { useEffect, useRef, useCallback } from 'react';
import type cytoscape from 'cytoscape';
import { perspectiveColors } from '../nodes/perspectiveConfig';

interface MinimapProps {
  cyRef: React.MutableRefObject<cytoscape.Core | null>;
}

const WIDTH = 200;
const HEIGHT = 150;

export function Minimap({ cyRef }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformRef = useRef({ scale: 1, offsetX: 0, offsetY: 0, bbX1: 0, bbY1: 0, pad: 50 });

  const draw = useCallback(() => {
    const cy = cyRef.current;
    const canvas = canvasRef.current;
    if (!cy || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    const nodes = cy.nodes('.step-node');
    if (nodes.length === 0) return;

    // Get bounding box of all nodes
    const bb = nodes.boundingBox({});
    const pad = 50;
    const fullW = bb.w + pad * 2;
    const fullH = bb.h + pad * 2;

    const scale = Math.min(WIDTH / fullW, HEIGHT / fullH);
    const offsetX = (WIDTH - fullW * scale) / 2 - (bb.x1 - pad) * scale;
    const offsetY = (HEIGHT - fullH * scale) / 2 - (bb.y1 - pad) * scale;

    // Store transform for click-to-navigate
    transformRef.current = { scale, offsetX, offsetY, bbX1: bb.x1, bbY1: bb.y1, pad };

    // Draw nodes as small dots
    nodes.forEach((node) => {
      const pos = node.position();
      const pid = node.data('perspective_id');
      const color = perspectiveColors[pid]?.border || '#6b7280';

      const x = pos.x * scale + offsetX;
      const y = pos.y * scale + offsetY;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });

    // Draw edges as thin lines
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 0.5;
    cy.edges().forEach((edge) => {
      const src = edge.source().position();
      const tgt = edge.target().position();
      ctx.beginPath();
      ctx.moveTo(src.x * scale + offsetX, src.y * scale + offsetY);
      ctx.lineTo(tgt.x * scale + offsetX, tgt.y * scale + offsetY);
      ctx.stroke();
    });

    // Draw viewport rectangle
    const container = cy.container();
    if (!container) return;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const pan = cy.pan();
    const zoom = cy.zoom();

    // Viewport in model coords
    const vpX1 = -pan.x / zoom;
    const vpY1 = -pan.y / zoom;
    const vpW = containerW / zoom;
    const vpH = containerH / zoom;

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
      vpX1 * scale + offsetX,
      vpY1 * scale + offsetY,
      vpW * scale,
      vpH * scale,
    );
  }, [cyRef]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    let rafId: number | null = null;
    const handler = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(draw);
    };

    const events = ['render', 'pan', 'zoom', 'layoutstop', 'position'];
    events.forEach((evt) => cy.on(evt, handler));
    draw();

    return () => {
      events.forEach((evt) => cy.off(evt, handler));
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [cyRef, draw]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const cy = cyRef.current;
      const canvas = canvasRef.current;
      if (!cy || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Inverse-transform minimap coords → world coords
      const { scale, offsetX, offsetY } = transformRef.current;
      if (scale === 0) return;
      const worldX = (clickX - offsetX) / scale;
      const worldY = (clickY - offsetY) / scale;

      // Pan so clicked world point is centered in the viewport
      cy.animate({
        center: { eles: cy.collection() },
        pan: {
          x: cy.width() / 2 - worldX * cy.zoom(),
          y: cy.height() / 2 - worldY * cy.zoom(),
        },
        duration: 300,
        easing: 'ease-in-out-cubic',
      } as any);
    },
    [cyRef],
  );

  return (
    <div className="absolute bottom-4 left-4 z-10">
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        onClick={handleClick}
        className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm cursor-crosshair"
      />
    </div>
  );
}
