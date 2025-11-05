import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Settings,
  Moon,
  Sun,
  LogIn,
  UserPlus,
  LogOut,
  User,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import SettingsModal from './SettingsModal';
import adjustColor from '../utils/adjustColor';
import { setMode } from '../redux/themeSlice';
import { getCurrentUser } from '../controllers/auth';
import api from '../services/api';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/anime', label: 'Animes' },
  { to: '/duel', label: 'Duel' },
  { to: '/watch-list', label: 'Watch-List' },
  { to: '/seasonal', label: 'Seasonal' },
];

export default function TopBar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { mode, primaryColors } = useSelector((state) => state.theme);
  const textColor = mode === 'dark' ? '#fff' : '#000';
  const location = useLocation();

  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isFocused, setIsFocused] = useState(false);

  const searchInputRef = useRef(null);

  const activeColor =
    mode === 'dark'
      ? adjustColor(primaryColors.main, 40)
      : adjustColor(primaryColors.main, -40);

  // 🔹 Charger l'utilisateur connecté
  useEffect(() => {
    async function fetchUser() {
      const user = await getCurrentUser();
      setCurrentUser(user);
    }
    fetchUser();
  }, []);

  // 🔹 Recherche avec debounce
  useEffect(() => {
    if (typeof searchTerm !== 'string' || !searchTerm.trim()) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await api.get(
          `/anime/search?query=${encodeURIComponent(searchTerm)}`
        );
        setSuggestions(res.data || []);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Erreur lors de la recherche :', err);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  // 🔹 Empêcher Ctrl+K de déclencher le navigateur
  useEffect(() => {
    const handleShortcut = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('currentUser');
    setCurrentUser(null);
    navigate('/');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && suggestions.length > 0) {
      e.preventDefault();
      const selectedAnime = suggestions[selectedIndex];
      navigate(`/details/${selectedAnime.id}`);
      setSearchTerm('');
      setSuggestions([]);
    }
  };

  const inverseMode = () => {
    dispatch(setMode(mode === 'dark' ? 'light' : 'dark'));
  };

  return (
    <>
      <div
        className="fixed top-0 left-0 z-50 w-full backdrop-blur-xl shadow-md border-b border-white/10 transition-all duration-500"
        style={{
          background:
            mode === 'dark'
              ? 'linear-gradient(135deg, rgba(20,20,20,0.4), rgba(40,40,40,0.4))'
              : 'linear-gradient(135deg, rgba(255,255,255,0.6), rgba(240,240,240,0.4))',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 md:px-8">
          {/* Logo */}
          <Link to="/">
            <h2
              className="text-2xl font-extrabold tracking-tight select-none"
              style={{
                color: primaryColors.main,
                textShadow: '0 0 10px rgba(0,0,0,0.2)',
              }}
            >
              Anime<span className="text-gray-400">Verse</span>
            </h2>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive =
                location.pathname === link.to ||
                (link.to !== '/' && location.pathname.startsWith(link.to));
              return (
                <Link key={link.to} to={link.to}>
                  <div
                    className="flex items-center gap-2 py-2 rounded transition-all duration-200 font-semibold tracking-wide uppercase text-sm hover:scale-105"
                    style={{
                      color: isActive ? activeColor : textColor,
                      fontWeight: isActive ? '700' : '600',
                    }}
                  >
                    {link.label}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Search */}
          <div className="relative w-60 hidden sm:block">
            <Search
              className="absolute left-3 top-2.5 w-4 h-4 opacity-60"
              style={{ color: textColor }}
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search anime..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 150)} // petit délai pour éviter la disparition avant le clic
              onKeyDown={handleKeyDown}
              className="pl-9 pr-10 py-2 rounded-lg text-sm w-full bg-transparent focus:ring-2 outline-none transition-all duration-300"
              style={{
                color: textColor,
                border:
                  mode === 'dark'
                    ? '1px solid rgba(255,255,255,0.15)'
                    : '1px solid rgba(0,0,0,0.08)',
                backgroundColor:
                  mode === 'dark'
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(0,0,0,0.05)',
                boxShadow: isFocused
                  ? `0 0 0 2px ${primaryColors.main}40`
                  : 'none',
              }}
              aria-label="Search anime"
            />

            {/* X ou Ctrl+K */}
            {searchTerm || isFocused ? (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2 text-gray-400 hover:text-red-400 transition-all duration-200"
                aria-label="Clear search"
                style={{ color: textColor }}
              >
                <X size={18} />
              </button>
            ) : (
              <div
                className="absolute right-2 top-[9px] text-[11px] font-semibold px-2 py-[2px] rounded-md opacity-70 select-none"
                style={{
                  color: textColor,
                  border: `1px solid ${textColor}40`,
                  backgroundColor:
                    mode === 'dark'
                      ? 'rgba(255,255,255,0.15)'
                      : 'rgba(0,0,0,0.15)',
                  transition: 'opacity 0.3s',
                }}
              >
                Ctrl + K
              </div>
            )}

            {/* Suggestions */}
            {isFocused && suggestions.length > 0 && (
              <div
                className="absolute top-11 left-0 w-full max-h-64 overflow-y-auto rounded-lg shadow-lg z-50 border"
                style={{
                  borderColor:
                    mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  backgroundColor: mode === 'dark' ? '#1f1f1f' : '#fff',
                  color: textColor,
                }}
              >
                {suggestions.map((anime, index) => (
                  <div
                    key={anime.id}
                    onClick={() => {
                      navigate(`/details/${anime.id}`);
                      setSuggestions([]);
                      setSearchTerm('');
                      setIsFocused(false);
                    }}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-all ${
                      index === selectedIndex
                        ? 'bg-gray-200 dark:bg-gray-700'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <img
                      src={anime.image_url || '/no-image.png'}
                      className="w-8 h-8 rounded object-cover"
                    />
                    <span className="truncate text-sm font-medium">
                      {anime.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={inverseMode}
              className="p-2 rounded-full hover:rotate-12 transition-all duration-300"
              aria-label="Toggle dark mode"
              style={{ color: textColor }}
            >
              {mode === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {currentUser ? (
              <>
                <span
                  className="flex items-center gap-2 text-sm font-semibold rounded-2xl py-2"
                  style={{ color: textColor, backdropFilter: 'blur(6px)' }}
                >
                  <User size={16} /> {currentUser.username}
                </span>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold border border-white/20 transition-all duration-200 hover:scale-105"
                  style={{
                    color: textColor,
                    backgroundColor: primaryColors.main + '40',
                  }}
                >
                  <LogOut size={16} /> Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <button
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-all duration-200 hover:scale-105"
                    style={{
                      backgroundColor: primaryColors.main,
                      color: mode === 'dark' ? '#fff' : '#000',
                    }}
                  >
                    <LogIn size={16} /> Login
                  </button>
                </Link>
                <Link to="/signup">
                  <button
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold border border-white/20 transition-all duration-200 hover:scale-105"
                    style={{ color: textColor }}
                  >
                    <UserPlus size={16} /> Sign Up
                  </button>
                </Link>
              </>
            )}

            <button
              onClick={() => setModalOpen(true)}
              className="p-2 rounded-full hover:rotate-45 transition-transform"
              aria-label="Settings"
            >
              <Settings size={20} style={{ color: textColor }} />
            </button>
          </div>
        </div>
      </div>

      <SettingsModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
