import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, Mail, Lock, Eye, EyeOff, UserPlus, ArrowLeft } from 'lucide-react';
import clsx from 'clsx';
import { useSelector } from 'react-redux';
import { signup } from '../../controllers/auth';
import toast from 'react-hot-toast';

// Import de ton image de fond (utilise la même ou une autre dans assets)
import backgroundImage from '../../assets/background-signup.jpg'; 

const TextInput = React.forwardRef(
  ({ label, icon: Icon, type, id, error, darkMode, rightElement, ...rest }, ref) => (
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
  )
);

export default function SignUp() {
  const theme = useSelector((state) => state.theme);
  const { primaryColors, mode } = theme;
  const darkMode = mode === 'dark';

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, setError, formState: { errors }, watch } = useForm({
    mode: 'onBlur',
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = useCallback(async (data) => {
    setSubmitting(true);
    try {
      await signup(data);
      toast.success('Compte créé avec succès !');
      window.location.href = '/login';
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
      {/* Overlay de contraste */}
      <div className={clsx(
        "absolute inset-0 transition-opacity duration-500",
        darkMode ? "bg-black/70" : "bg-white/40 backdrop-blur-[5px]"
      )} />

          <div className={clsx(
            'relative p-8 rounded-3xl shadow-2xl w-full max-w-md border transition-all duration-500 z-10',
            // Effet Glassmorphism ici
            darkMode 
              ? 'bg-gray-900/40 border-white/10 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]' 
              : 'bg-white/30 border-white/40 backdrop-blur-md shadow-[0_8px_32px_0_rgba(31,38,135,0.15)]'
          )}>
          <div className="mb-8">
          <h2 className="text-3xl font-black tracking-tight mb-1" style={{ color: primaryColors.main }}>
            Rejoindre l'aventure
          </h2>
          <p className={clsx('text-sm', darkMode ? 'text-gray-400' : 'text-gray-500')}>
            Créez votre compte <span className="font-bold text-blue-500">Aniwatch</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <TextInput
            id="username"
            label="Nom d’utilisateur"
            icon={User}
            type="text"
            placeholder="Ex: MonkeyDLuffy"
            {...register('username', { required: 'Le nom d’utilisateur est requis' })}
            error={errors.username}
            darkMode={darkMode}
          />

          <TextInput
            id="email"
            label="E-mail"
            icon={Mail}
            type="email"
            placeholder="nom@exemple.com"
            {...register('email', { 
              required: 'L’e-mail est requis',
              pattern: { value: /^\S+@\S+$/i, message: 'Email invalide' }
            })}
            error={errors.email}
            darkMode={darkMode}
          />

          <TextInput
            id="password"
            label="Mot de passe"
            icon={Lock}
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            {...register('password', {
              required: 'Mot de passe requis',
              minLength: { value: 6, message: 'Au moins 6 caractères' },
            })}
            error={errors.password}
            darkMode={darkMode}
            rightElement={
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600 focus:outline-none">
                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            }
          />

          <TextInput
            id="confirmPassword"
            label="Confirmer le mot de passe"
            icon={Lock}
            type={showConfirm ? 'text' : 'password'}
            placeholder="••••••••"
            {...register('confirmPassword', {
              required: 'Confirmation requise',
              validate: value => value === watch('password') || 'Les mots de passe ne correspondent pas',
            })}
            error={errors.confirmPassword}
            darkMode={darkMode}
            rightElement={
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-gray-400 hover:text-gray-600 focus:outline-none">
                {showConfirm ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            }
          />

          <button
            type="submit"
            disabled={submitting}
            className={clsx(
              "w-full py-3 rounded-xl font-bold text-white transition-all transform active:scale-[0.98] flex items-center justify-center space-x-2 mt-4",
              submitting ? "opacity-70 cursor-not-allowed" : "hover:shadow-lg hover:brightness-110"
            )}
            style={{ backgroundColor: primaryColors.main }}
          >
            {submitting ? (
              <span>Création en cours...</span>
            ) : (
              <>
                <span>Créer mon compte</span>
                <UserPlus size={18} />
              </>
            )}
          </button>

          <div className="pt-4 border-t dark:border-gray-800 border-gray-100">
            <button
              type="button"
              onClick={() => (window.location.href = '/login')}
              className={clsx(
                "w-full flex items-center justify-center space-x-2 text-sm font-medium transition-colors p-2 rounded-lg hover:bg-gray-500/10",
                darkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
              )}
            >
              <ArrowLeft size={16} />
              <span>Déjà un compte ? Se connecter</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}