import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, Lock, Eye, EyeOff, Sun, Moon, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { useSelector, useDispatch } from 'react-redux';
import { login } from '../../controllers/auth';
import toast from 'react-hot-toast';
import { toggleMode } from '../../redux/themeSlice';

// Import de ton image de fond
import backgroundImage from '../../assets/background-login.jpg'; // Vérifie le nom et l'extension

const TextInput = React.forwardRef(
  ({ label, icon: Icon, type, id, error, darkMode, rightElement, ...rest }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        <label htmlFor={id} className={clsx(
          "block text-sm font-semibold transition-colors",
          darkMode ? "text-gray-300" : "text-gray-700"
        )}>
          {label}
        </label>
        <div className="relative group">
          <div className={clsx(
            'flex items-center border rounded-xl px-3 transition-all duration-200 ring-offset-2',
            error 
              ? 'border-red-500 bg-red-50/10' 
              : 'border-gray-300 dark:border-gray-700 focus-within:ring-2 focus-within:border-transparent',
            darkMode ? 'bg-gray-800/50 focus-within:ring-blue-500' : 'bg-white focus-within:ring-blue-600'
          )}>
            <Icon className={clsx('w-5 h-5 mr-2 shrink-0', error ? 'text-red-500' : 'text-gray-400 group-focus-within:text-blue-500')} />
            <input
              id={id}
              type={type}
              ref={ref}
              className={clsx(
                'flex-1 py-2.5 outline-none bg-transparent text-sm placeholder-gray-500 w-full',
                darkMode ? 'text-gray-100' : 'text-gray-900'
              )}
              {...rest}
            />
            {rightElement}
          </div>
          {error && (
            <p role="alert" className="text-red-500 text-xs mt-1 animate-in fade-in slide-in-from-top-1">
              {error.message}
            </p>
          )}
        </div>
      </div>
    );
  }
);

export default function Login() {
  const theme = useSelector(state => state.theme);
  const dispatch = useDispatch();
  const { primaryColors, mode } = theme;
  const darkMode = mode === 'dark';

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    mode: 'onBlur',
    defaultValues: { login: '', password: '', rememberMe: false }
  });

  const onSubmit = useCallback(async (data) => {
    setSubmitting(true);
    try {
      await login(data);
      window.location.href = '/home'; 
    } catch (err) {
      if (err.field) setError(err.field, { type: 'server', message: err.message });
      else toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }, [setError]);

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 transition-colors duration-500 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      {/* Overlay pour la lisibilité (plus sombre en dark mode) */}
      <div className={clsx(
        "absolute inset-0 transition-opacity duration-500",
        darkMode ? "bg-black/70" : "bg-white/40 backdrop-blur-[5px]"
      )} />
        <div className={clsx(
          'relative p-8 rounded-3xl shadow-2xl w-full max-w-md border transition-all duration-500 z-10',
          // Effet Glassmorphism ici
          darkMode 
            ? 'bg-gray-900/40 border-white/10 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]' 
            : 'bg-white/30 border-white/40 backdrop-blur-md shadow-[0_8px_32px_0_rgba(31,38,135,0.15)]'
        )}>
        
        {/* Toggle Theme Button */}
        <button
          onClick={() => dispatch(toggleMode())}
          className="absolute top-6 right-6 p-2 rounded-xl hover:scale-110 transition-transform backdrop-blur-md"
        >
          {darkMode ? <Sun size={18} className="text-yellow-400"/> : <Moon size={18} className="text-gray-600"/>}
        </button>

        <div className="mb-8">
          <h2 className="text-3xl font-black tracking-tight mb-1" style={{ color: primaryColors.main }}>
            Bon retour !
          </h2>
          <p className={clsx('text-sm', darkMode ? 'text-gray-400' : 'text-gray-500')}>
            Connectez-vous à <span className="font-bold text-blue-500">Aniwatch</span> pour continuer.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <TextInput
            id="login"
            label="Utilisateur ou E-mail"
            icon={User}
            type="text"
            placeholder="Ex: luffy@grandline.com"
            {...register('login', { required: 'Ce champ est requis.' })}
            error={errors.login}
            darkMode={darkMode}
          />

          <TextInput
            id="password"
            label="Mot de passe"
            icon={Lock}
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            {...register('password', { 
              required: 'Le mot de passe est requis.', 
              minLength: { value: 6, message: 'Minimum 6 caractères.' } 
            })}
            error={errors.password}
            darkMode={darkMode}
            rightElement={
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
              >
                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            }
          />

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center space-x-2 cursor-pointer group">
              <input 
                type="checkbox" 
                {...register('rememberMe')} 
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Se souvenir de moi</span>
            </label>
            <button type="button" className="text-blue-500 hover:underline font-medium">Oublié ?</button>
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            className={clsx(
              "w-full py-3 rounded-xl font-bold text-white transition-all transform active:scale-[0.98] flex items-center justify-center space-x-2",
              submitting ? "opacity-70 cursor-not-allowed" : "hover:shadow-lg hover:brightness-110"
            )}
            style={{ backgroundColor: primaryColors.main }}
          >
            <span>{submitting ? 'Connexion en cours...' : 'Se connecter'}</span>
            {!submitting && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="mt-8 space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t dark:border-gray-800 border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className={clsx("px-2", darkMode ? "bg-gray-900 text-gray-500" : "bg-white text-gray-400")}>Ou</span>
            </div>
          </div>

          <button 
            onClick={() => window.location.href='/home'}
            className={clsx(
              "w-full py-2.5 rounded-xl border-2 transition-all font-medium",
              darkMode 
                ? "border-gray-800 hover:bg-gray-800 text-gray-300" 
                : "border-gray-100 hover:bg-gray-50 text-gray-600"
            )}
          >
            Continuer en invité
          </button>

          <p className="text-center text-sm">
            <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Nouveau ici ?</span>{' '}
            <button 
              onClick={() => window.location.href='/signup'} 
              className="text-blue-500 font-bold hover:underline"
            >
              Créer un compte
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}