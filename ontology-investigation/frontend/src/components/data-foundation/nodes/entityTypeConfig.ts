export const entityTypeConfig: Record<string, { color: string; bg: string; border: string; label: string; icon: string }> = {
  metric: { color: '#059669', bg: '#ecfdf5', border: '#34d399', label: 'Metric', icon: '📊' },
  measure: { color: '#d97706', bg: '#fffbeb', border: '#fbbf24', label: 'Measure', icon: '🧮' },
  attribute: { color: '#4f46e5', bg: '#eef2ff', border: '#818cf8', label: 'Attribute', icon: '🔷' },
  entity: { color: '#2563eb', bg: '#eff6ff', border: '#60a5fa', label: 'Entity', icon: '🏢' },
  system: { color: '#be185d', bg: '#fdf2f8', border: '#f472b6', label: 'System', icon: '💻' },
  process: { color: '#0d9488', bg: '#f0fdfa', border: '#5eead4', label: 'Process', icon: '🔄' },
};
