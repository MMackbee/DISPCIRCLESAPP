import React, { useState } from "react";
import Papa from "papaparse";
import { useDropzone } from "react-dropzone";
import { templates } from "./csvTemplates";
import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";
import { normalizeClubName, parseNumber } from './clubOrdering';
import { detectOutliersIQR } from './dispersionUtils';
import Tooltip from './components/Tooltip';

const CSVUploader = ({ user, elevation, onUploadComplete }) => {
  const [vendor, setVendor] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [notes, setNotes] = useState("");
  const [mappedData, setMappedData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = (acceptedFiles) => {
    if (!acceptedFiles || acceptedFiles.length === 0) {
      setError("No file selected");
      return;
    }
    const file = acceptedFiles[0];
    if (!file || !vendor) {
      alert("Please select a vendor and drop a CSV file.");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      error: (error) => {
        console.error("CSV parsing error:", error);
        setError(`❌ Error parsing CSV file: ${error.message}`);
      },
      complete: async (results) => {
        const rows = results.data;
        
        // Validate that we have data
        if (!rows || rows.length === 0) {
          setError("❌ CSV file appears to be empty or has no valid data.");
          return;
        }
        
        if (!rows[0] || Object.keys(rows[0]).length === 0) {
          setError("❌ CSV file has no valid headers or data structure.");
          return;
        }
        
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

        // Group shots by club for outlier detection
        const clubGroups = {};
        // Process and standardize the data
        rows.forEach((row) => {
          const mapped = {};
          for (const [csvKey, stdKey] of Object.entries(template)) {
            if (row[csvKey] !== undefined) {
              mapped[stdKey] = row[csvKey];
            }
          }

          // Type safety for club name
          let club = row.club || row.Club || row.CLUB || '';
          club = normalizeClubName(club);

          // Type safety for numeric fields
          if (mapped.ball_speed !== undefined) mapped.ball_speed = parseNumber(mapped.ball_speed);
          if (mapped.club_speed !== undefined) mapped.club_speed = parseNumber(mapped.club_speed);
          if (mapped.vla !== undefined) mapped.vla = parseNumber(mapped.vla);
          if (mapped.peak_height !== undefined) {
            // GSPRO provides peak height in yards, convert to feet
            const heightInYards = parseNumber(mapped.peak_height);
            mapped.peak_height = heightInYards * 3; // Convert yards to feet
          }
          if (mapped.descent_angle !== undefined) mapped.descent_angle = parseNumber(mapped.descent_angle);
          

          // Support multiple possible spin rate columns
          if (mapped.spin_rate === undefined) {
            if (row.TotalSpin !== undefined) mapped.spin_rate = parseNumber(row.TotalSpin);
            else if (row.BackSpin !== undefined) mapped.spin_rate = parseNumber(row.BackSpin);
            else if (row.SpinRate !== undefined) mapped.spin_rate = parseNumber(row.SpinRate);
            else if (row.Spin !== undefined) mapped.spin_rate = parseNumber(row.Spin);
          } else {
            mapped.spin_rate = parseNumber(mapped.spin_rate);
          }
          if (mapped.carry_distance !== undefined) mapped.carry_distance = parseNumber(mapped.carry_distance);
          if (mapped.side_total !== undefined) mapped.side_total = parseNumber(mapped.side_total);
          if (mapped.total_distance !== undefined) mapped.total_distance = parseNumber(mapped.total_distance);

          // Defensive: if any required numeric field is NaN, show error
          if (
            (mapped.ball_speed !== undefined && isNaN(mapped.ball_speed)) ||
            (mapped.spin_rate !== undefined && isNaN(mapped.spin_rate)) ||
            (mapped.carry_distance !== undefined && isNaN(mapped.carry_distance)) ||
            (mapped.side_total !== undefined && isNaN(mapped.side_total)) ||
            (mapped.total_distance !== undefined && isNaN(mapped.total_distance))
          ) {
            setError('❌ One or more numeric fields are invalid. Please check your CSV.');
          }

          // Group by club for outlier detection
          if (!clubGroups[club]) clubGroups[club] = [];
          clubGroups[club].push({
            ...mapped,
            batchId,
            uploadedAt,
            sessionName,
            notes,
            elevation,
            club,
          });

          return {
            ...mapped,
            batchId,
            uploadedAt,
            sessionName,
            notes,
            elevation,
            club,
          };
        });

        // Detect outliers for each club
        let totalOutliers = 0;
        Object.entries(clubGroups).forEach(([club, shots]) => {
          if (shots.length >= 4) {
            const points = shots.map(shot => [
              parseNumber(shot.side_total !== undefined && shot.side_total !== null ? shot.side_total : shot.side),
              parseNumber(shot.carry_distance)
            ]).filter(([x, y]) => !isNaN(x) && !isNaN(y));
            
            if (points.length >= 4) {
              const outlierIndices = detectOutliersIQR(points, 1.5);
              outlierIndices.forEach(index => {
                shots[index].isOutlier = true;
                totalOutliers++;
              });
            }
          }
        });

        // Show outlier warning if any detected
        if (totalOutliers > 0) {
          alert(`⚠️ Outlier Detection: ${totalOutliers} shots detected as outliers and tagged. You can filter them out in the scatter plot view.`);
        }

        // Flatten clubGroups back to array and add uid
        const finalData = Object.values(clubGroups).flat().map(shot => ({
          ...shot,
          uid: user?.uid
        }));

        setMappedData(finalData);
        setUploading(true);

        try {
          const userDataRef = collection(db, "userData");
          
          // Validate data before upload
          if (!finalData || finalData.length === 0) {
            throw new Error("No valid data to upload");
          }
          
          // Check for required fields
          const requiredFields = ['club', 'carry_distance'];
          const missingFields = finalData.some(row => 
            requiredFields.some(field => !row[field] && row[field] !== 0)
          );
          
          if (missingFields) {
            throw new Error("Some rows are missing required fields (club, carry_distance)");
          }
          
          // Upload with progress tracking
          for (let i = 0; i < finalData.length; i++) {
            await addDoc(userDataRef, finalData[i]);
            setUploadProgress(((i + 1) / finalData.length) * 100);
          }
          
  
          if (onUploadComplete) {
            onUploadComplete(finalData);
          } else {
            alert(`Upload complete! ${finalData.length} rows saved.`);
          }
        } catch (err) {
          console.error("❌ Firestore write failed:", err);
          setError(`Upload failed: ${err.message}`);
          alert(`Upload failed: ${err.message}`);
        } finally {
          setUploading(false);
          setUploadProgress(0);
        }
      },
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ".csv",
  });

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Upload Your CSV</h3>
        <p className="text-gray-600">Select your launch monitor and upload your session data</p>
      </div>

      <div className="space-y-6">
        <div>
          <Tooltip content="Select the launch monitor that generated your CSV file. This helps us map the correct column headers.">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Launch Monitor: <span className="text-blue-600">ⓘ</span>
            </label>
          </Tooltip>
          <select
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            className="chunky-select w-full"
          >
            <option value="">-- Choose Launch Monitor --</option>
            <option value="rapsodo">Rapsodo</option>
            <option value="gspro">GSPro</option>
            <option value="foresight">Foresight</option>
            <option value="trackman">Trackman</option>
          </select>
        </div>

        <div>
          <Tooltip content="Give your session a descriptive name to help you identify it later (e.g., 'Morning Range Session', 'Driver Testing')">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Session Name: <span className="text-blue-600">ⓘ</span>
            </label>
          </Tooltip>
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="e.g., Morning Range Session, Driver Testing, Course Practice..."
            className="chunky-input w-full"
          />
        </div>

        <div>
          <Tooltip content="Add notes about conditions, equipment, or anything else relevant to this session">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Session Notes: <span className="text-blue-600">ⓘ</span>
            </label>
          </Tooltip>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Outdoor session, testing new driver shaft, windy conditions..."
            className="chunky-input w-full resize-none"
            rows="3"
          />
        </div>

        <Tooltip content="Drag and drop your CSV file here, or click to browse. Make sure it's from your selected launch monitor.">
          <div
            {...getRootProps()}
            className={`chunky-card border-2 border-dashed text-center cursor-pointer transition-all duration-200 p-8 ${
              isDragActive 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-400 hover:border-gray-600 hover:bg-yellow-50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="text-5xl mb-4">📁</div>
            <p className="text-lg font-medium text-gray-800 mb-2">
              {isDragActive ? "Drop the file here..." : "Drag and drop a .csv file here"}
            </p>
            <p className="text-gray-600">or click to select a file</p>
            <p className="text-xs text-gray-500 mt-2">ⓘ Hover for more info</p>
          </div>
        </Tooltip>

        {uploading && (
          <div className="chunky-card">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
              <p className="text-yellow-600 font-medium">Uploading to database...</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-yellow-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-center text-sm text-gray-600 mt-2">
              {Math.round(uploadProgress)}% complete
            </p>
          </div>
        )}

        {error && (
          <div className="chunky-card bg-red-50 border-red-300">
            <p className="text-red-700 text-sm whitespace-pre-line">{error}</p>
          </div>
        )}

        {mappedData.length > 0 && (
          <div className="p-6 rounded-xl">
            <div className="text-sm">
                              <strong className="text-green-700 block mb-3">Sample Output:</strong>
                              <pre className="bg-gray-100 p-4 rounded-lg text-green-700 overflow-x-auto text-xs border border-gray-300">
                {JSON.stringify(mappedData.slice(0, 3), null, 2)}...
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CSVUploader;
