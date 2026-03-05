import { useState, useRef, useEffect } from 'react';
import { Download, Image, FileCode } from 'lucide-react';
import type cytoscape from 'cytoscape';

interface ExportMenuProps {
  cyRef: React.MutableRefObject<cytoscape.Core | null>;
}

export function ExportMenu({ cyRef }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const exportPNG = () => {
    const cy = cyRef.current;
    if (!cy) return;
    const dataUrl = cy.png({ full: true, bg: '#fafafa', scale: 2 });
    downloadDataUrl(dataUrl, 'process-map.png');
    setOpen(false);
  };

  const exportSVG = () => {
    const cy = cyRef.current;
    if (!cy) return;
    const svgContent = (cy as any).svg({ full: true, bg: '#fafafa' });
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    downloadDataUrl(url, 'process-map.svg');
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
        title="Export process map"
      >
        <Download className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-40 py-1">
          <button
            onClick={exportPNG}
            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Image className="w-4 h-4 text-gray-400" />
            Export PNG
          </button>
          <button
            onClick={exportSVG}
            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <FileCode className="w-4 h-4 text-gray-400" />
            Export SVG
          </button>
        </div>
      )}
    </div>
  );
}

function downloadDataUrl(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
