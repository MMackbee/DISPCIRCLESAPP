// src/UploadPage.js

import React from "react";
import { Link } from "react-router-dom";
import CSVUploader from "./CSVUploader";

const UploadPage = ({ user }) => {
  return (
    <div className="bg-gray-900 min-h-screen p-4 md:p-8">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <Link to="/" className="text-blue-400 hover:text-blue-300">
            &larr; Back to Home
          </Link>
        </div>
        <CSVUploader user={user} elevation={1000} />
      </div>
    </div>
  );
};

export default UploadPage;
