import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-full bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 dark:from-[#0f0f0f] dark:via-[#1a1a1a] dark:to-[#2a2a2a] transition-colors duration-700 text-center px-6">
      
      {/* Animated Gradient Orb */}
      <div className="relative mb-10">
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 blur-2xl opacity-50 animate-pulse"></div>
        <h1 className="relative text-[8rem] sm:text-[10rem] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 select-none">
          404
        </h1>
      </div>

      {/* Subtitle */}
      <h2 className="text-3xl sm:text-4xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
        Oups ! Page non trouvée
      </h2>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-400 max-w-md mb-8">
        Il semble que cette page n’existe pas ou ait été déplacée.  
        Retournez à l’accueil pour continuer votre aventure.
      </p>

      {/* Button */}
      <Link
        to="/"
        className="relative inline-flex items-center justify-center px-6 py-3 font-semibold text-white rounded-full overflow-hidden group"
      >
        <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-75 group-hover:opacity-100 transition duration-300"></span>
        <span className="relative z-10">Retour à l’accueil</span>
      </Link>

      {/* Floating sparkles animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-2 h-2 bg-indigo-500 rounded-full animate-float top-[20%] left-[10%]"></div>
        <div className="absolute w-3 h-3 bg-pink-500 rounded-full animate-float-delayed top-[70%] left-[60%]"></div>
        <div className="absolute w-2 h-2 bg-purple-500 rounded-full animate-float top-[50%] left-[80%]"></div>
      </div>
    </div>
  );
}
