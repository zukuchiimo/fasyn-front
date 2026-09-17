 import { useNavigate } from 'react-router-dom';

import './ClientDashboard.css';
const activeRequests = [
  {
    id: 1,
    specialist: 'Juan Pérez',
    service: 'Reparación de muebles',
    date: '15 Sep',
    status: 'Confirmada',
  },
  {
    id: 2,
    specialist: 'María López',
    service: 'Limpieza profesional',
    date: '18 Sep',
    status: 'Pendiente',
  },
];

const favorites = [
  {
    id: 1,
    initials: 'JP',
    name: 'Juan Pérez',
    specialty: 'Carpintero',
    rating: 4.9,
    price: '$250 / hora',
  },
  {
    id: 2,
    initials: 'CR',
    name: 'Carlos Ramírez',
    specialty: 'Electricista',
    rating: 4.9,
    price: '$350 / hora',
  },
];

const ClientDashboard = () => {
     const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    navigate('/login');
  };
  return (
    <div className="client-dashboard">

      <aside className="client-sidebar">

        <a href="/" className="client-logo">
          Feisin
        </a>

        <div className="client-user">
          <div className="client-avatar">
            RH
          </div>

          <div>
            <strong>Roberto Hernández</strong>
            <span>Cliente</span>
          </div>
        </div>

        <nav className="client-menu">
          <a href="/client" className="active">
            ◫ Inicio
          </a>

          <a href="/specialists">
            ⌕ Buscar especialistas
          </a>

          <a href="#">
            ◉ Mis solicitudes
          </a>

          <a href="#">
            ♡ Favoritos
          </a>

          <a href="#">
            ✓ Historial
          </a>

          <a href="#">
            ♙ Mi perfil
          </a>
        </nav>

        <div className="client-sidebar-bottom">
          <a href="/">← Volver a Feisin</a>
  <button
  type="button"
  onClick={handleLogout}
>
  Cerrar sesión
</button>
        </div>

      </aside>

      <main className="client-main">

        <header className="client-header">

          <div>
            <h1>Hola, Roberto 👋</h1>
            <p>
              Encuentra profesionales y administra tus servicios.
            </p>
          </div>

          <a
            href="/specialists"
            className="find-specialist-button"
          >
            + Buscar especialista
          </a>

        </header>

        <section className="client-stats">

          <article>
            <div className="client-stat-icon">
              ◉
            </div>

            <div>
              <span>Solicitudes activas</span>
              <strong>2</strong>
              <small>Servicios en proceso</small>
            </div>
          </article>

          <article>
            <div className="client-stat-icon">
              📅
            </div>

            <div>
              <span>Próximos servicios</span>
              <strong>1</strong>
              <small>Esta semana</small>
            </div>
          </article>

          <article>
            <div className="client-stat-icon">
              ♡
            </div>

            <div>
              <span>Favoritos</span>
              <strong>6</strong>
              <small>Especialistas guardados</small>
            </div>
          </article>

          <article>
            <div className="client-stat-icon">
              ✓
            </div>

            <div>
              <span>Servicios realizados</span>
              <strong>12</strong>
              <small>Historial completo</small>
            </div>
          </article>

        </section>

        <div className="client-grid">

          <section className="client-panel">

            <div className="client-panel-header">

              <div>
                <h2>Mis solicitudes</h2>
                <p>
                  Consulta el estado de tus servicios.
                </p>
              </div>

              <button>
                Ver todas
              </button>

            </div>

            <div className="client-request-list">

              {activeRequests.map((request) => (
                <article
                  className="client-request"
                  key={request.id}
                >

                  <div className="request-specialist">

                    <div className="request-avatar">
                      {request.specialist
                        .split(' ')
                        .map((word) => word.charAt(0))
                        .join('')
                        .slice(0, 2)}
                    </div>

                    <div>
                      <strong>
                        {request.specialist}
                      </strong>

                      <span>
                        {request.service}
                      </span>
                    </div>

                  </div>

                  <div className="client-request-date">
                    <small>Fecha</small>
                    <strong>{request.date}</strong>
                  </div>

                  <span
                    className={`client-request-status ${request.status.toLowerCase()}`}
                  >
                    {request.status}
                  </span>

                  <button className="client-details-button">
                    Ver detalle
                  </button>

                </article>
              ))}

            </div>

          </section>

          <aside className="client-next-service">

            <span className="next-label">
              PRÓXIMO SERVICIO
            </span>

            <div className="next-date">
              <strong>15</strong>
              <span>SEP</span>
            </div>

            <h3>Reparación de muebles</h3>

            <p>
              Con Juan Pérez
            </p>

            <div className="next-service-info">
              <span>🕐 10:00 AM</span>
              <span>📍 Ciudad de México</span>
            </div>

            <button>
              Ver servicio
            </button>

          </aside>

        </div>

        <section className="client-panel favorites-section">

          <div className="client-panel-header">

            <div>
              <h2>Tus especialistas favoritos</h2>
              <p>
                Profesionales que guardaste para contratar después.
              </p>
            </div>

            <button>
              Ver favoritos
            </button>

          </div>

          <div className="client-favorites">

            {favorites.map((favorite) => (
              <article
                className="client-favorite-card"
                key={favorite.id}
              >

                <div className="favorite-avatar">
                  {favorite.initials}
                </div>

                <div className="favorite-info">

                  <h3>{favorite.name}</h3>

                  <span>{favorite.specialty}</span>

                  <div>
                    ★ {favorite.rating}
                  </div>

                </div>

                <div className="favorite-price">
                  <small>Desde</small>
                  <strong>{favorite.price}</strong>
                </div>

                <a
                  href={`/specialists/${favorite.id}`}
                  className="favorite-profile-button"
                >
                  Ver perfil
                </a>

              </article>
            ))}

          </div>

        </section>

      </main>

    </div>
  );
};

export default ClientDashboard;