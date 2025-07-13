import React from "react";

const Spinner = ({ message = "Loading..." }) => (
  <div className="bg-gray-900 min-h-screen flex items-center justify-center">
    <div className="text-center">
      <svg className="animate-spin h-12 w-12 text-green-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      <p className="mt-2 text-white">{message}</p>
    </div>
  </div>
);

export default Spinner;
