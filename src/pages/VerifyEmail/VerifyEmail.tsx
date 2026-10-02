import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import { api } from '../../api/api';

import './VerifyEmail.css';

type Status =
  | 'loading'
  | 'success'
  | 'error';

const VerifyEmail = () => {
  const navigate = useNavigate();

  const [
    searchParams,
  ] = useSearchParams();

  const verificationStarted =
    useRef(false);

  const [
    status,
    setStatus,
  ] = useState<Status>('loading');

  const [
    message,
    setMessage,
  ] = useState(
    'Estamos verificando tu correo...'
  );

  useEffect(() => {
    if (
      verificationStarted.current
    ) {
      return;
    }

    verificationStarted.current = true;

    const verify = async () => {
      const token =
        searchParams.get('token');

      if (!token) {
        setStatus('error');

        setMessage(
          'El enlace de verificación no contiene un token válido.'
        );

        return;
      }

      try {
        const response =
          await api.get(
            '/auth/verify-email',
            {
              params: {
                token,
              },
            }
          );

        setStatus('success');

        setMessage(
          response.data?.message ||
            'Correo verificado correctamente. Ya puedes iniciar sesión.'
        );

      } catch (error: any) {
        console.error(
          'VERIFY EMAIL ERROR:',
          error.response?.data ||
            error
        );

        const code =
          error.response?.data
            ?.code;

        const backendMessage =
          error.response?.data
            ?.message;

        if (
          code ===
          'EMAIL_ALREADY_VERIFIED'
        ) {
          setStatus('success');

          setMessage(
            backendMessage ||
              'Tu correo ya estaba verificado. Ya puedes iniciar sesión.'
          );

          return;
        }

        if (
          code ===
          'VERIFICATION_TOKEN_EXPIRED'
        ) {
          setStatus('error');

          setMessage(
            backendMessage ||
              'El enlace de verificación ha expirado.'
          );

          return;
        }

        if (
          code ===
          'INVALID_VERIFICATION_TOKEN'
        ) {
          setStatus('error');

          setMessage(
            backendMessage ||
              'El enlace de verificación no es válido o ya fue utilizado.'
          );

          return;
        }

        setStatus('error');

        setMessage(
          backendMessage ||
            'No fue posible verificar tu correo.'
        );
      }
    };

    verify();

  }, [searchParams]);

  return (
    <div className="verify-email-page">

      <div className="verify-email-card">

        {status === 'loading' && (
          <>
            <div className="verify-email-loader" />

            <h1>
              Verificando correo
            </h1>

            <p>
              {message}
            </p>

            <span className="verify-email-helper">
              Esto solo tomará unos segundos.
            </span>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="verify-email-icon success">
              ✓
            </div>

            <h1>
              Cuenta verificada
            </h1>

            <p>
              {message}
            </p>

            <button
              type="button"
              className="verify-email-button"
              onClick={() =>
                navigate('/login')
              }
            >
              Iniciar sesión
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="verify-email-icon error">
              !
            </div>

            <h1>
              No pudimos verificar tu cuenta
            </h1>

            <p>
              {message}
            </p>

            <button
              type="button"
              className="verify-email-button"
              onClick={() =>
                navigate('/login')
              }
            >
              Ir al inicio de sesión
            </button>
          </>
        )}

      </div>

    </div>
  );
};

export default VerifyEmail;