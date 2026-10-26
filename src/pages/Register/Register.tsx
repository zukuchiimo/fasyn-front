import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/api';
import logo from '../../assets/fasyn_logo_transparente.png';
import './Register.css';

type MessageType = 'success' | 'error' | '';
const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*\d).{6,12}$/;

const Register = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('');
  const [loading, setLoading] = useState(false);

  const passwordChecks = [
    { label: 'De 6 a 12 caracteres', ok: password.length >= 6 && password.length <= 12 },
    { label: 'Una letra mayúscula', ok: /[A-Z]/.test(password) },
    { label: 'Un número', ok: /\d/.test(password) },
  ];

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setMessageType('');
    setNeedsVerification(false);

    if (!PASSWORD_RULE.test(password)) {
      setMessage('La contraseña debe tener entre 6 y 12 caracteres, al menos una mayúscula y un número.');
      setMessageType('error');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Las contraseñas no coinciden.');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/auth/register', {
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
      });
      setMessage(response.data?.message || 'Cuenta creada. Revisa tu correo para verificarla.');
      setMessageType('success');
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      if (error.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        setMessage('Este correo ya está registrado pero todavía no ha sido verificado.');
        setMessageType('error');
        setNeedsVerification(true);
        return;
      }
      setMessage(error.response?.data?.message || 'No fue posible crear la cuenta.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setResending(true);
      await api.post('/auth/resend-verification', { email: email.trim().toLowerCase() });
      setMessage('Te enviamos un nuevo correo de verificación.');
      setMessageType('success');
      setNeedsVerification(false);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'No fue posible reenviar el correo de verificación.');
      setMessageType('error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="register-page">
      <header className="register-navbar">
        <div className="register-navbar-inner">
          <button type="button" className="register-brand" onClick={() => navigate('/')}>
            <img src={logo} alt="FASYN" />
          </button>
          <div className="register-navbar-right">
            <span>¿Ya tienes una cuenta?</span>
            <button type="button" onClick={() => navigate('/login')}>Iniciar sesión</button>
          </div>
        </div>
      </header>

      <main className="register-main">
        <section className="register-intro">
          <div className="register-intro-glow register-intro-glow-one" />
          <div className="register-intro-glow register-intro-glow-two" />
          <div className="register-intro-content">
            <div className="register-intro-badge"><span />ÚNETE A FASYN</div>
            <h1>Una cuenta.<strong> Nuevas posibilidades.</strong></h1>
            <p>Conecta con especialistas para resolver lo que necesitas o convierte tu experiencia en nuevas oportunidades de trabajo.</p>
            <div className="register-intro-features">
              <div><span>01</span><div><strong>Encuentra profesionales</strong><small>Explora especialistas y servicios disponibles.</small></div></div>
              <div><span>02</span><div><strong>Solicita servicios</strong><small>Envía solicitudes directamente desde FASYN.</small></div></div>
              <div><span>03</span><div><strong>Ofrece tu experiencia</strong><small>Completa tu perfil y conecta con nuevos clientes.</small></div></div>
            </div>
            <div className="register-intro-footer"><strong>FASYN</strong><span>Find All Specialists You Need</span></div>
          </div>
        </section>

        <section className="register-form-area">
          <div className="register-card">
            <div className="register-header">
              <span>CREAR CUENTA</span>
              <h2>Comienza en FASYN</h2>
              <p>Solo necesitas tu correo y una contraseña. Completarás tu perfil después.</p>
            </div>
            <form className="register-form" onSubmit={handleRegister}>
              <div className="register-field">
                <label htmlFor="register-email">Correo electrónico</label>
                <div className="register-input">
                  <span>@</span>
                  <input id="register-email" type="email" autoComplete="email" placeholder="correo@ejemplo.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
                </div>
              </div>
              <div className="register-field">
                <div className="register-label-row">
                  <label htmlFor="register-password">Contraseña</label>
                  <small>6–12 caracteres</small>
                </div>
                <div className="register-input register-password-input">
                  <span>●</span>
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Crea una contraseña"
                    value={password}
                    onChange={(event) => { setPassword(event.target.value); if (messageType === 'error') { setMessage(''); setMessageType(''); } }}
                    minLength={6}
                    maxLength={12}
                    required
                  />
                  <button type="button" className="register-password-toggle" onClick={() => setShowPassword((value) => !value)}>
                    {showPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
                <div aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10, fontSize: 13 }}>
                  {passwordChecks.map((check) => (
                    <span key={check.label} style={{ color: check.ok ? '#15803d' : '#64748b' }}>
                      {check.ok ? '✓' : '○'} {check.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="register-field">
                <div className="register-label-row">
                  <label htmlFor="register-confirm-password">Confirmar contraseña</label>
                  <small>Repite tu contraseña</small>
                </div>
                <div className="register-input register-password-input">
                  <span>●</span>
                  <input
                    id="register-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Confirma tu contraseña"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={6}
                    maxLength={12}
                    required
                    aria-invalid={Boolean(confirmPassword && password !== confirmPassword)}
                  />
                  <button type="button" className="register-password-toggle" onClick={() => setShowConfirmPassword((value) => !value)}>
                    {showConfirmPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
                {confirmPassword && (
                  <small aria-live="polite" style={{ color: password === confirmPassword ? '#15803d' : '#dc2626' }}>
                    {password === confirmPassword ? '✓ Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
                  </small>
                )}
              </div>
              {message && (
                <div className={`register-message ${messageType}`} role={messageType === 'error' ? 'alert' : 'status'} aria-live="polite">
                  <strong>{messageType === 'success' ? 'Registro de FASYN' : 'Revisa tus datos'}</strong>
                  <p>{message}</p>
                  {needsVerification && (
                    <button type="button" onClick={handleResendVerification} disabled={resending}>
                      {resending ? 'Reenviando...' : 'Reenviar verificación'}
                    </button>
                  )}
                </div>
              )}
              <button type="submit" className="register-submit" disabled={loading || !email.trim() || !PASSWORD_RULE.test(password) || !confirmPassword || password !== confirmPassword}>
                {loading ? 'Creando cuenta...' : 'Crear cuenta'} {!loading && <span>→</span>}
              </button>
            </form>
            <div className="register-login">
              <span>¿Ya tienes una cuenta?</span>
              <button type="button" onClick={() => navigate('/login')}>Inicia sesión</button>
            </div>
            <small className="register-legal">Al crear una cuenta aceptas los términos y condiciones de uso de FASYN.</small>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Register;
