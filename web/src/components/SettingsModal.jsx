import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setMode,
  setPrimaryColors,
  setSecondaryColors
} from '../redux/themeSlice';
import { X } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const { mode, primaryColors, secondaryColors } = useSelector(
    state => state.theme
  );

  const [original, setOriginal] = useState({});
  const [tempMode, setTempMode] = useState(mode);
  const [tempPrimary, setTempPrimary] = useState({ ...primaryColors });
  const [tempSecondary, setTempSecondary] = useState({ ...secondaryColors });

  // Mémoriser les valeurs originales à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setOriginal({ mode, primaryColors, secondaryColors });
      setTempMode(mode);
      setTempPrimary({ ...primaryColors });
      setTempSecondary({ ...secondaryColors });
    }
  }, [isOpen]);

  // 🔄 Prévisualisation globale temps réel
  useEffect(() => {
    if (!isOpen) return;
    const root = document.documentElement;
    root.classList.toggle('dark', tempMode === 'dark');

    root.style.setProperty('--color-primary-main', tempPrimary.main);
    root.style.setProperty('--color-primary-accent', tempPrimary.accent);
    root.style.setProperty('--color-secondary-main', tempSecondary.main);
    root.style.setProperty('--color-secondary-accent', tempSecondary.accent);
  }, [isOpen, tempMode, tempPrimary, tempSecondary]);

  const handleCancel = () => {
    dispatch(setMode(original.mode));
    dispatch(setPrimaryColors(original.primaryColors));
    dispatch(setSecondaryColors(original.secondaryColors));

    const root = document.documentElement;
    root.classList.toggle('dark', original.mode === 'dark');
    root.style.setProperty('--color-primary-main', original.primaryColors.main);
    root.style.setProperty('--color-primary-accent', original.primaryColors.accent);
    root.style.setProperty('--color-secondary-main', original.secondaryColors.main);
    root.style.setProperty('--color-secondary-accent', original.secondaryColors.accent);

    onClose();
  };

  const handleSave = () => {
    dispatch(setMode(tempMode));
    dispatch(setPrimaryColors(tempPrimary));
    dispatch(setSecondaryColors(tempSecondary));
    onClose();
  };

  if (!isOpen) return null;

  const isDark = tempMode === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md transition">
      <div
        className={`relative w-[400px] p-6 rounded-2xl shadow-2xl border animate-fade-in transition-colors duration-300
          ${isDark
            ? 'bg-gray-900/90 text-gray-100 border-gray-700/40'
            : 'bg-white/90 text-gray-900 border-gray-200/40'}`}
      >
        {/* Bouton de fermeture */}
        <button
          onClick={onClose}
          className={`absolute top-3 right-3 transition
            ${isDark
              ? 'text-gray-400 hover:text-gray-200'
              : 'text-gray-400 hover:text-gray-600'}`}
        >
          <X size={20} />
        </button>

        {/* Titre */}
        <h2 className="text-2xl font-semibold mb-6 text-center">🎨 Thème & Couleurs</h2>

        {/* Mode clair/sombre */}
        <div className="mb-5">
          <label className="block font-medium mb-2">Mode d’affichage</label>
          <div className="flex gap-3">
            {['light', 'dark'].map(opt => (
              <button
                key={opt}
                onClick={() => setTempMode(opt)}
                className={`flex-1 py-2 rounded-lg border transition-all duration-300
                  ${tempMode === opt
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : isDark
                      ? 'border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-200'
                      : 'border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
              >
                {opt === 'light' ? '🌞 Clair' : '🌙 Sombre'}
              </button>
            ))}
          </div>
        </div>

        {/* Couleurs principales */}
        <div className="mb-5">
          <label className="block font-medium mb-2">Couleurs principales</label>
          <div className="flex gap-5 justify-center">
            {['main', 'accent'].map(type => (
              <div key={type} className="flex flex-col items-center gap-2">
                <input
                  type="color"
                  value={tempPrimary[type]}
                  onChange={e =>
                    setTempPrimary(prev => ({ ...prev, [type]: e.target.value }))
                  }
                  className="w-12 h-12 rounded-full cursor-pointer border-none shadow-md hover:scale-105 transition-transform"
                />
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {type}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Couleurs secondaires */}
        <div className="mb-5">
          <label className="block font-medium mb-2">Couleurs secondaires</label>
          <div className="flex gap-5 justify-center">
            {['main', 'accent'].map(type => (
              <div key={type} className="flex flex-col items-center gap-2">
                <input
                  type="color"
                  value={tempSecondary[type]}
                  onChange={e =>
                    setTempSecondary(prev => ({
                      ...prev,
                      [type]: e.target.value
                    }))
                  }
                  className="w-12 h-12 rounded-full cursor-pointer border-none shadow-md hover:scale-105 transition-transform"
                />
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {type}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Boutons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-lg transition font-medium"
            style={{
              backgroundColor: isDark ? '#1f2937' : '#e5e7eb',
              color: isDark ? '#e5e7eb' : '#111827',
            }}
          >
            Annuler
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg font-medium transition"
            style={{
              backgroundColor: tempPrimary.main,
              color: '#fff',
              boxShadow: `0 0 10px ${tempPrimary.accent}80`,
            }}
          >
            Sauvegarder
          </button>
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
