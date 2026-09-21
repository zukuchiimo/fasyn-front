import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { api } from '../../api/api';
import logo from '../../assets/logo.png';

import './Login.css';

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [
    specialistDisabled,
    setSpecialistDisabled,
  ] = useState(false);

  const handleCloseDisabledModal = () => {
    setSpecialistDisabled(false);
    setPassword('');
  };

  const supportEmail =
    'rbenito@fasyn.com';

  const supportMailSubject =
    'Solicitud de revisión de cuenta de especialista';

  const supportMailBody =
    `Hola equipo de FASYN,%0D%0A%0D%0A` +
    `Mi cuenta de especialista aparece como dada de baja y no puedo ingresar al panel profesional.%0D%0A%0D%0A` +
    `Correo asociado a mi cuenta: ${encodeURIComponent(email)}%0D%0A%0D%0A` +
    `Solicito por favor la revisión del estado de mi cuenta.%0D%0A%0D%0A` +
    `Gracias.`;

  const supportMailUrl =
    `mailto:${supportEmail}` +
    `?subject=${encodeURIComponent(
      supportMailSubject
    )}` +
    `&body=${supportMailBody}`;

  const handleLogin = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError('');
      setSpecialistDisabled(false);

      /*
        1. LOGIN
      */
      const response =
        await api.post(
          '/auth/login',
          {
            email,
            password,
          }
        );

      const {
        token,
        user,
      } = response.data;

      /*
        2. GUARDAR SESIÓN
        Se guarda de manera temporal porque,
        si es especialista, primero validamos
        su estado real en PostgreSQL.
      */
      localStorage.setItem(
        'token',
        token
      );

      localStorage.setItem(
        'user',
        JSON.stringify(user)
      );

      console.log(
        'USUARIO LOGIN:',
        user
      );

      /*
        3. CLIENTE
      */
      if (
        user.role ===
        'CLIENT'
      ) {
        navigate('/client');
        return;
      }

      /*
        4. ADMIN
      */
      if (
        user.role ===
        'ADMIN'
      ) {
        navigate('/admin');
        return;
      }

      /*
        5. ESPECIALISTA
      */
      if (
        user.role ===
        'SPECIALIST'
      ) {
        try {
          /*
            CONSULTAMOS SU PERFIL REAL
            EN POSTGRESQL
          */
          const profileResponse =
            await api.get(
              '/specialists/profile',
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          console.log(
            'PERFIL ESPECIALISTA:',
            profileResponse.data
          );

          const profile =
            profileResponse.data
              ?.profile ??
            profileResponse.data;

          console.log(
            'PROFILE COMPLETED:',
            profile
              ?.profileCompleted
          );

          console.log(
            'SPECIALIST AVAILABLE:',
            profile?.available,
            typeof profile?.available
          );

          /*
            ESPECIALISTA DADO DE BAJA

            available = false significa que
            el administrador lo dio de baja.

            Eliminamos la sesión para impedir
            que continúe navegando con este login
            y mostramos el modal.
          */
          if (
            profile?.available ===
            false
          ) {
            localStorage.removeItem(
              'token'
            );

            localStorage.removeItem(
              'user'
            );

            setSpecialistDisabled(
              true
            );

            setLoading(false);

            return;
          }

          /*
            PERFIL COMPLETO
          */
          if (
            profile
              ?.profileCompleted ===
            true
          ) {
            navigate(
              '/specialist',
              {
                replace: true,
              }
            );

            return;
          }

          /*
            PERFIL INCOMPLETO
          */
          navigate(
            '/specialist/setup',
            {
              replace: true,
            }
          );

          return;

        } catch (
          profileError: any
        ) {
          console.log(
            'ERROR PERFIL:',
            profileError
              .response?.data ||
              profileError
          );

          /*
            SI TODAVÍA NO EXISTE
            PERFIL, LO MANDAMOS
            AL REGISTRO
          */
          if (
            profileError
              .response
              ?.status === 404
          ) {
            navigate(
              '/specialist/setup'
            );

            return;
          }

          throw profileError;
        }
      }

      navigate('/');

    } catch (error: any) {
      console.error(
        'LOGIN ERROR:',
        error.response?.data ||
          error
      );

      setError(
        error.response
          ?.data?.message ||
          'No fue posible iniciar sesión. Verifica tu correo y contraseña.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <section className="login-brand">

        <Link
          to="/"
          className="brand-logo"
        >
          <img
            src={logo}
            alt="FASYN"
          />
        </Link>

        <div className="brand-content">

          <span className="brand-label">
            SERVICIOS PARA TU HOGAR Y NEGOCIO
          </span>

          <h1>
            Encuentra al especialista
            <span>
              {' '}
              que necesitas.
            </span>
          </h1>

          <p className="brand-description">
            Conecta con profesionales
            para resolver trabajos,
            reparaciones,
            mantenimiento y
            proyectos de forma
            sencilla.
          </p>

          <div className="services-preview">

            <div className="service-item">

              <span className="service-index">
                01
              </span>

              <div>
                <strong>
                  Carpintería
                </strong>

                <p>
                  Reparación,
                  instalación y
                  fabricación.
                </p>
              </div>

            </div>

            <div className="service-item">

              <span className="service-index">
                02
              </span>

              <div>
                <strong>
                  Plomería
                </strong>

                <p>
                  Instalaciones,
                  fugas y
                  mantenimiento.
                </p>
              </div>

            </div>

            <div className="service-item">

              <span className="service-index">
                03
              </span>

              <div>
                <strong>
                  Pintura
                </strong>

                <p>
                  Interiores,
                  exteriores y
                  acabados.
                </p>
              </div>

            </div>

            <div className="service-item">

              <span className="service-index">
                04
              </span>

              <div>
                <strong>
                  Y mucho más
                </strong>

                <p>
                  Especialistas para
                  cada tipo de
                  proyecto.
                </p>
              </div>

            </div>

          </div>

        </div>

        <div className="brand-footer">

          <span>
            FASYN
          </span>

          <span>
            Encuentra. Contrata.
            Resuelve.
          </span>

        </div>

      </section>

      <section className="login-access">

        <div className="login-card">

          <div className="login-heading">

            <span className="access-label">
              ACCESO
            </span>

            <h2>
              Bienvenido
            </h2>

            <p>
              Ingresa a tu cuenta
              para continuar en
              FASYN.
            </p>

          </div>

          <form
            onSubmit={
              handleLogin
            }
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

            <div className="form-field">

              <div className="password-header">

                <label htmlFor="password">
                  Contraseña
                </label>

                <a href="#">
                  ¿Olvidaste tu
                  contraseña?
                </a>

              </div>

              <input
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                autoComplete="current-password"
                required
              />

            </div>

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading
                ? 'Ingresando...'
                : 'Iniciar sesión'}
            </button>

          </form>

          <div className="create-account">

            <span>
              ¿Todavía no tienes
              cuenta?
            </span>

            <Link to="/register">
              Crear una cuenta
            </Link>

          </div>

          <div className="login-separator">

            <span />

            <p>
              o
            </p>

            <span />

          </div>

          <Link
            to="/specialists"
            className="explore-button"
          >
            Explorar especialistas
          </Link>

          <p className="specialist-message">
            ¿Ofreces servicios
            profesionales? Crea tu
            perfil en FASYN y conecta
            con nuevos clientes.
          </p>

        </div>

      </section>

      {specialistDisabled && (
        <div
          className="specialist-disabled-backdrop"
          role="presentation"
        >
          <div
            className="specialist-disabled-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="specialist-disabled-title"
          >
            <div className="specialist-disabled-icon">
              !
            </div>

            <span className="specialist-disabled-label">
              CUENTA DE ESPECIALISTA
            </span>

            <h2
              id="specialist-disabled-title"
            >
              Tu perfil fue dado de baja
            </h2>

            <p>
              Tu cuenta de especialista se
              encuentra deshabilitada y por
              el momento no puedes ingresar
              al panel profesional.
            </p>

            <div className="specialist-disabled-notice">
              <strong>
                ¿Consideras que se trata de un error?
              </strong>

              <span>
                Puedes enviar un correo al equipo
                de FASYN explicando tu caso para
                solicitar la revisión de tu cuenta.
              </span>

              <a
                className="specialist-disabled-email"
                href={supportMailUrl}
              >
                rbenito@fasyn.com
              </a>
            </div>

            <div className="specialist-disabled-actions">
              <a
                className="specialist-disabled-contact-button"
                href={supportMailUrl}
              >
                Enviar correo a soporte
              </a>

              <button
                type="button"
                className="specialist-disabled-button"
                onClick={
                  handleCloseDisabledModal
                }
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Login;
