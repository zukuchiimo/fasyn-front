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
const [needsVerification, setNeedsVerification] =
  useState(false);

const [resending, setResending] =
  useState(false);

const [verificationSent, setVerificationSent] =
  useState(false);
  const [

    confirmPassword,

    setConfirmPassword,

  ] = useState('');

  const [

    showConfirmPassword,

    setShowConfirmPassword,

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

      setMessage('');

      setMessageType('');

      if (password.length < 6) {

        setMessage(
          'La contraseña debe tener al menos 6 caracteres.'
        );

        setMessageType('error');

        return;
      }

      if (password !== confirmPassword) {

        setMessage(
          'Las contraseñas no coinciden.'
        );

        setMessageType('error');

        return;
      }

      try {

        setLoading(true);

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

              confirmPassword,

              role,

            }

          );

        setMessage(

          response.data?.message ||

            'Cuenta creada. Revisa tu correo electrónico para verificar tu cuenta.'

        );

        setMessageType(

          'success'

        );

        setPassword('');
        setConfirmPassword('');

      } 
      catch (

        error: any

      ) {

        if (
  error.response?.data?.code ===
  'EMAIL_NOT_VERIFIED'
) {
  setMessage(
    'Este correo ya está registrado pero todavía no ha sido verificado.'
  );

  setMessageType('error');
  setNeedsVerification(true);

  return;
}

setMessage(
  error.response?.data?.message ||
    'No fue posible crear la cuenta.'
);

setMessageType('error');

      } finally {

        setLoading(false);

      }

    };
const handleResendVerification = async () => {
  try {
    setResending(true);
    setVerificationSent(false);

    await api.post(
      '/auth/resend-verification',
      {
        email: email.trim().toLowerCase(),
      }
    );

    setVerificationSent(true);
    setMessage(
      'Te enviamos un nuevo correo de verificación.'
    );
    setMessageType('success');
    setNeedsVerification(false);
  } catch (error: any) {
    setMessage(
      error.response?.data?.message ||
        'No fue posible reenviar el correo de verificación.'
    );
    setMessageType('error');
  } finally {
    setResending(false);
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

                    onChange={(event) => {
                      setPassword(
                        event.target.value
                      );

                      if (messageType === 'error') {
                        setMessage('');
                        setMessageType('');
                      }
                    }}

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

              <div className="register-field">

                <div className="register-label-row">

                  <label htmlFor="register-confirm-password">
                    Confirmar contraseña
                  </label>

                  <small>
                    Repite tu contraseña
                  </small>

                </div>

                <div
                  className="register-input register-password-input"
                  style={
                    confirmPassword
                      ? password === confirmPassword
                        ? {
                            borderColor: '#16a34a',
                            boxShadow:
                              '0 0 0 3px rgba(22, 163, 74, 0.10)',
                          }
                        : {
                            borderColor: '#dc2626',
                            boxShadow:
                              '0 0 0 3px rgba(220, 38, 38, 0.10)',
                          }
                      : undefined
                  }
                >
                  <span>
                    ●
                  </span>

                  <input
                    id="register-confirm-password"
                    type={
                      showConfirmPassword
                        ? 'text'
                        : 'password'
                    }
                    autoComplete="new-password"
                    placeholder="Confirma tu contraseña"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(
                        event.target.value
                      );

                      if (messageType === 'error') {
                        setMessage('');
                        setMessageType('');
                      }
                    }}
                    minLength={6}
                    required
                    aria-invalid={
                      Boolean(
                        confirmPassword &&
                        password !== confirmPassword
                      )
                    }
                  />

                  <button
                    type="button"
                    className="register-password-toggle"
                    onClick={() =>
                      setShowConfirmPassword(
                        (previous) => !previous
                      )
                    }
                  >
                    {showConfirmPassword
                      ? 'Ocultar'
                      : 'Ver'}
                  </button>
                </div>

                {confirmPassword &&
                  password !== confirmPassword && (
                    <div
                      role="alert"
                      aria-live="polite"
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        marginTop: '10px',
                        padding: '12px 14px',
                        border: '1px solid #fecaca',
                        borderRadius: '12px',
                        background: '#fef2f2',
                        color: '#991b1b',
                      }}
                    >
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          background: '#dc2626',
                          color: '#ffffff',
                          fontWeight: 800,
                        }}
                      >
                        !
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                        <strong>
                          Las contraseñas no coinciden
                        </strong>

                        <span
                          style={{
                            fontSize: '13px',
                            lineHeight: 1.4,
                          }}
                        >
                          Verifica que ambas contraseñas
                          sean exactamente iguales.
                        </span>
                      </div>
                    </div>
                  )}

                {confirmPassword &&
                  password === confirmPassword && (
                    <div
                      aria-live="polite"
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        marginTop: '10px',
                        padding: '12px 14px',
                        border: '1px solid #bbf7d0',
                        borderRadius: '12px',
                        background: '#f0fdf4',
                        color: '#166534',
                      }}
                    >
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          background: '#16a34a',
                          color: '#ffffff',
                          fontWeight: 800,
                        }}
                      >
                        ✓
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                        <strong>
                          Contraseñas correctas
                        </strong>

                        <span
                          style={{
                            fontSize: '13px',
                            lineHeight: 1.4,
                          }}
                        >
                          Ambas contraseñas coinciden.
                        </span>
                      </div>
                    </div>
                  )}

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
                  role={
                    messageType === 'error'
                      ? 'alert'
                      : 'status'
                  }
                  aria-live="polite"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '16px',
                    borderRadius: '14px',
                    border:
                      messageType === 'success'
                        ? '1px solid #bbf7d0'
                        : '1px solid #fecaca',
                    background:
                      messageType === 'success'
                        ? '#f0fdf4'
                        : '#fef2f2',
                    color:
                      messageType === 'success'
                        ? '#166534'
                        : '#991b1b',
                    boxShadow:
                      messageType === 'success'
                        ? '0 8px 24px rgba(22, 163, 74, 0.08)'
                        : '0 8px 24px rgba(220, 38, 38, 0.08)',
                  }}
                >
                  <span
                    style={{
                      width: '32px',
                      height: '32px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      background:
                        messageType === 'success'
                          ? '#16a34a'
                          : '#dc2626',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '16px',
                    }}
                  >
                    {messageType === 'success'
                      ? '✓'
                      : '!'}
                  </span>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <strong>
                      {messageType === 'success'
                        ? 'Revisa tu correo'
                        : 'No pudimos crear tu cuenta'}
                    </strong>

                    <p
                      style={{
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      {message}
                    </p>
                    {needsVerification && (
  <button
    type="button"
    onClick={handleResendVerification}
    disabled={resending}
    style={{
      marginTop: '10px',
      alignSelf: 'flex-start',
      border: 0,
      background: 'transparent',
      color: '#2563eb',
      fontWeight: 700,
      cursor: resending
        ? 'not-allowed'
        : 'pointer',
      padding: 0,
    }}
  >
    {resending
      ? 'Reenviando...'
      : 'Reenviar verificación'}
  </button>
)}
                  </div>
                </div>
              )}

              <button

                type="submit"

                className="register-submit"

                disabled={
                  loading ||
                  !password ||
                  !confirmPassword ||
                  password !== confirmPassword
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