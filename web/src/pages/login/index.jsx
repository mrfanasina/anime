import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, Lock, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import clsx from 'clsx';
import { useSelector, useDispatch } from 'react-redux';
import { login } from '../../controllers/auth';
import toast from 'react-hot-toast';
import { toggleMode } from '../../redux/themeSlice';

const TextInput = React.forwardRef(
  ({ label, icon: Icon, type, id, error, darkMode, ...rest }, ref) => {
    const inputBg = darkMode ? '#1e293b' : '#ffffff';
    const inputText = darkMode ? '#f1f5f9' : '#111827';

    return (
      <div>
        <label htmlFor={id} className="block font-medium mb-1">{label}</label>
        <div
          className={clsx(
            'flex items-center border rounded-lg px-3 focus-within:ring-2 transition-colors',
            error ? 'border-red-500 focus-within:ring-red-400' : 'focus-within:ring-opacity-50',
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
          )}
          style={{ borderColor: error ? '#f87171' : undefined }}
        >
          <Icon className={clsx('w-5 h-5 mr-2', error ? 'text-red-500' : 'text-gray-500')} />
          <input
            id={id}
            type={type}
            ref={ref}
            aria-invalid={error ? 'true' : 'false'}
            className={clsx(
              'flex-1 py-2 outline-none bg-transparent placeholder-gray-400',
              darkMode ? 'text-gray-100' : 'text-gray-900'
            )}
            style={{
              '--input-bg': inputBg,
              '--input-text': inputText
            }}
            {...rest}
          />
        </div>
        {error && (
          <p role="alert" className="text-red-500 text-sm mt-1">{error.message}</p>
        )}
      </div>
    );
  }
);

export default function Login() {
  const theme = useSelector(state => state.theme);
  const dispatch = useDispatch();
  const { primaryColors, secondaryColors, mode } = theme;
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

  const bg = darkMode ? '#0f172a' : secondaryColors.accent + '33';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 transition-colors duration-500" style={{ backgroundColor: bg }}>
      <div className={clsx(
        'p-8 rounded-2xl shadow-2xl w-full max-w-sm transition-colors duration-500',
        darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'
      )}>
        {/* Theme Toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => dispatch(toggleMode())}
            className={clsx(
              'p-2 rounded-full transition-colors duration-300',
              darkMode ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
            )}
            aria-label="Basculer le mode clair/sombre"
          >
            {darkMode ? <Sun size={20}/> : <Moon size={20}/>}
          </button>
        </div>

        <h2 className="text-2xl font-bold mb-2 text-center" style={{ color: primaryColors.main }}>Se connecter</h2>
        <p className={clsx('text-center mb-6', darkMode ? 'text-gray-400' : 'text-gray-600')}>Aniwatch</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <TextInput
            id="login"
            label="Nom d’utilisateur ou e-mail"
            icon={User}
            type="text"
            placeholder="Votre e-mail ou nom d'utilisateur"
            {...register('login', { required: 'Ce champ est requis.' })}
            error={errors.login}
            darkMode={darkMode}
          />

          <div>
            <label htmlFor="password" className="block font-medium mb-1">Mot de passe</label>
            <div className={clsx(
              'flex items-center border rounded-lg px-3 focus-within:ring-2 transition-colors',
              errors.password ? 'border-red-500 focus-within:ring-red-400' : 'focus-within:ring-opacity-50',
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
            )}>
              <Lock className={clsx('w-5 h-5 mr-2', errors.password ? 'text-red-500' : 'text-gray-500')}/>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Entrez votre mot de passe"
                {...register('password', { required: 'Le mot de passe est requis.', minLength: { value: 6, message: 'Au moins 6 caractères.' } })}
                className={clsx(
                  'flex-1 py-2 outline-none bg-transparent placeholder-gray-400',
                  darkMode ? 'text-gray-100' : 'text-gray-900'
                )}
                style={{
                  '--input-bg': darkMode ? '#1e293b' : '#ffffff',
                  '--input-text': darkMode ? '#f1f5f9' : '#111827'
                }}
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="ml-2 text-gray-500 hover:text-gray-700 focus:outline-none" aria-label={showPassword ? 'Masquer' : 'Afficher'}>
                {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
              </button>
            </div>
            {errors.password && <p role="alert" className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
          </div>

          <div className="flex items-center mb-4">
            <input type="checkbox" id="rememberMe" {...register('rememberMe')} className="mr-2 h-4 w-4 text-green-600 border-gray-300 rounded"/>
            <label htmlFor="rememberMe">Se souvenir de moi</label>
          </div>

          <button type="submit" disabled={submitting} aria-busy={submitting} className="w-full py-2 rounded-lg font-medium transition-colors duration-300 mb-3" style={{ backgroundColor: primaryColors.main + '50' }}>
            {submitting ? 'Connexion…' : 'Se connecter'}
          </button>

          <p className="text-center mt-2">
            Pas de compte ? <button type="button" onClick={() => window.location.href='/signup'} className="font-medium text-blue-500">Créer un compte</button>
          </p>
          <p className="text-center mt-2">
            <button type="button" onClick={() => window.location.href='/home'} className="font-medium px-7 rounded-2xl transition-colors" style={{ backgroundColor: primaryColors.accent + '30' }}>Continuer sans compte</button>
          </p>
        </form>
      </div>
    </div>
  );
}