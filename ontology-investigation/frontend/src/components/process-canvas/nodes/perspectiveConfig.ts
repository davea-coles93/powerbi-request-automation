export const perspectiveColors: Record<string, { bg: string; border: string; text: string; lightBg: string }> = {
  operational: { bg: '#dcfce7', border: '#22c55e', text: '#166534', lightBg: 'rgba(34, 197, 94, 0.06)' },
  management: { bg: '#fef9c3', border: '#eab308', text: '#854d0e', lightBg: 'rgba(234, 179, 8, 0.06)' },
  financial: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', lightBg: 'rgba(59, 130, 246, 0.06)' },
};

export const perspectiveLabels: Record<string, { label: string; concern: string }> = {
  operational: { label: 'Operational', concern: 'What work is being done?' },
  management: { label: 'Management', concern: 'How are we performing?' },
  financial: { label: 'Financial', concern: "What's the financial position?" },
};

export const perspectiveOrder = ['operational', 'management', 'financial'] as const;

export const automationColors: Record<string, string> = {
  High: '#ef4444',
  Medium: '#f97316',
  Low: '#eab308',
  None: '#22c55e',
};

export const automationIcons: Record<string, string> = {
  High: '●',
  Medium: '●',
  Low: '●',
  None: '●',
};
