import React, { useState } from "react";
import Papa from "papaparse";
import { useDropzone } from "react-dropzone";
import { templates } from "./csvTemplates";
import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

const CSVUploader = ({ user, elevation }) => {
  const [vendor, setVendor] = useState("");
  const [notes, setNotes] = useState("");
  const [mappedData, setMappedData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file || !vendor) {
      alert("Please select a vendor and drop a CSV file.");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        const headers = Object.keys(rows[0]);
        const template = templates[vendor];
        const templateKeys = Object.keys(template);

        // ✅ Validate header match
        const matches = templateKeys.filter(key => headers.includes(key));
        if (matches.length === 0) {
          setError(`❌ Your CSV doesn't match the expected format for "${vendor}". 
Make sure the file uses column headers like: ${templateKeys.join(", ")}`);
          return;
        }

        setError("");
        const batchId = `batch_${Date.now()}`;
        const uploadedAt = new Date();

        const standardized = rows.map((row) => {
          const mapped = {};
          for (const [csvKey, stdKey] of Object.entries(template)) {
            if (row[csvKey] !== undefined) {
              mapped[stdKey] = row[csvKey];
            }
          }

          return {
            ...mapped,
            uid: user.uid,
            batchId,
            uploadedAt,
            notes,
            elevation,
            club: row.club || row.Club || "unknown",
          };
        });

        setMappedData(standardized);
        setUploading(true);

        try {
          const userDataRef = collection(db, "userData");
          for (const row of standardized) {
            await addDoc(userDataRef, row);
          }
          console.log(`✅ Uploaded ${standardized.length} rows for batch: ${batchId}`);
          alert(`Upload complete! ${standardized.length} rows saved.`);
        } catch (err) {
          console.error("❌ Firestore write failed:", err);
          alert("Upload failed. Check console.");
        } finally {
          setUploading(false);
        }
      },
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ".csv",
  });

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-md text-white max-w-xl mx-auto space-y-4 mt-6">
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

      <label className="block">
        Session Notes:
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Outdoor session, testing new driver shaft..."
          className="w-full mt-1 p-2 rounded text-black"
        />
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

      {uploading && <p className="text-yellow-400">Uploading rows to Firestore...</p>}

      {error && (
        <div className="bg-red-500 p-3 mt-4 rounded text-white text-sm whitespace-pre-line">
          {error}
        </div>
      )}

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
