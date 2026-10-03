import { useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../../api/api';

import logo from '../../assets/logo.png';

import './ForgotPassword.css';

const ForgotPassword = () => {
  const [email, setEmail] =
    useState('');

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

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response =
        await api.post(
          '/auth/forgot-password',
          {
            email,
          }
        );

      setSuccess(
        response.data?.message ||
          'Si existe una cuenta asociada a ese correo, recibirás instrucciones para cambiar tu contraseña.'
      );
    } catch (error: any) {
      console.error(
        'FORGOT PASSWORD ERROR:',
        error.response?.data ||
          error
      );

      setError(
        error.response?.data
          ?.message ||
          'No fue posible procesar la recuperación de contraseña.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-card">

        <Link
          to="/"
          className="forgot-password-logo"
        >
          <img
            src={logo}
            alt="FASYN"
          />
        </Link>

        <span className="forgot-password-label">
          RECUPERAR CONTRASEÑA
        </span>

        <h1>
          ¿Olvidaste tu contraseña?
        </h1>

        <p className="forgot-password-description">
          Ingresa el correo asociado
          a tu cuenta y te enviaremos
          instrucciones para crear
          una nueva contraseña.
        </p>

        <form
          onSubmit={handleSubmit}
        >
          <div className="form-field">
            <label htmlFor="email">
              Correo electrónico
            </label>

            <input
              id="email"
              type="email"
              placeholder="nombre@correo.com"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              autoComplete="email"
              required
            />
          </div>

          {error && (
            <div className="forgot-error">
              {error}
            </div>
          )}

          {success && (
            <div className="forgot-success">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="forgot-submit"
            disabled={loading}
          >
            {loading
              ? 'Enviando...'
              : 'Enviar instrucciones'}
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

export default ForgotPassword;