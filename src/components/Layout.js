import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useComparison } from '../ComparisonContext';
import DatasetSelector from './DatasetSelector';
import PreferencesModal from './PreferencesModal';

const Layout = ({ children, user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const location = useLocation();
  const { setSelectedDataset } = useComparison();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error.message);
    }
  };

  // Navigation and isActive removed as they're not used

  return (
    <div className="min-h-screen flex layout-container">
      {/* Mobile Navigation Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-green-600 to-green-800 border-r-4 border-green-900 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:z-auto lg:flex-shrink-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-20 px-6 border-b-4 border-green-900 bg-gradient-to-r from-green-700 to-green-800">
          <h1 className="text-2xl font-bold text-white flex items-center">
            <span className="mr-2">🏌️</span>
            Dispersion Circles
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-white hover:text-yellow-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="mt-6 px-4 bg-gradient-to-b from-green-600 to-green-800">
          <div className="space-y-2">
            <Link
              to="/"
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="mr-3 text-xl">📊</span>
              Dashboard
            </Link>

            <Link
              to="/upload"
              className={`nav-link ${location.pathname === '/upload' ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="mr-3 text-xl">📤</span>
              Upload Session
            </Link>

            <Link
              to="/sessions"
              className={`nav-link ${location.pathname === '/sessions' ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="mr-3 text-xl">📋</span>
              Session History
            </Link>

            <Link
              to="/clubs"
              className={`nav-link ${location.pathname === '/clubs' ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="mr-3 text-xl">🏌️‍♂️</span>
              Club Analysis
            </Link>

            <Link
              to="/profile"
              className={`nav-link ${location.pathname === '/profile' ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="mr-3 text-xl">👤</span>
              Profile
            </Link>

            <Link
              to="/compare"
              className={`nav-link ${location.pathname === '/compare' ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="mr-3 text-xl">🔍</span>
              Compare Sessions
            </Link>

            <Link
              to="/practice"
              className={`nav-link ${location.pathname === '/practice' ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="mr-3 text-xl">🎮</span>
              Practice Games
            </Link>
          </div>

          {/* Comparison Dataset Selector */}
          <div className="mt-8 pt-6 border-t-4 border-green-900">
            <label className="block text-sm font-medium text-white mb-3">
              Compare Against:
            </label>
            <DatasetSelector 
              onDatasetChange={setSelectedDataset}
              className="w-full"
            />
          </div>

          {/* User Info & Sign Out */}
          <div className="mt-8 pt-6 border-t-4 border-green-900">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <span className="text-black text-sm font-bold">
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">
                  {user?.displayName || 'User'}
                </p>
                <p className="text-xs text-green-200">
                  {user?.email || 'No email'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setPreferencesOpen(true)}
              className="w-full chunky-button chunky-button-secondary mb-2"
            >
              ⚙️ Preferences
            </button>
            <button
              onClick={handleSignOut}
              className="w-full chunky-button chunky-button-danger"
            >
              🚪 Sign Out
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden bg-gradient-to-r from-green-600 to-green-800 border-b-4 border-green-900 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-white hover:text-yellow-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-white flex items-center">
              <span className="mr-2">🏌️</span>
              Dispersion Circles
            </h1>
            <div className="w-6"></div> {/* Spacer for centering */}
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
      
      {/* Preferences Modal */}
      <PreferencesModal 
        isOpen={preferencesOpen} 
        onClose={() => setPreferencesOpen(false)} 
      />
    </div>
  );
};

export default Layout; 