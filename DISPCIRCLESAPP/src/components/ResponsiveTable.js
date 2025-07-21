import React from 'react';

const ResponsiveTable = ({ children, className = '' }) => {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-700">
            {children}
          </table>
        </div>
      </div>
    </div>
  );
};

const ResponsiveTableHeader = ({ children, className = '' }) => (
  <thead className="bg-gray-800">
    <tr className={className}>
      {children}
    </tr>
  </thead>
);

const ResponsiveTableBody = ({ children, className = '' }) => (
  <tbody className="bg-gray-900 divide-y divide-gray-700">
    {children}
  </tbody>
);

const ResponsiveTableRow = ({ children, className = '', onClick }) => (
  <tr 
    className={`${className} ${onClick ? 'cursor-pointer hover:bg-gray-800 transition-colors' : ''}`}
    onClick={onClick}
  >
    {children}
  </tr>
);

const ResponsiveTableCell = ({ children, className = '', isHeader = false }) => {
  const Component = isHeader ? 'th' : 'td';
  return (
    <Component className={`px-4 py-3 text-sm ${isHeader ? 'text-gray-400 font-medium' : 'text-white'} ${className}`}>
      {children}
    </Component>
  );
};

export { ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody, ResponsiveTableRow, ResponsiveTableCell }; 