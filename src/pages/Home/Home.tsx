import './Home.css';

const categories = [
  { icon: '🪚', name: 'Carpintería' },
  { icon: '🎨', name: 'Pintura' },
  { icon: '🧹', name: 'Limpieza' },
  { icon: '🔧', name: 'Plomería' },
  { icon: '⚡', name: 'Electricidad' },
  { icon: '🌿', name: 'Jardinería' },
];

const specialists = [
  {
    id: 1,
    name: 'Juan Pérez',
    specialty: 'Carpintero',
    rating: '4.9',
    reviews: 127,
    price: '$250',
    unit: 'hora',
    initials: 'JP',
  },
  {
    id: 2,
    name: 'María López',
    specialty: 'Limpieza profesional',
    rating: '4.8',
    reviews: 94,
    price: '$700',
    unit: 'día',
    initials: 'ML',
  },
  {
    id: 3,
    name: 'Carlos Ramírez',
    specialty: 'Electricista',
    rating: '4.9',
    reviews: 83,
    price: '$350',
    unit: 'hora',
    initials: 'CR',
  },
];

const Home = () => {
  return (
    <div className="home">
      <header className="navbar">
        <div className="navbar-content">
          <a href="/" className="logo">
            Feisin
          </a>

          <nav>
           <a href="/services">Servicios</a>
            <a href="#specialists">Especialistas</a>
            <a href="/login">Iniciar sesión</a>
            <a href="/register" className="register-button">
              Crear cuenta
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <span className="hero-label">
              Profesionales cerca de ti
            </span>

            <h1>
              Encuentra al especialista
              <span> que necesitas</span>
            </h1>

            <p>
              Conecta con profesionales para resolver cualquier trabajo
              en tu hogar, negocio o proyecto.
            </p>

            <div className="search-box">
              <span>⌕</span>

              <input
                type="text"
                placeholder="¿Qué servicio necesitas?"
              />

              <button>Buscar</button>
            </div>

            <div className="hero-features">
              <span>✓ Profesionales verificados</span>
              <span>✓ Precios transparentes</span>
              <span>✓ Opiniones de clientes</span>
            </div>
          </div>
        </section>

        <section id="categories" className="section">
          <div className="section-header">
            <div>
              <span className="section-label">CATEGORÍAS</span>
              <h2>¿Qué necesitas resolver?</h2>
            </div>

            <button className="link-button">
              Ver todos los servicios →
            </button>
          </div>

          <div className="categories-grid">
            {categories.map((category) => (
              <button
                className="category-card"
                key={category.name}
              >
                <span className="category-icon">
                  {category.icon}
                </span>

                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section
          id="specialists"
          className="section specialists-section"
        >
          <div className="section-header">
            <div>
              <span className="section-label">RECOMENDADOS</span>
              <h2>Especialistas destacados</h2>
              <p>
                Profesionales con excelentes calificaciones de sus clientes.
              </p>
            </div>
          </div>

          <div className="specialists-grid">
            {specialists.map((specialist) => (
              <article
                className="specialist-card"
                key={specialist.id}
              >
                <div className="specialist-top">
                  <div className="avatar">
                    {specialist.initials}
                  </div>

                  <div>
                    <h3>{specialist.name}</h3>
                    <p>{specialist.specialty}</p>
                  </div>
                </div>

                <div className="rating">
                  <span>★ {specialist.rating}</span>
                  <small>
                    ({specialist.reviews} opiniones)
                  </small>
                </div>

                <div className="specialist-footer">
                  <div>
                    <small>Desde</small>
                    <strong>{specialist.price}</strong>
                    <span> / {specialist.unit}</span>
                  </div>

                  <button>Ver perfil</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="professional-cta">
          <div>
            <span>¿ERES PROFESIONAL?</span>
            <h2>Haz crecer tu trabajo con Feisin</h2>
            <p>
              Crea tu perfil, publica tus servicios y encuentra nuevos
              clientes.
            </p>
          </div>

          <a href="/register">
            Ofrecer mis servicios →
          </a>
        </section>
      </main>

      <footer>
        <strong>Feisin</strong>
        <span>Find All Specialists You Need</span>
      </footer>
    </div>
  );
};

export default Home;