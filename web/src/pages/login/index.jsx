import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';
import { useSelector } from 'react-redux';
import { login } from '../../controllers/auth';
import toast from 'react-hot-toast';

const TextInput = React.forwardRef(
  ({ label, icon: Icon, type, id, error, themeColors, ...rest }, ref) => (
    <div>
      <label htmlFor={id} className="block font-medium mb-1" style={{ color: themeColors.main }}>
        {label}
      </label>
      <div
        className={clsx(
          'flex items-center border rounded-lg px-3 focus-within:ring-2 transition-colors',
          error
            ? 'border-red-500 focus-within:ring-red-400'
            : 'border-gray-300 focus-within:ring-opacity-50'
        )}
        style={{ borderColor: error ? '#f87171' : themeColors.main }}
      >
        <Icon className={clsx('w-5 h-5 mr-2', error ? 'text-red-500' : themeColors.main)} />
        <input
          id={id}
          type={type}
          ref={ref}
          aria-invalid={error ? 'true' : 'false'}
          className="flex-1 py-2 outline-none"
          {...rest}
        />
      </div>
      {error && (
        <p role="alert" className="text-red-500 text-sm mt-1">
          {error.message}
        </p>
      )}
    </div>
  )
);

export default function Login() {
  const theme = useSelector((state) => state.theme);
  const { primaryColors, secondaryColors } = theme;

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    mode: 'onBlur',
    defaultValues: { login: '', password: '', rememberMe: false },
  });

  const onSubmit = useCallback(
    async (data) => {
      setSubmitting(true);
      try {
        await login(data);
        window.location.href = '/';
      } catch (err) {
        if (err.field) {
          setError(err.field, { type: 'server', message: err.message });
        } else {
          toast.error(err.message);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [setError]
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: secondaryColors.accent + '33' }}
    >
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm">
        <h2
          className="text-2xl font-bold mb-2 text-center"
          style={{ color: primaryColors.main }}
        >
          Se connecter
        </h2>
        <p className="text-center text-gray-600 mb-6">Aniwatch</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <TextInput
            id="login"
            label="Nom d’utilisateur ou e-mail"
            icon={User}
            type="text"
            placeholder="Votre e-mail ou nom d'utilisateur"
            {...register('login', { required: "Ce champ est requis." })}
            error={errors.login}
            themeColors={primaryColors}
          />

          <div>
            <label
              htmlFor="password"
              className="block font-medium mb-1"
              style={{ color: primaryColors.main }}
            >
              Mot de passe
            </label>
            <div
              className={clsx(
                'flex items-center border rounded-lg px-3 focus-within:ring-2 transition-colors',
                errors.password
                  ? 'border-red-500 focus-within:ring-red-400'
                  : 'border-gray-300 focus-within:ring-opacity-50'
              )}
              style={{ borderColor: errors.password ? '#f87171' : primaryColors.main }}
            >
              <Lock className={clsx('w-5 h-5 mr-2', errors.password ? 'text-red-500' : primaryColors.main)} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Entrez votre mot de passe"
                aria-invalid={errors.password ? 'true' : 'false'}
                {...register('password', {
                  required: 'Le mot de passe est requis.',
                  minLength: { value: 6, message: 'Au moins 6 caractères.' },
                })}
                className={`flex-1 py-2 outline-none ${errors.password ? 'text-red-500' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                className="ml-2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p role="alert" className="text-red-500 text-sm mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="rememberMe"
              {...register('rememberMe')}
              className="mr-2 h-4 w-4 text-green-600 border-gray-300 rounded"
            />
            <label htmlFor="rememberMe" className="text-gray-700">
              Se souvenir de moi
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="w-full py-2 rounded-lg text-white font-medium transition-colors duration-300 mb-3"
            style={{
              backgroundColor: primaryColors.main,
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = primaryColors.accent}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = primaryColors.main}
          >
            {submitting ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin h-5 w-5 mr-2 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="opacity-25"
                  />
                  <path
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    className="opacity-75"
                  />
                </svg>
                Connexion…
              </span>
            ) : (
              'Se connecter'
            )}
          </button>

          <p className="text-center mt-2">
            Pas de compte ?{' '}
            <button
              type="button"
              onClick={() => (window.location.href = '/signup')}
              className="font-medium"
              style={{ color: primaryColors.main }}
            >
              Créer un compte
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
