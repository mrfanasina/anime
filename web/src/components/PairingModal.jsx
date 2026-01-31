import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { X, Smartphone, Wifi } from "lucide-react";

export default function PairingModal({ isOpen, onClose, apiUrl }) {
  const [qr, setQr] = useState(null);

  useEffect(() => {
    if (!isOpen || !apiUrl) return;
    console.log("Generating QR for URL:", apiUrl);
    QRCode.toDataURL(apiUrl, {
      width: 260,
      margin: 2,
      color: {
        dark: "#111827",
        light: "#ffffff"
      }
    }).then(setQr);
  }, [isOpen, apiUrl]);

  if (!isOpen) return null;

  const isDark = document.documentElement.classList.contains("dark");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
      <div
        className={`relative w-[420px] p-6 rounded-2xl shadow-2xl border animate-fade-in
        ${isDark
          ? "bg-gray-900/90 text-gray-100 border-gray-700/40"
          : "bg-white/90 text-gray-900 border-gray-200/40"}`}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className={`absolute top-3 right-3 transition
            ${isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-600"}`}
        >
          <X size={20} />
        </button>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-center mb-2">
          🔗 Connexion mobile 
        </h2>
        <p className="text-center text-sm opacity-70 mb-5">
          Connectez votre téléphone à ce PC en local
        </p>

        {/* Steps */}
        <div className="space-y-3 mb-5 text-sm">
          <div className="flex gap-3 items-start">
            <Smartphone size={18} />
            <span>Ouvrez l’application mobile</span>
          </div>
          <div className="flex gap-3 items-start">
            <Wifi size={18} />
            <span>Assurez-vous d’être sur le même Wi-Fi</span>
          </div>
          <div className="flex gap-3 items-start">
            📷 <span>Scannez le QR code ci-dessous</span>
          </div>
        </div>

        {/* QR */}
        <div className="flex justify-center mb-4">
          {qr ? (
            <img
              src={qr}
              alt="QR Code API"
              className="rounded-xl shadow-lg border"
            />
          ) : (
            <div className="w-[260px] h-[260px] flex items-center justify-center opacity-50">
              Génération du QR…
            </div>
          )}
        </div>

        {/* URL fallback */}
        <div
          className={`text-xs break-all text-center px-3 py-2 rounded-lg border
          ${isDark
            ? "bg-gray-800 border-gray-700 text-gray-300"
            : "bg-gray-100 border-gray-300 text-gray-600"}`}
        >
          {apiUrl}
        </div>

        {/* Footer */}
        <div className="mt-5 text-center text-xs opacity-70">
          Une fois scanné, le téléphone utilisera ce PC comme API principale.
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
