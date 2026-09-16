import { useParams } from 'react-router-dom';
import './SpecialistProfile.css';

const specialist = {
  id: 1,
  name: 'Juan Pérez',
  initials: 'JP',
  specialty: 'Carpintero',
  rating: 4.9,
  reviews: 127,
  jobs: 186,
  experience: '8 años',
  location: 'Ciudad de México',
  verified: true,

  description:
    'Especialista en fabricación, reparación e instalación de muebles. Trabajo con madera, MDF y melamina para proyectos residenciales y comerciales.',

  specialties: [
    'Carpintería',
    'Muebles',
    'Instalaciones',
    'Reparaciones',
  ],

  services: [
    {
      id: 1,
      name: 'Reparación de muebles',
      description:
        'Reparación de puertas, cajones, bisagras y muebles dañados.',
      price: 250,
      type: 'HOUR',
    },
    {
      id: 2,
      name: 'Armado de muebles',
      description:
        'Armado e instalación de muebles para hogar u oficina.',
      price: 600,
      type: 'ACTIVITY',
    },
    {
      id: 3,
      name: 'Trabajo de carpintería',
      description:
        'Servicio completo para proyectos que requieren una jornada de trabajo.',
      price: 1800,
      type: 'DAY',
    },
  ],

  reviewsList: [
    {
      id: 1,
      name: 'Laura M.',
      rating: 5,
      text: 'Excelente trabajo. Llegó puntual y dejó el mueble perfecto.',
    },
    {
      id: 2,
      name: 'Carlos R.',
      rating: 5,
      text: 'Muy profesional y el precio fue exactamente el acordado.',
    },
  ],
};

const getPriceType = (type: string) => {
  switch (type) {
    case 'HOUR':
      return 'hora';

    case 'DAY':
      return 'día';

    case 'ACTIVITY':
      return 'actividad';

    default:
      return '';
  }
};

const SpecialistProfile = () => {
  const { id } = useParams();

  console.log('Specialist ID:', id);

  return (
    <div className="profile-page">

      <header className="profile-navbar">
        <div className="profile-navbar-content">
          <a href="/" className="profile-logo">
            Feisin
          </a>

          <nav>
            <a href="/">Inicio</a>
            <a href="/specialists">Especialistas</a>
            <a href="/login">Iniciar sesión</a>

            <a href="/register" className="profile-register">
              Crear cuenta
            </a>
          </nav>
        </div>
      </header>

      <main className="profile-container">

        <a href="/specialists" className="back-link">
          ← Volver a especialistas
        </a>

        <section className="profile-header">

          <div className="profile-avatar">
            {specialist.initials}
          </div>

          <div className="profile-main-info">

            <div className="profile-name">
              <h1>
                {specialist.name}

                {specialist.verified && (
                  <span className="profile-verified">✓</span>
                )}
              </h1>

              <button className="profile-favorite">
                ♡
              </button>
            </div>

            <strong className="profile-specialty">
              {specialist.specialty}
            </strong>

            <div className="profile-stats">
              <span>
                ★ <strong>{specialist.rating}</strong>
                {' '}({specialist.reviews} opiniones)
              </span>

              <span>
                {specialist.jobs} trabajos
              </span>

              <span>
                {specialist.experience} de experiencia
              </span>

              <span>
                📍 {specialist.location}
              </span>
            </div>

          </div>

        </section>

        <div className="profile-layout">

          <div className="profile-left">

            <section className="profile-section">
              <h2>Acerca de mí</h2>

              <p className="about-text">
                {specialist.description}
              </p>

              <div className="specialty-tags">
                {specialist.specialties.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </section>

            <section className="profile-section">

              <div className="section-title">
                <div>
                  <h2>Servicios</h2>
                  <p>Selecciona el servicio que necesitas.</p>
                </div>
              </div>

              <div className="services-list">

                {specialist.services.map((service) => (
                  <article
                    className="service-card"
                    key={service.id}
                  >
                    <div className="service-info">
                      <h3>{service.name}</h3>
                      <p>{service.description}</p>
                    </div>

                    <div className="service-price">
                      <small>Desde</small>

                      <strong>
                        ${service.price.toLocaleString()}
                      </strong>

                      <span>
                        / {getPriceType(service.type)}
                      </span>

                      <button>
                        Solicitar
                      </button>
                    </div>
                  </article>
                ))}

              </div>
            </section>

            <section className="profile-section">

              <div className="reviews-header">
                <div>
                  <h2>Opiniones</h2>
                  <p>
                    Lo que dicen otros clientes sobre este especialista.
                  </p>
                </div>

                <div className="big-rating">
                  ★ {specialist.rating}
                </div>
              </div>

              <div className="reviews-list">

                {specialist.reviewsList.map((review) => (
                  <article
                    className="review-card"
                    key={review.id}
                  >
                    <div className="review-avatar">
                      {review.name.charAt(0)}
                    </div>

                    <div>
                      <strong>{review.name}</strong>

                      <div className="review-stars">
                        {'★'.repeat(review.rating)}
                      </div>

                      <p>{review.text}</p>
                    </div>
                  </article>
                ))}

              </div>

            </section>

          </div>

          <aside className="hire-card">

            <span className="hire-label">
              DISPONIBLE
            </span>

            <h2>¿Necesitas este especialista?</h2>

            <p>
              Selecciona uno de sus servicios y envía una solicitud.
            </p>

            <div className="hire-feature">
              <span>✓</span>
              <div>
                <strong>Profesional verificado</strong>
                <small>Identidad validada por Feisin</small>
              </div>
            </div>

            <div className="hire-feature">
              <span>✓</span>
              <div>
                <strong>Opiniones verificadas</strong>
                <small>De clientes que contrataron</small>
              </div>
            </div>

            <button className="hire-button">
              Solicitar servicio
            </button>

            <small className="hire-disclaimer">
              No se realizará ningún cobro en este momento.
            </small>

          </aside>

        </div>

      </main>

    </div>
  );
};

export default SpecialistProfile;