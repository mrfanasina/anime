import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useSelector, useDispatch } from "react-redux";
import { setMode } from "./redux/themeSlice";
import Loader from './utils/Loader.jsx';
import AnimeDetails from './pages/animes/details.jsx';
import Login from './pages/login/index.jsx';
import SignUp from './pages/sign-up/index.jsx';
import NotFound from './pages/not-found/index.jsx';

const HomePage = React.lazy(() => import('./pages/home/index.jsx'))
const AnimePage = React.lazy(() => import('./pages/animes/index.jsx'))
const DuelPage = React.lazy(() => import('./pages/duel/index.jsx'))
const WatchListPage = React.lazy(() => import('./pages/watchlist/index.jsx'))
const SeasonalPage = React.lazy(() => import('./pages/seasonal/index.jsx'))

const App = () => {
  const mode = useSelector((state) => state.theme.mode);
  const isUserPreference = useSelector((state) => state.theme.isUserPreference);
  const dispatch = useDispatch();

  // Apply theme class whenever mode changes
  useEffect(() => {
    document.body.classList.toggle("dark", mode === "dark");
  }, [mode]);

  // Listen to system theme changes and update mode when user hasn't set a preference
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mql = window.matchMedia("(prefers-color-scheme: dark)");

    const handler = (e) => {
      if (!isUserPreference) {
        dispatch(setMode(e.matches ? "dark" : "light"));
      }
    };

    // Initialize to system if no user preference
    if (!isUserPreference) {
      dispatch(setMode(mql.matches ? "dark" : "light"));
    }

    if (mql.addEventListener) {
      mql.addEventListener("change", handler);
    } else {
      mql.addListener(handler);
    }

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", handler);
      } else {
        mql.removeListener(handler);
      }
    };
  }, [dispatch, isUserPreference]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <Suspense fallback={<Loader/>}>
            <HomePage />
          </Suspense>
        } />
        <Route path="/anime" element={
          <Suspense fallback={<Loader/>}>
            <AnimePage />
          </Suspense>
        } />
        <Route path="/duel" element={
          <Suspense fallback={<Loader/>}>
            <DuelPage />
          </Suspense>
        } />
        <Route path="/watch-list" element={
          <Suspense fallback={<Loader/>}>
            <WatchListPage />
          </Suspense>
        } />
        <Route path="/seasonal" element={
          <Suspense fallback={<Loader/>}>
            <SeasonalPage />
          </Suspense>
        } />
        <Route path="/details/:id" element={
          <Suspense fallback={<Loader/>}>
            <AnimeDetails />
          </Suspense>
        } />
        <Route path='/login' element={
          <Suspense>
            <Login/>
          </Suspense>
        }/>
        <Route path='/signup' element={
          <Suspense fallback={<Loader/>}>
            <SignUp/>
          </Suspense>
        }/>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;