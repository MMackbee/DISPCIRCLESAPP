// src/UploadPage.js

import React from "react";
import CSVUploader from "./CSVUploader";

const UploadPage = ({ user }) => {
  return (
    <div className="p-6 lg:p-12 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        {/* Neo-Brutalism Header */}
        <div className="mb-12">
          <div className="chunky-card bg-gradient-to-r from-yellow-500 to-orange-600">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
                  📤 UPLOAD SESSION
                </h1>
                <p className="text-white/90 text-lg font-medium">
                  Import Your Practice Data
                </p>
              </div>
              <div className="text-6xl">
                📊
              </div>
            </div>
          </div>
        </div>
        <div className="chunky-card">
          <CSVUploader user={user} elevation={1000} />
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
