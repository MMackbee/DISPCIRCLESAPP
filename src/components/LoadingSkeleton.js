import React from 'react';

const LoadingSkeleton = ({ type = 'table', rows = 5 }) => {
  const TableSkeleton = () => (
    <div className="animate-pulse">
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex space-x-4">
              <div className="h-4 bg-gray-700 rounded w-1/6"></div>
              <div className="h-4 bg-gray-700 rounded w-1/6"></div>
              <div className="h-4 bg-gray-700 rounded w-1/6"></div>
              <div className="h-4 bg-gray-700 rounded w-1/6"></div>
              <div className="h-4 bg-gray-700 rounded w-1/6"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const CardSkeleton = () => (
    <div className="animate-pulse">
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-700 rounded w-5/6"></div>
          <div className="h-4 bg-gray-700 rounded w-4/6"></div>
        </div>
      </div>
    </div>
  );

  const ChartSkeleton = () => (
    <div className="animate-pulse">
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="h-64 bg-gray-700 rounded"></div>
      </div>
    </div>
  );

  const StatsSkeleton = () => (
    <div className="animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="h-8 bg-gray-700 rounded w-1/2 mx-auto mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4 mx-auto"></div>
          </div>
        ))}
      </div>
    </div>
  );

  switch (type) {
    case 'table':
      return <TableSkeleton />;
    case 'card':
      return <CardSkeleton />;
    case 'chart':
      return <ChartSkeleton />;
    case 'stats':
      return <StatsSkeleton />;
    default:
      return <TableSkeleton />;
  }
};

export default LoadingSkeleton; 