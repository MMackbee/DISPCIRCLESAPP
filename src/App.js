// src/App.js
import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import AppRoutes from "./AppRoutes";
import Spinner from "./Spinner";
import { ComparisonProvider } from "./ComparisonContext";
import { UserPreferencesProvider } from "./UserPreferencesContext";
import "./index.css"; // Tailwind classes loaded here


function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auto-detect system color scheme and set 'dark' class
  useEffect(() => {
    const updateTheme = () => {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    updateTheme();
    // Listen for changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', updateTheme);
    return () => mq.removeEventListener('change', updateTheme);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand text-gray-800">
        <Spinner message="Authenticating..." />
      </div>
    );
  }

  return (
    <ComparisonProvider>
      <UserPreferencesProvider>
        <div className="h-full bg-sand text-gray-800">
          <AppRoutes currentUser={currentUser} setCurrentUser={setCurrentUser} />
        </div>
      </UserPreferencesProvider>
    </ComparisonProvider>
  );
}

export default App;
