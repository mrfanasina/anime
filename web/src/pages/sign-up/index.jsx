import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';
import { useSelector } from 'react-redux';
import { signup } from '../../controllers/auth';
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

export default function SignUp() {
  const theme = useSelector((state) => state.theme);
  const { primaryColors, secondaryColors } = theme;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, setError, formState: { errors }, watch } = useForm({
    mode: 'onBlur',
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = useCallback(async (data) => {
    setSubmitting(true);
    console.log("sb");
    
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
      className="min-h-screen flex items-center justify-center px-4"
    >
      <div className="p-8 rounded-2xl shadow-2xl w-full max-w-sm"
          style={{ backgroundColor: secondaryColors.accent + '33' }}  
        >
        <h2 className="text-2xl font-bold mb-2 text-center" style={{ color: primaryColors.main }}>
          Créer un compte
        </h2>
        <p className="text-center text-gray-600 mb-6">Aniwatch</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <TextInput
            id="username"
            label="Nom d’utilisateur"
            icon={User}
            type="text"
            placeholder="Votre nom d'utilisateur"
            {...register('username', { required: 'Nom d’utilisateur requis' })}
            error={errors.username}
            themeColors={primaryColors}
          />

          <TextInput
            id="email"
            label="E-mail"
            icon={Mail}
            type="email"
            placeholder="Votre e-mail"
            {...register('email', { required: 'E-mail requis' })}
            error={errors.email}
            themeColors={primaryColors}
          />

          <div>
            <label htmlFor="password" className="block font-medium mb-1" style={{ color: primaryColors.main }}>
              Mot de passe
            </label>
            <div
              className={clsx(
                'flex items-center border rounded-lg px-3 focus-within:ring-2 transition-colors',
                errors.password ? 'border-red-500 focus-within:ring-red-400' : 'border-gray-300 focus-within:ring-opacity-50'
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
                  required: 'Mot de passe requis',
                  minLength: { value: 6, message: 'Au moins 6 caractères' },
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

          <div>
            <label htmlFor="confirmPassword" className="block font-medium mb-1" style={{ color: primaryColors.main }}>
              Confirmer le mot de passe
            </label>
            <div className="flex items-center border rounded-lg px-3 focus-within:ring-2 transition-colors" style={{ borderColor: primaryColors.main }}>
              <Lock className="w-5 h-5 mr-2" style={{ color: primaryColors.main }} />
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirmez le mot de passe"
                aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                {...register('confirmPassword', {
                  required: 'Confirmation requise',
                  validate: value => value === watch('password') || 'Les mots de passe ne correspondent pas',
                })}
                className="flex-1 py-2 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                className="ml-2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p role="alert" className="text-red-500 text-sm mt-1">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="w-full py-2 rounded-lg text-white font-medium transition-colors duration-300"
            style={{ backgroundColor: primaryColors.main }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = primaryColors.accent}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = primaryColors.main}
          >
            {submitting ? 'Création…' : 'Créer un compte'}
          </button>

          <p className="text-center mt-2 text-gray-600">
            Déjà un compte ?{' '}
            <button
              type="button"
              onClick={() => (window.location.href = '/login')}
              className="font-medium"
              style={{ color: primaryColors.main }}
            >
              Se connecter
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
