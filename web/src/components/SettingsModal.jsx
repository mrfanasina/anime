import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setMode,
  setPrimaryColors,
  setSecondaryColors
} from '../redux/themeSlice';

export default function SettingsModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const { mode, primaryColors, secondaryColors } = useSelector(state => state.theme);

  const [tempMode, setTempMode] = useState(mode);
  const [tempPrimary, setTempPrimary] = useState({ ...primaryColors });
  const [tempSecondary, setTempSecondary] = useState({ ...secondaryColors });

  // Mettre à jour le state temporaire quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setTempMode(mode);
      setTempPrimary({ ...primaryColors });
      setTempSecondary({ ...secondaryColors });
    }
  }, [isOpen, mode, primaryColors, secondaryColors]);

  const handleSave = () => {
    dispatch(setMode(tempMode));
    dispatch(setPrimaryColors(tempPrimary));
    dispatch(setSecondaryColors(tempSecondary));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Paramètres</h2>

        {/* Mode clair/sombre */}
        <div className="mb-3">
          <label className="block font-semibold mb-1">Mode</label>
          <select
            value={tempMode}
            onChange={e => setTempMode(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="light">Clair</option>
            <option value="dark">Sombre</option>
          </select>
        </div>

        {/* Couleurs primaires */}
        <div className="mb-3">
          <label className="block font-semibold mb-1">Couleurs principales</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={tempPrimary.main}
              onChange={e => setTempPrimary(prev => ({ ...prev, main: e.target.value }))}
              className="w-16 h-10 p-1 rounded"
            />
            <input
              type="color"
              value={tempPrimary.accent}
              onChange={e => setTempPrimary(prev => ({ ...prev, accent: e.target.value }))}
              className="w-16 h-10 p-1 rounded"
            />
          </div>
        </div>

        {/* Couleurs secondaires */}
        <div className="mb-3">
          <label className="block font-semibold mb-1">Couleurs secondaires</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={tempSecondary.main}
              onChange={e => setTempSecondary(prev => ({ ...prev, main: e.target.value }))}
              className="w-16 h-10 p-1 rounded"
            />
            <input
              type="color"
              value={tempSecondary.accent}
              onChange={e => setTempSecondary(prev => ({ ...prev, accent: e.target.value }))}
              className="w-16 h-10 p-1 rounded"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
          >
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}