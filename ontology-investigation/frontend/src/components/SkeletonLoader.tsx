interface SkeletonLoaderProps {
  rows?: number;
  className?: string;
}

export function SkeletonLoader({ rows = 5, className = '' }: SkeletonLoaderProps) {
  return (
    <div className={`animate-pulse space-y-4 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <div className="h-12 bg-gray-200 rounded flex-1"></div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeletonLoader({ rows = 5 }: { rows?: number }) {
  return (
    <div className="p-6">
      {/* Header skeleton */}
      <div className="animate-pulse mb-4">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </div>

      {/* Search bar skeleton */}
      <div className="animate-pulse mb-4">
        <div className="h-10 bg-gray-200 rounded w-full max-w-md"></div>
      </div>

      {/* Table rows skeleton */}
      <div className="animate-pulse space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 border rounded p-4">
            <div className="h-6 bg-gray-200 rounded flex-1"></div>
            <div className="h-6 bg-gray-200 rounded w-32"></div>
            <div className="h-6 bg-gray-200 rounded w-24"></div>
            <div className="h-6 bg-gray-200 rounded w-20"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
