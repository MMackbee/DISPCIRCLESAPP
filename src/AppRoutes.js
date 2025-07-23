// src/AppRoutes.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { auth, db } from "./firebase";

import Login from "./login";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import UploadPage from "./UploadPage";
import ImportHistory from "./ImportHistory";
import SessionView from "./SessionView";
import ClubsOverview from "./ClubsOverview";
import ProfilePage from "./ProfilePage";
import ComparisonSetup from "./components/ComparisonSetup";
import ComparisonView from "./components/ComparisonView";
import WedgeCombine from './WedgeCombine';
import Practice from './Practice';

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
        <Route
          path="/"
          element={
            <ProtectedRoute user={currentUser}>
              <Layout user={currentUser}>
                <Dashboard user={currentUser} />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute user={currentUser}>
              <Layout user={currentUser}>
                <UploadPage user={currentUser} />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions"
          element={
            <ProtectedRoute user={currentUser}>
              <Layout user={currentUser}>
                <ImportHistory user={currentUser} db={db} />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/session/:batchId"
          element={
            <ProtectedRoute user={currentUser}>
              <Layout user={currentUser}>
                <SessionView user={currentUser} />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/clubs"
          element={
            <ProtectedRoute user={currentUser}>
              <Layout user={currentUser}>
                <ClubsOverview user={currentUser} />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute user={currentUser}>
              <Layout user={currentUser}>
                <ProfilePage user={currentUser} />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/compare"
          element={
            <ProtectedRoute user={currentUser}>
              <Layout user={currentUser}>
                <ComparisonSetup user={currentUser} />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/compare/view"
          element={
            <ProtectedRoute user={currentUser}>
              <Layout user={currentUser}>
                <ComparisonView user={currentUser} />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="/combine" element={<Layout><WedgeCombine /></Layout>} />
        <Route path="/practice" element={<ProtectedRoute user={currentUser}><Layout user={currentUser}><Practice user={currentUser} /></Layout></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
