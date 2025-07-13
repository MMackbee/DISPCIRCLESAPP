// src/CSVUploader.js
import React, { useState } from "react";
import Papa from "papaparse";
import { useDropzone } from "react-dropzone";
import { templates } from "./csvTemplates";

const CSVUploader = ({ user }) => {
  const [vendor, setVendor] = useState("");
  const [mappedData, setMappedData] = useState([]);

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file || !vendor) {
      alert("Please select a vendor and drop a CSV file.");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        const template = templates[vendor];
        const standardized = rows.map((row) => {
          const mapped = {};
          for (const [rawCol, stdCol] of Object.entries(template)) {
            if (row[rawCol] !== undefined) {
              mapped[stdCol] = row[rawCol];
            }
          }
          return { ...mapped, uid: user.uid };
        });
        console.log("✅ Standardized rows:", standardized);
        setMappedData(standardized);
      },
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ".csv",
  });

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-md text-white max-w-xl mx-auto space-y-4">
      <h3 className="text-xl font-bold">Upload Your CSV</h3>
      <label className="block mb-2">
        Select Launch Monitor:
        <select
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          className="w-full mt-1 p-2 rounded text-black"
        >
          <option value="">-- Choose --</option>
          <option value="rapsodo">Rapsodo</option>
          <option value="gspro">GSPro</option>
          <option value="foresight">Foresight</option>
          <option value="trackman">Trackman</option>
        </select>
      </label>

      <div
        {...getRootProps()}
        className="border-dashed border-2 p-6 rounded text-center cursor-pointer bg-gray-700 hover:bg-gray-600 transition"
      >
        <input {...getInputProps()} />
        {isDragActive
          ? "Drop the file here..."
          : "Drag and drop a .csv file here or click to select"}
      </div>

      {mappedData.length > 0 && (
        <div className="mt-4 text-sm">
          <strong>Sample Output:</strong>
          <pre className="bg-gray-900 p-3 rounded text-green-300 overflow-x-auto">
            {JSON.stringify(mappedData.slice(0, 3), null, 2)}...
          </pre>
        </div>
      )}
    </div>
  );
};

export default CSVUploader;
