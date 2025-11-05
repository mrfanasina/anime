import React, { createContext } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { toggleMode } from '../redux/themeSlice'

export const ThemeContext = createContext()

export default function ThemeContextProvider({ children }) {
  const mode = useSelector(state => state.theme.mode)
  const dispatch = useDispatch()

  const switchTheme = () => dispatch(toggleMode())

  return (
    <ThemeContext.Provider value={{ mode, switchTheme }}>
      <div className={mode === 'dark' ? 'darkMode' : 'lightMode'}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}