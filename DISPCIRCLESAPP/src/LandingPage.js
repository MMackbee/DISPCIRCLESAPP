// src/LandingPage.js

import React from "react";
import { Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";

// A simple icon component for the cards
const CardIcon = ({ children }) => (
  <div className="text-blue-400 mb-4">{children}</div>
);

const LandingPage = ({ user }) => {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // The router will automatically redirect to /login
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white p-4 md:p-8">
      <header className="flex justify-between items-center mb-10 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">Dispersion Circles</h1>
          <p className="text-gray-400">Welcome, {user.displayName || user.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="bg-red-600 hover:bg-red-700 font-bold py-2 px-4 rounded-lg transition"
        >
          Sign Out
        </button>
      </header>

      <main className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6 text-center">What would you like to do?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <Link to="/upload" className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-all transform hover:-translate-y-1 block">
            <CardIcon>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            </CardIcon>
            <h3 className="text-xl font-bold mb-2">Upload New Session</h3>
            <p className="text-gray-400">Import a .csv file from your launch monitor to get started.</p>
          </Link>

          <Link to="/sessions" className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-all transform hover:-translate-y-1 block">
            <CardIcon>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </CardIcon>
            <h3 className="text-xl font-bold mb-2">Analyze Sessions</h3>
            <p className="text-gray-400">Review your past practice sessions and view your shot dispersions.</p>
          </Link>

          <div className="bg-gray-800 p-6 rounded-lg relative overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all transform hover:-translate-y-1">
             <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">PRO</div>
             <CardIcon>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </CardIcon>
            <h3 className="text-xl font-bold mb-2 text-gray-500">Compare Sessions</h3>
            <p className="text-gray-500">Analyze trends by comparing two or more sessions side-by-side.</p>
          </div>

        </div>
      </main>
    </div>
  );
};

export default LandingPage;
