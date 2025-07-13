// src/login.js
import React from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const Login = ({ auth, onLoginSuccess }) => {
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      console.log("User:", result.user);
      onLoginSuccess(result.user);
    } catch (error) {
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white px-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-md text-center max-w-md w-full">
        <h1 className="text-3xl font-bold mb-2">Dispersion Circles</h1>
        <p className="mb-6 text-gray-400">Welcome to the login portal</p>
        <button
          onClick={handleGoogleSignIn}
          className="flex items-center justify-center gap-3 bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-100 transition duration-200 w-full"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="w-5 h-5"
          />
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

export default Login;
