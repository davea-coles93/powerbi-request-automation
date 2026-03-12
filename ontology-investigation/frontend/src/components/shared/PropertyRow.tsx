interface PropertyRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function PropertyRow({ label, value, className = '' }: PropertyRowProps) {
  return (
    <div className={`flex items-center justify-between text-sm ${className}`}>
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}
