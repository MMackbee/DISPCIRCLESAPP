// src/App.js

import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import AppRoutes from "./AppRoutes";
import Spinner from "./Spinner"; // Using your Spinner component
import "./index.css";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged listener to update user state
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Show a spinner while checking authentication state
  if (loading) {
    return <Spinner message="Authenticating..." />;
  }

  // FIXED: Pass props with the correct names `currentUser` and `setCurrentUser`
  // that AppRoutes.js is expecting.
  return <AppRoutes currentUser={currentUser} setCurrentUser={setCurrentUser} />;
}

export default App;
