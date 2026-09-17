import {
  FormEvent,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import { api } from '../../api/api';
import logo from '../../assets/logo.png';

import './Register.css';

type Role =
  | 'CLIENT'
  | 'SPECIALIST';

type MessageType =
  | 'success'
  | 'error'
  | '';

const Register = () => {
  const navigate = useNavigate();

  const [
    role,
    setRole,
  ] = useState<Role>('CLIENT');

  const [
    name,
    setName,
  ] = useState('');

  const [
    email,
    setEmail,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState('');

  const [
    messageType,
    setMessageType,
  ] = useState<MessageType>('');

  const [
    loading,
    setLoading,
  ] = useState(false);

  const handleRegister =
    async (
      event: FormEvent
    ) => {
      event.preventDefault();

      try {
        setLoading(true);
        setMessage('');
        setMessageType('');

        const response =
          await api.post(
            '/auth/register',
            {
              name:
                name.trim(),
              email:
                email
                  .trim()
                  .toLowerCase(),
              password,
              role,
            }
          );

        setMessage(
          response.data?.message ||
            'Cuenta creada correctamente.'
        );

        setMessageType(
          'success'
        );

        /*
          Limpiamos contraseña,
          pero conservamos nombre
          y correo para que el usuario
          vea qué cuenta creó.
        */
        setPassword('');
      } catch (
        error: any
      ) {
        console.error(
          'REGISTER ERROR:',
          error.response?.data ||
            error
        );

        setMessage(
          error.response?.data
            ?.message ||
            'No fue posible crear la cuenta.'
        );

        setMessageType(
          'error'
        );
      } finally {
        setLoading(false);
      }
    };

  const handleRoleChange = (
    selectedRole: Role
  ) => {
    setRole(
      selectedRole
    );

    setMessage('');
    setMessageType('');
  };

  return (
    <div className="register-page">

      {/* ========================= */}
      {/* NAVBAR */}
      {/* ========================= */}

      <header className="register-navbar">

        <div className="register-navbar-inner">

          <button
            type="button"
            className="register-brand"
            onClick={() =>
              navigate('/')
            }
          >
            <img
              src={logo}
              alt="FASYN"
            />
          </button>

          <div className="register-navbar-right">

            <span>
              ¿Ya tienes una cuenta?
            </span>

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/login'
                )
              }
            >
              Iniciar sesión
            </button>

          </div>

        </div>

      </header>

      {/* ========================= */}
      {/* CONTENIDO */}
      {/* ========================= */}

      <main className="register-main">

        {/* ========================= */}
        {/* PANEL IZQUIERDO */}
        {/* ========================= */}

        <section className="register-intro">

          <div className="register-intro-glow register-intro-glow-one" />
          <div className="register-intro-glow register-intro-glow-two" />

          <div className="register-intro-content">

            <div className="register-intro-badge">
              <span />

              ÚNETE A FASYN
            </div>

            <h1>
              Una cuenta.

              <strong>
                {' '}
                Nuevas posibilidades.
              </strong>
            </h1>

            <p>
              Conecta con especialistas
              para resolver lo que
              necesitas o convierte tu
              experiencia en nuevas
              oportunidades de trabajo.
            </p>

            <div className="register-intro-features">

              <div>

                <span>
                  01
                </span>

                <div>
                  <strong>
                    Encuentra profesionales
                  </strong>

                  <small>
                    Explora especialistas
                    y servicios disponibles.
                  </small>
                </div>

              </div>

              <div>

                <span>
                  02
                </span>

                <div>
                  <strong>
                    Solicita servicios
                  </strong>

                  <small>
                    Envía solicitudes
                    directamente desde
                    FASYN.
                  </small>
                </div>

              </div>

              <div>

                <span>
                  03
                </span>

                <div>
                  <strong>
                    Ofrece tu experiencia
                  </strong>

                  <small>
                    Publica tus servicios
                    y conecta con nuevos
                    clientes.
                  </small>
                </div>

              </div>

            </div>

            <div className="register-intro-footer">

              <strong>
                FASYN
              </strong>

              <span>
                Find All Specialists
                You Need
              </span>

            </div>

          </div>

        </section>

        {/* ========================= */}
        {/* FORMULARIO */}
        {/* ========================= */}

        <section className="register-form-area">

          <div className="register-card">

            <div className="register-header">

              <span>
                CREAR CUENTA
              </span>

              <h2>
                Comienza en FASYN
              </h2>

              <p>
                Selecciona cómo quieres
                utilizar la plataforma.
              </p>

            </div>

            {/* ========================= */}
            {/* ROLES */}
            {/* ========================= */}

            <div className="register-role-selector">

              <button
                type="button"
                className={
                  role === 'CLIENT'
                    ? 'register-role-card active'
                    : 'register-role-card'
                }
                onClick={() =>
                  handleRoleChange(
                    'CLIENT'
                  )
                }
              >

                <div className="register-role-icon">
                  👤
                </div>

                <div className="register-role-copy">

                  <strong>
                    Necesito un servicio
                  </strong>

                  <small>
                    Buscar y contratar
                    especialistas
                  </small>

                </div>

                <div className="register-role-check">
                  {role ===
                    'CLIENT' &&
                    '✓'}
                </div>

              </button>

              <button
                type="button"
                className={
                  role ===
                  'SPECIALIST'
                    ? 'register-role-card active'
                    : 'register-role-card'
                }
                onClick={() =>
                  handleRoleChange(
                    'SPECIALIST'
                  )
                }
              >

                <div className="register-role-icon">
                  🛠️
                </div>

                <div className="register-role-copy">

                  <strong>
                    Quiero ofrecer servicios
                  </strong>

                  <small>
                    Publicar mi trabajo y
                    conseguir clientes
                  </small>

                </div>

                <div className="register-role-check">
                  {role ===
                    'SPECIALIST' &&
                    '✓'}
                </div>

              </button>

            </div>

            {/* ========================= */}
            {/* FORM */}
            {/* ========================= */}

            <form
              className="register-form"
              onSubmit={
                handleRegister
              }
            >

              <div className="register-field">

                <label
                  htmlFor="register-name"
                >
                  Nombre completo
                </label>

                <div className="register-input">

                  <span>
                    👤
                  </span>

                  <input
                    id="register-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Ej. Roberto Hernández"
                    value={name}
                    onChange={(
                      event
                    ) =>
                      setName(
                        event
                          .target
                          .value
                      )
                    }
                    required
                  />

                </div>

              </div>

              <div className="register-field">

                <label
                  htmlFor="register-email"
                >
                  Correo electrónico
                </label>

                <div className="register-input">

                  <span>
                    @
                  </span>

                  <input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(
                      event
                    ) =>
                      setEmail(
                        event
                          .target
                          .value
                      )
                    }
                    required
                  />

                </div>

              </div>

              <div className="register-field">

                <div className="register-label-row">

                  <label
                    htmlFor="register-password"
                  >
                    Contraseña
                  </label>

                  <small>
                    Mínimo 6 caracteres
                  </small>

                </div>

                <div className="register-input register-password-input">

                  <span>
                    ●
                  </span>

                  <input
                    id="register-password"
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    autoComplete="new-password"
                    placeholder="Crea una contraseña"
                    value={password}
                    onChange={(
                      event
                    ) =>
                      setPassword(
                        event
                          .target
                          .value
                      )
                    }
                    minLength={6}
                    required
                  />

                  <button
                    type="button"
                    className="register-password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (
                          previous
                        ) =>
                          !previous
                      )
                    }
                  >
                    {showPassword
                      ? 'Ocultar'
                      : 'Ver'}
                  </button>

                </div>

              </div>

              {/* TIPO CUENTA */}

              <div className="register-account-summary">

                <span>
                  TIPO DE CUENTA
                </span>

                <strong>
                  {role ===
                  'CLIENT'
                    ? 'Cliente'
                    : 'Especialista'}
                </strong>

                <small>
                  {role ===
                  'CLIENT'
                    ? 'Podrás buscar profesionales y enviar solicitudes de servicio.'
                    : 'Después del registro completarás tu perfil profesional.'}
                </small>

              </div>

              {/* MENSAJE */}

              {message && (

                <div
                  className={`register-message ${messageType}`}
                >

                  <span>
                    {messageType ===
                    'success'
                      ? '✓'
                      : '!'}
                  </span>

                  <div>

                    <strong>
                      {messageType ===
                      'success'
                        ? 'Cuenta creada'
                        : 'No se pudo completar el registro'}
                    </strong>

                    <p>
                      {message}
                    </p>

                  </div>

                </div>

              )}

              <button
                type="submit"
                className="register-submit"
                disabled={
                  loading
                }
              >

                {loading
                  ? 'Creando cuenta...'
                  : 'Crear cuenta'}

                {!loading && (
                  <span>
                    →
                  </span>
                )}

              </button>

            </form>

            {/* ========================= */}
            {/* LOGIN */}
            {/* ========================= */}

            <div className="register-login">

              <span>
                ¿Ya tienes una cuenta?
              </span>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/login'
                  )
                }
              >
                Inicia sesión
              </button>

            </div>

            <small className="register-legal">
              Al crear una cuenta aceptas
              los términos y condiciones
              de uso de FASYN.
            </small>

          </div>

        </section>

      </main>

    </div>
  );
};

export default Register;