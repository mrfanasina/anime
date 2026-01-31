import React, { useEffect, useRef, useState } from "react";
import { X, Download, AlertTriangle, CheckCircle } from "lucide-react";

export default function DownloadModal({
  isOpen,
  onClose,
  magnetUrl,
  seasonId,
}) {
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState("initial");
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  const isDark = document.documentElement.classList.contains("dark");

  useEffect(() => {
    console.log(seasonId);
    
    if (!isOpen || !magnetUrl || !seasonId) return;
    const ws = new WebSocket(
      `ws://localhost:8000/download/download-anime/${seasonId}?magnet=${encodeURIComponent(
        magnetUrl
      )}`
    );

    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("📡 Download WS:", data);

      if (data.error || data.state === "error") {
        setError(data.message || "Une erreur est survenue.");
        setState("error");
        ws.close();
        return;
      }

      if (data.progress !== undefined) {
        setProgress(data.progress);
      }

      if (data.state) {
        setState(data.state);
      }

      if (data.state === "seeding" || data.progress >= 100) {
        setProgress(100);
        setState("done");
        ws.close();
      }
    };

    ws.onerror = () => {
      setError("Impossible de communiquer avec le serveur.");
      setState("error");
    };

    ws.onclose = () => {
      if (state !== "done" && state !== "error") {
        setError("Connexion perdue.");
        setState("error");
      }
    };

    return () => ws.close();
  }, [isOpen, magnetUrl, seasonId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
      <div
        className={`relative w-[420px] p-6 rounded-2xl shadow-2xl border animate-fade-in
        ${
          isDark
            ? "bg-gray-900/90 text-gray-100 border-gray-700/40"
            : "bg-white/90 text-gray-900 border-gray-200/40"
        }`}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className={`absolute top-3 right-3 transition
          ${
            isDark
              ? "text-gray-400 hover:text-gray-200"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <X size={20} />
        </button>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-center mb-1">
          ⬇️ Téléchargement
        </h2>
        <p className="text-center text-sm opacity-70 mb-6">
          Épisode en cours de téléchargement
        </p>

        {/* Status */}
        <div className="flex justify-center mb-4">
          {state === "error" && (
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          {state === "done" && (
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle size={18} />
              <span>Téléchargement terminé</span>
            </div>
          )}

          {state !== "done" && state !== "error" && (
            <div className="flex items-center gap-2 opacity-80">
              <Download size={18} />
              <span>{state || "Initialisation..."}</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div
            className={`w-full h-3 rounded-full overflow-hidden
            ${isDark ? "bg-gray-800" : "bg-gray-200"}`}
          >
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-sm mt-2 opacity-80">
            {progress.toFixed(1)}%
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-xs opacity-60">
          Le téléchargement continue tant que cette fenêtre est ouverte.
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
