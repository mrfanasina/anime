import { createSlice } from '@reduxjs/toolkit'

const systemPrefersDark =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

// If user previously selected a theme, store it in localStorage under key 'theme'
const storedTheme = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
const isUserPreference = !!storedTheme;

const initialState = {
  mode: storedTheme || (systemPrefersDark ? "dark" : "light"),
  isUserPreference,
  primaryColors: { main: "#78a8e0", accent: "#e0a878" }, // Couleur principale
  secondaryColors: { main: "#a878e0", accent: "#78e0a8" }, // Couleur secondaire / accent
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    // Toggle and persist user preference
    toggleMode: (state) => {
      state.mode = state.mode === "light" ? "dark" : "light";
      state.isUserPreference = true;
      try {
        localStorage.setItem("theme", state.mode);
      } catch (e) {
        /* ignore */
      }
    },

    // Accepts payload: 'dark' | 'light' | 'system'
    setMode: (state, action) => {
      const payload = action.payload;
      if (payload === "system") {
        // Remove stored preference and fallback to system
        try {
          localStorage.removeItem("theme");
        } catch (e) {
          /* ignore */
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
          /* ignore */
        }
      }
    },

    setPrimaryColors: (state, action) => {
      state.primaryColors = action.payload;
    },
    setSecondaryColors: (state, action) => {
      state.secondaryColors = action.payload;
    },
  },
});

export const { toggleMode, setMode, setPrimaryColors, setSecondaryColors } = themeSlice.actions;
export default themeSlice.reducer;