import React, { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import CSVUploader from "./CSVUploader";
import ImportHistory from "./ImportHistory";

const Dashboard = ({ user }) => {
  const [form, setForm] = useState({
    handicap: "",
    age: "",
    desiredHandicap: "",
    elevation: "",
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error.message);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Dispersion Circles</h1>
        <p className="user-info">{user.displayName || user.email}</p>
        <nav>
          <a href="/dashboard">🏠 Upload</a>
          <a href="/history">📜 History</a>
        </nav>
        <button onClick={handleSignOut}>Sign Out</button>
      </header>

      <div className="section">
        <h2>Upload Your CSV</h2>
        <label>Handicap:</label>
        <input name="handicap" value={form.handicap} onChange={handleChange} />
        <label>Age:</label>
        <input name="age" value={form.age} onChange={handleChange} />
        <label>Desired Handicap:</label>
        <input
          name="desiredHandicap"
          value={form.desiredHandicap}
          onChange={handleChange}
        />
        <label>Home Course Elevation (ft):</label>
        <input
          name="elevation"
          value={form.elevation}
          onChange={handleChange}
        />
        <CSVUploader user={user} elevation={form.elevation} />
      </div>

      <div className="section import-history">
        <ImportHistory user={user} />
      </div>
    </div>
  );
};

export default Dashboard;
