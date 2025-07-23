// src/LandingPage.js

import React from "react";
import { Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";

// This is a simple wrapper component for the icons.
// It expects to have children elements placed inside it.
const CardIcon = ({ children }) => (
  <div className="mb-4">{children}</div>
);

const LandingPage = ({ user }) => {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="bg-sand min-h-screen text-gray-800 p-4 md:p-8">
      {/* Neo-Brutalism Header */}
      <div className="mb-12">
        <div className="chunky-card bg-gradient-to-r from-emerald-500 to-teal-600">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
                🏌️‍♂️ DISPERSION CIRCLES
              </h1>
              <p className="text-white/90 text-lg font-medium">
                Advanced Golf Performance Analytics
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-6xl">⛳</div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6 text-center">What would you like to do?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <Link to="/upload" className="chunky-card hover:bg-gray-50 transition-all transform hover:-translate-y-1 block">
            {/* CORRECTED: Ensure CardIcon has both an opening and closing tag */}
            <CardIcon>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            </CardIcon>
            <h3 className="text-xl font-bold mb-2">Upload New Session</h3>
            <p className="text-gray-600">Import a .csv file from your launch monitor to get started.</p>
          </Link>

          <Link to="/sessions" className="chunky-card hover:bg-gray-50 transition-all transform hover:-translate-y-1 block">
            <CardIcon>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </CardIcon>
            <h3 className="text-xl font-bold mb-2">Analyze Sessions</h3>
            <p className="text-gray-600">Review your past practice sessions and view your shot dispersions.</p>
          </Link>
          
          <Link to="/overview" className="chunky-card hover:bg-gray-50 transition-all transform hover:-translate-y-1 block">
            <CardIcon>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </CardIcon>
            <h3 className="text-xl font-bold mb-2">Clubs Overview</h3>
            <p className="text-gray-600">View your average performance and distance ranges for every club.</p>
          </Link>

        </div>
      </main>
    </div>
  );
};

export default LandingPage;
