import type { ReactNode } from 'react';

interface SectionHeaderProps {
  icon?: ReactNode;
  label: string;
  className?: string;
}

export function SectionHeader({ icon, label, className = '' }: SectionHeaderProps) {
  return (
    <h4 className={`text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 ${className}`}>
      {icon}
      {label}
    </h4>
  );
}
