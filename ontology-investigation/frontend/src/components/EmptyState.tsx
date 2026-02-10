import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="max-w-lg w-full">
        <div className="relative bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-12">
          {/* Decorative background pattern */}
          <div className="absolute inset-0 bg-grid-gray-100 opacity-50" style={{
            backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.03) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }} />

          <div className="relative text-center">
            {icon && (
              <div className="mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur-xl opacity-20 animate-pulse" />
                <div className="relative inline-flex items-center justify-center h-20 w-20 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-100 shadow-lg text-blue-600">
                  {icon}
                </div>
              </div>
            )}
            <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
              {title}
            </h3>
            <p className="text-base text-gray-600 mb-8 leading-relaxed max-w-md mx-auto">
              {description}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {onAction && actionLabel && (
                <button
                  onClick={onAction}
                  className="group relative px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  <span className="relative z-10">{actionLabel}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity" />
                </button>
              )}
              {onSecondaryAction && secondaryActionLabel && (
                <button
                  onClick={onSecondaryAction}
                  className="px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 font-semibold border border-gray-200 shadow-sm hover:shadow transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  {secondaryActionLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
