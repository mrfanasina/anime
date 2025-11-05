import React from "react";

export default function Loader() {
  return (
    <div className="flex h-screen w-full flex-col justify-center items-center bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 dark:from-[#0f0f0f] dark:via-[#1a1a1a] dark:to-[#2a2a2a] transition-colors duration-700">
      <div className="relative flex justify-center items-center">
        {/* Halo lumineux */}
        <div className="absolute h-28 w-28 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 blur-xl opacity-70 animate-pulse"></div>

        {/* Cercle rotatif stylé */}
        <div className="h-24 w-24 border-4 border-transparent border-t-indigo-500 border-r-purple-500 border-b-pink-500 rounded-full animate-spin-slow"></div>

        {/* Cœur central */}
        <div className="absolute h-6 w-6 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full animate-ping"></div>
      </div>

      <span className="mt-10 text-3xl font-bold text-gray-700 dark:text-gray-200 tracking-wide animate-bounce">
        Chargement<span className="text-indigo-500">…</span>
      </span>
    </div>
  );
}
