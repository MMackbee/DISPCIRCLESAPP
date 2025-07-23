import React from "react";

const Spinner = ({ message = "Loading...", progress, showProgress = false }) => (
  <div className="bg-sand min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="relative">
        <svg className="animate-spin h-12 w-12 text-green-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        {showProgress && progress !== undefined && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-white">{Math.round(progress)}%</span>
          </div>
        )}
      </div>
      <p className="mt-4 text-white font-medium">{message}</p>
      {showProgress && progress !== undefined && (
        <div className="mt-3 w-48 mx-auto">
          <div className="bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-400 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  </div>
);

export default Spinner;
