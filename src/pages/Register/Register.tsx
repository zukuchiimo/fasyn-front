import { useState } from 'react';
import { api } from '../../api/api';
import './Register.css';

type Role = 'CLIENT' | 'SPECIALIST';

const Register = () => {
  const [role, setRole] = useState<Role>('CLIENT');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setMessage('');

      const response = await api.post('/auth/register', {
        name,
        email,
        password,
        role,
      });

      setMessage(response.data.message);
    } catch (error: any) {
      setMessage(
        error.response?.data?.message || 'Error al registrar usuario'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-info">
          <a href="/" className="register-logo">
            Feisin
          </a>

          <h1>
            Encuentra oportunidades.
            <span> Encuentra especialistas.</span>
          </h1>

          <p>
            Una plataforma para conectar clientes con profesionales de
            confianza.
          </p>

          <div className="register-benefits">
            <span>✓ Profesionales y clientes en un solo lugar</span>
            <span>✓ Servicios por hora, día o actividad</span>
            <span>✓ Perfiles, reputación y experiencia</span>
          </div>
        </div>

        <div className="register-card">
          <div className="register-header">
            <h2>Crear cuenta</h2>
            <p>Selecciona cómo quieres usar Feisin</p>
          </div>

          <div className="role-selector">
            <button
              type="button"
              className={role === 'CLIENT' ? 'role active' : 'role'}
              onClick={() => setRole('CLIENT')}
            >
              <span className="role-icon">👤</span>

              <div>
                <strong>Necesito un servicio</strong>
                <small>Quiero contratar especialistas</small>
              </div>
            </button>

            <button
              type="button"
              className={role === 'SPECIALIST' ? 'role active' : 'role'}
              onClick={() => setRole('SPECIALIST')}
            >
              <span className="role-icon">🛠️</span>

              <div>
                <strong>Quiero ofrecer servicios</strong>
                <small>Quiero conseguir nuevos clientes</small>
              </div>
            </button>
          </div>

          <form onSubmit={handleRegister}>
            <label>
              Nombre completo
              <input
                type="text"
                placeholder="Ej. Roberto Hernández"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{  color: 'black' }}
              />
            </label>

            <label>
              Correo electrónico
              <input
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                  style={{  color: 'black' }}
              />
            </label>

            <label>
              Contraseña
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                
              />
            </label>

            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          {message && (
            <div className="register-message">
              {message}
            </div>
          )}

          <div className="login-link">
            ¿Ya tienes una cuenta? <a href="/login">Inicia sesión</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;