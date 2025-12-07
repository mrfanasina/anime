import { createSlice } from '@reduxjs/toolkit';

// Vérifie la préférence système
const systemPrefersDark =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

// Récupération depuis localStorage
const storedTheme = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
const storedPrimaryColors = typeof window !== "undefined" ? localStorage.getItem("primaryColors") : null;
const storedSecondaryColors = typeof window !== "undefined" ? localStorage.getItem("secondaryColors") : null;

const isUserPreference = !!storedTheme;

const initialState = {
  mode: storedTheme || (systemPrefersDark ? "dark" : "light"),
  isUserPreference,
  primaryColors: storedPrimaryColors ? JSON.parse(storedPrimaryColors) : { main: "#78a8e0", accent: "#e0a878" },
  secondaryColors: storedSecondaryColors ? JSON.parse(storedSecondaryColors) : { main: "#a878e0", accent: "#78e0a8" },
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    // Toggle mode
    toggleMode: (state) => {
      state.mode = state.mode === "light" ? "dark" : "light";
      state.isUserPreference = true;
      try {
        localStorage.setItem("theme", state.mode);
      } catch (e) {
        console.warn("Impossible d'accéder à localStorage", e);
      }
    },

    // Définit le mode explicitement ou 'system'
    setMode: (state, action) => {
      const payload = action.payload;
      if (payload === "system") {
        try {
          localStorage.removeItem("theme");
        } catch (e) {
          console.warn("Impossible d'accéder à localStorage", e);
        }
        const sysPrefersDark =
          typeof window !== "undefined" &&
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches;
        state.mode = sysPrefersDark ? "dark" : "light";
        state.isUserPreference = false;
      } else if (payload === "dark" || payload === "light") {
        state.mode = payload;
        state.isUserPreference = true;
        try {
          localStorage.setItem("theme", state.mode);
        } catch (e) {
          console.warn("Impossible d'accéder à localStorage", e);
        }
      }
    },

    // Met à jour et stocke les couleurs principales
    setPrimaryColors: (state, action) => {
      state.primaryColors = action.payload;
      try {
        localStorage.setItem("primaryColors", JSON.stringify(action.payload));
      } catch (e) {
        console.warn("Impossible de sauvegarder les couleurs primaires", e);
      }
    },

    // Met à jour et stocke les couleurs secondaires
    setSecondaryColors: (state, action) => {
      state.secondaryColors = action.payload;
      try {
        localStorage.setItem("secondaryColors", JSON.stringify(action.payload));
      } catch (e) {
        console.warn("Impossible de sauvegarder les couleurs secondaires", e);
      }
    },
  },
});

export const { toggleMode, setMode, setPrimaryColors, setSecondaryColors } = themeSlice.actions;
export default themeSlice.reducer;