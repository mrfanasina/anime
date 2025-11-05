import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { Provider } from 'react-redux'
import { store } from './redux/store'
import ThemeContextProvider from './context/ThemeContext.jsx'
import './index.css'
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
serviceWorkerRegistration.register();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
    <ThemeContextProvider>
        <App />
    </ThemeContextProvider>
    </Provider>
  </React.StrictMode>
)