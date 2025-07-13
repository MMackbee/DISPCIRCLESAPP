// src/AppRoutes.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { auth, db } from "./firebase";

import Login from "./login";
import LandingPage from "./LandingPage"; // NEW: The main hub after login
import UploadPage from "./UploadPage";   // NEW: A dedicated page for uploading
import ImportHistory from "./ImportHistory";
import SessionView from "./SessionView";

// A wrapper component to protect routes that require authentication
const ProtectedRoute = ({ user, children }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const AppRoutes = ({ currentUser, setCurrentUser }) => {
  return (
    <Router>
      <Routes>
        {/* Login Route */}
        <Route
          path="/login"
          element={
            currentUser ? (
              <Navigate to="/" replace />
            ) : (
              <Login auth={auth} onLoginSuccess={setCurrentUser} />
            )
          }
        />

        {/* --- Protected Routes --- */}
        {/* The new Landing Page is the main entry point at "/" */}
        <Route
          path="/"
          element={
            <ProtectedRoute user={currentUser}>
              <LandingPage user={currentUser} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute user={currentUser}>
              <UploadPage user={currentUser} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions"
          element={
            <ProtectedRoute user={currentUser}>
              <ImportHistory user={currentUser} db={db} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/session/:batchId"
          element={
            <ProtectedRoute user={currentUser}>
              <SessionView user={currentUser} />
            </ProtectedRoute>
          }
        />
        
        {/* A catch-all route to redirect any unknown URL */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
