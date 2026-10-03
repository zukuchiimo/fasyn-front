import {
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import { api } from '../../api/api';

import logo from '../../assets/logo.png';

import './ResetPassword.css';

const ResetPassword = () => {
  const navigate =
    useNavigate();

  const [searchParams] =
    useSearchParams();

  const token =
    searchParams.get('token') || '';

  const [password, setPassword] =
    useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    if (!token) {
      setError(
        'El enlace de recuperación no contiene un token válido.'
      );

      return;
    }

    if (password.length < 8) {
      setError(
        'La contraseña debe tener al menos 8 caracteres.'
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        'Las contraseñas no coinciden.'
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await api.post(
          '/auth/reset-password',
          {
            token,
            password,
          }
        );

      setSuccess(
        response.data?.message ||
          'Tu contraseña fue actualizada correctamente.'
      );

      setPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        navigate(
          '/login',
          {
            replace: true,
          }
        );
      }, 2000);

    } catch (error: any) {
      console.error(
        'RESET PASSWORD ERROR:',
        error.response?.data ||
          error
      );

      setError(
        error.response?.data
          ?.message ||
          'No fue posible cambiar la contraseña.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-page">
      <div className="reset-password-card">

        <Link
          to="/"
          className="reset-password-logo"
        >
          <img
            src={logo}
            alt="FASYN"
          />
        </Link>

        <span className="reset-password-label">
          NUEVA CONTRASEÑA
        </span>

        <h1>
          Crea una nueva contraseña
        </h1>

        <p className="reset-password-description">
          Ingresa una nueva contraseña
          para recuperar el acceso
          a tu cuenta.
        </p>

        <form
          onSubmit={handleSubmit}
        >
          <div className="form-field">
            <label htmlFor="password">
              Nueva contraseña
            </label>

            <input
              id="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              autoComplete="new-password"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="confirmPassword">
              Confirmar contraseña
            </label>

            <input
              id="confirmPassword"
              type="password"
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(
                  e.target.value
                )
              }
              autoComplete="new-password"
              required
            />
          </div>

          {error && (
            <div className="reset-error">
              {error}
            </div>
          )}

          {success && (
            <div className="reset-success">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="reset-submit"
            disabled={loading}
          >
            {loading
              ? 'Actualizando...'
              : 'Cambiar contraseña'}
          </button>
        </form>

        <Link
          to="/login"
          className="back-login"
        >
          Volver a iniciar sesión
        </Link>

      </div>
    </div>
  );
};

export default ResetPassword;