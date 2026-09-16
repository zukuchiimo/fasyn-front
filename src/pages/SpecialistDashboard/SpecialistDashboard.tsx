import './SpecialistDashboard.css';

const services = [
  {
    id: 1,
    name: 'Reparación de muebles',
    price: '$250',
    type: 'Hora',
    status: 'Activo',
  },
  {
    id: 2,
    name: 'Armado de muebles',
    price: '$600',
    type: 'Actividad',
    status: 'Activo',
  },
  {
    id: 3,
    name: 'Carpintería por jornada',
    price: '$1,800',
    type: 'Día',
    status: 'Activo',
  },
];

const requests = [
  {
    id: 1,
    client: 'Laura Martínez',
    service: 'Reparación de muebles',
    date: '15 Sep',
    status: 'Nueva',
  },
  {
    id: 2,
    client: 'Carlos Ramírez',
    service: 'Armado de muebles',
    date: '16 Sep',
    status: 'Confirmada',
  },
  {
    id: 3,
    client: 'Andrea López',
    service: 'Carpintería por jornada',
    date: '18 Sep',
    status: 'Pendiente',
  },
];

const SpecialistDashboard = () => {
  return (
    <div className="specialist-dashboard">

      <aside className="dashboard-sidebar">
        <a href="/" className="dashboard-logo">
          Feisin
        </a>

        <div className="dashboard-user">
          <div className="dashboard-avatar">
            JP
          </div>

          <div>
            <strong>Juan Pérez</strong>
            <span>Carpintero</span>
          </div>
        </div>

        <nav className="dashboard-menu">
          <a className="active" href="/specialist">
            ◫ Inicio
          </a>

          <a href="#">
            ◉ Solicitudes
          </a>

          <a href="#">
            🛠 Mis servicios
          </a>

          <a href="#">
            ★ Opiniones
          </a>

          <a href="#">
            ♙ Mi perfil
          </a>
        </nav>

        <div className="dashboard-sidebar-bottom">
          <a href="/">← Volver a Feisin</a>
          <button>Cerrar sesión</button>
        </div>
      </aside>

      <main className="dashboard-main">

        <header className="dashboard-topbar">
          <div>
            <h1>Hola, Juan 👋</h1>
            <p>
              Aquí tienes un resumen de tu actividad.
            </p>
          </div>

          <button className="publish-button">
            + Publicar servicio
          </button>
        </header>

        <section className="dashboard-stats">

          <article>
            <div className="stat-icon">
              $
            </div>

            <div>
              <span>Ingresos del mes</span>
              <strong>$12,500</strong>
              <small className="positive">
                ↑ 12% este mes
              </small>
            </div>
          </article>

          <article>
            <div className="stat-icon">
              ◉
            </div>

            <div>
              <span>Solicitudes nuevas</span>
              <strong>5</strong>
              <small>
                Requieren tu atención
              </small>
            </div>
          </article>

          <article>
            <div className="stat-icon">
              ✓
            </div>

            <div>
              <span>Trabajos completados</span>
              <strong>24</strong>
              <small>
                Total del mes
              </small>
            </div>
          </article>

          <article>
            <div className="stat-icon">
              ★
            </div>

            <div>
              <span>Calificación</span>
              <strong>4.9</strong>
              <small>
                127 opiniones
              </small>
            </div>
          </article>

        </section>

        <div className="dashboard-grid">

          <section className="dashboard-panel">

            <div className="panel-header">
              <div>
                <h2>Solicitudes recientes</h2>
                <p>
                  Clientes interesados en tus servicios.
                </p>
              </div>

              <button>
                Ver todas
              </button>
            </div>

            <div className="request-table">

              <div className="request-row request-head">
                <span>Cliente</span>
                <span>Servicio</span>
                <span>Fecha</span>
                <span>Estado</span>
              </div>

              {requests.map((request) => (
                <div
                  className="request-row"
                  key={request.id}
                >
                  <strong>{request.client}</strong>

                  <span>{request.service}</span>

                  <span>{request.date}</span>

                  <span
                    className={`request-status ${request.status.toLowerCase()}`}
                  >
                    {request.status}
                  </span>
                </div>
              ))}

            </div>

          </section>

          <aside className="dashboard-profile-card">

            <div className="profile-completion">
              <div className="completion-top">
                <div>
                  <span>Perfil profesional</span>
                  <strong>80%</strong>
                </div>
              </div>

              <div className="progress-background">
                <div className="progress-value"></div>
              </div>

              <p>
                Completa tu perfil para generar más confianza.
              </p>

              <button>
                Completar perfil
              </button>
            </div>

            <div className="availability-box">
              <div>
                <strong>Disponible para trabajar</strong>
                <span>
                  Tu perfil aparece en búsquedas
                </span>
              </div>

              <label className="switch">
                <input
                  type="checkbox"
                  defaultChecked
                />
                <span className="slider"></span>
              </label>
            </div>

          </aside>

        </div>

        <section className="dashboard-panel services-panel">

          <div className="panel-header">
            <div>
              <h2>Mis servicios</h2>
              <p>
                Administra lo que ofreces en Feisin.
              </p>
            </div>

            <button>
              + Agregar servicio
            </button>
          </div>

          <div className="dashboard-services">

            {services.map((service) => (
              <article
                className="dashboard-service-card"
                key={service.id}
              >
                <div className="service-icon">
                  🛠
                </div>

                <div className="dashboard-service-info">
                  <h3>{service.name}</h3>

                  <span>
                    {service.type}
                  </span>
                </div>

                <div className="dashboard-service-price">
                  <strong>{service.price}</strong>
                  <small>
                    / {service.type.toLowerCase()}
                  </small>
                </div>

                <span className="service-active">
                  {service.status}
                </span>

                <button className="service-menu">
                  •••
                </button>
              </article>
            ))}

          </div>

        </section>

      </main>

    </div>
  );
};

export default SpecialistDashboard;