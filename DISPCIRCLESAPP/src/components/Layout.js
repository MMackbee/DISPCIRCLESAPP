import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const Layout = ({ children, user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error.message);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: '🏠' },
    { name: 'Sessions', href: '/sessions', icon: '📊' },
    { name: 'Clubs', href: '/clubs', icon: '🏌️' },
    { name: 'Upload', href: '/upload', icon: '📤' },
    { name: 'Profile', href: '/profile', icon: '👤' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-black font-sans flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-glass shadow-glass backdrop-blur-xl border-r border-gray-800 rounded-tr-3xl rounded-br-3xl flex flex-col transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:z-auto ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-20 px-8 border-b border-gray-800">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-golf-500 rounded-2xl flex items-center justify-center mr-4 shadow-golf">
              <span className="text-white font-bold text-lg">⛳</span>
            </div>
            <h1 className="text-2xl font-bold text-yellow-300 tracking-tight">Dispersion Circles</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-yellow-300 transition-colors"
            aria-label="Close sidebar"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User info */}
        <div className="px-8 py-6 border-b border-gray-800">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-300 rounded-full flex items-center justify-center mr-4 shadow-md">
              <span className="text-black font-semibold text-lg">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-white truncate">
                {user?.displayName || 'User'}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-8 px-4 flex-1">
          <div className="space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-4 px-5 py-3 rounded-2xl font-medium text-lg transition-tactile duration-150 shadow-none hover:shadow-tactile hover:bg-yellow-50/10 focus:outline-none focus:ring-2 focus:ring-yellow-300/40 group ${
                  isActive(item.href)
                    ? 'bg-yellow-300/90 text-black shadow-tactile' : 'text-gray-300'
                }`}
                onClick={() => setSidebarOpen(false)}
                tabIndex={0}
                aria-label={item.name}
              >
                <span className="text-2xl group-hover:scale-110 transition-transform duration-150" title={item.name}>{item.icon}</span>
                <span className="truncate" title={item.name}>{item.name}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* Sign out button */}
        <div className="mt-auto p-6 border-t border-gray-800">
          <button
            onClick={handleSignOut}
            className="w-full py-3 rounded-2xl font-bold text-lg bg-yellow-300 text-black shadow-tactile hover:bg-yellow-400 active:scale-95 transition-tactile flex items-center justify-center gap-2"
            aria-label="Sign Out"
          >
            <span className="text-xl">🚪</span>
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-glass backdrop-blur-xl border-b border-gray-800 lg:hidden shadow-glass">
          <div className="flex items-center justify-between h-20 px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-400 hover:text-yellow-300 transition-colors"
              aria-label="Open sidebar"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-golf-500 rounded-2xl flex items-center justify-center mr-3 shadow-golf">
                <span className="text-white font-bold text-lg">⛳</span>
              </div>
              <span className="text-xl font-bold text-yellow-300 tracking-tight">Dispersion Circles</span>
            </div>
            <div className="w-7"></div> {/* Spacer for centering */}
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 bg-black/95 px-4 sm:px-8 py-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout; 