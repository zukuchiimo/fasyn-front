import { useState } from 'react';
import './Specialists.css';

const specialists = [
  {
    id: 1,
    initials: 'JP',
    name: 'Juan Pérez',
    specialty: 'Carpintero',
    description:
      'Fabricación, reparación e instalación de muebles y trabajos de carpintería.',
    rating: 4.9,
    reviews: 127,
    price: 250,
    unit: 'hora',
    experience: '8 años',
    verified: true,
  },
  {
    id: 2,
    initials: 'ML',
    name: 'María López',
    specialty: 'Limpieza',
    description:
      'Servicio profesional de limpieza para casas, departamentos y oficinas.',
    rating: 4.8,
    reviews: 94,
    price: 700,
    unit: 'día',
    experience: '5 años',
    verified: true,
  },
  {
    id: 3,
    initials: 'CR',
    name: 'Carlos Ramírez',
    specialty: 'Electricista',
    description:
      'Instalaciones eléctricas, reparación de contactos, lámparas y mantenimiento.',
    rating: 4.9,
    reviews: 83,
    price: 350,
    unit: 'hora',
    experience: '10 años',
    verified: true,
  },
  {
    id: 4,
    initials: 'AG',
    name: 'Andrea García',
    specialty: 'Pintura',
    description:
      'Pintura de interiores y exteriores para hogares, oficinas y comercios.',
    rating: 4.7,
    reviews: 61,
    price: 1200,
    unit: 'actividad',
    experience: '6 años',
    verified: false,
  },
];

const categories = [
  'Todos',
  'Carpintero',
  'Limpieza',
  'Electricista',
  'Pintura',
  'Plomería',
];

const Specialists = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');

  const filteredSpecialists = specialists.filter((specialist) => {
    const matchesSearch =
      specialist.name.toLowerCase().includes(search.toLowerCase()) ||
      specialist.specialty.toLowerCase().includes(search.toLowerCase()) ||
      specialist.description.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      category === 'Todos' || specialist.specialty === category;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="specialists-page">

      <header className="specialists-navbar">
        <div className="specialists-navbar-content">
          <a href="/" className="specialists-logo">
            Feisin
          </a>

          <nav>
            <a href="/">Inicio</a>
            <a href="/specialists">Especialistas</a>
            <a href="/login">Iniciar sesión</a>

            <a href="/register" className="create-account">
              Crear cuenta
            </a>
          </nav>
        </div>
      </header>

      <section className="specialists-hero">
        <div>
          <span>ENCUENTRA PROFESIONALES</span>

          <h1>
            Encuentra al especialista
            <strong> ideal para tu proyecto</strong>
          </h1>

          <p>
            Compara profesionales, precios y opiniones antes de elegir.
          </p>

          <div className="specialists-search">
            <span>⌕</span>

            <input
              type="text"
              placeholder="¿Qué servicio necesitas?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <button>Buscar</button>
          </div>
        </div>
      </section>

      <main className="specialists-content">

        <aside className="filters">
          <div className="filters-header">
            <h3>Filtros</h3>

            <button
              onClick={() => {
                setCategory('Todos');
                setSearch('');
              }}
            >
              Limpiar
            </button>
          </div>

          <div className="filter-section">
            <h4>Especialidad</h4>

            {categories.map((item) => (
              <label key={item}>
                <input
                  type="radio"
                  name="category"
                  checked={category === item}
                  onChange={() => setCategory(item)}
                />

                {item}
              </label>
            ))}
          </div>

          <div className="filter-section">
            <h4>Calificación</h4>

            <label>
              <input type="checkbox" />
              ★ 4.5 o más
            </label>

            <label>
              <input type="checkbox" />
              ★ 4.0 o más
            </label>
          </div>

          <div className="filter-section">
            <h4>Tipo de cobro</h4>

            <label>
              <input type="checkbox" />
              Por hora
            </label>

            <label>
              <input type="checkbox" />
              Por día
            </label>

            <label>
              <input type="checkbox" />
              Por actividad
            </label>
          </div>
        </aside>

        <section className="results">

          <div className="results-header">
            <div>
              <h2>Especialistas</h2>

              <p>
                {filteredSpecialists.length} profesionales encontrados
              </p>
            </div>

            <select>
              <option>Mejor calificados</option>
              <option>Menor precio</option>
              <option>Mayor experiencia</option>
            </select>
          </div>

          <div className="results-list">

            {filteredSpecialists.map((specialist) => (
              <article
                className="result-card"
                key={specialist.id}
              >

                <div className="result-avatar">
                  {specialist.initials}
                </div>

                <div className="result-information">

                  <div className="result-name">
                    <div>
                      <h3>
                        {specialist.name}

                        {specialist.verified && (
                          <span className="verified">✓</span>
                        )}
                      </h3>

                      <strong>{specialist.specialty}</strong>
                    </div>

                    <button className="favorite">
                      ♡
                    </button>
                  </div>

                  <p className="description">
                    {specialist.description}
                  </p>

                  <div className="specialist-meta">
                    <span>
                      ★ <strong>{specialist.rating}</strong>
                      {' '}({specialist.reviews})
                    </span>

                    <span>
                      Experiencia: {specialist.experience}
                    </span>
                  </div>

                  <div className="result-bottom">

                    <div className="result-price">
                      <small>Desde</small>

                      <strong>
                        ${specialist.price.toLocaleString()}
                      </strong>

                      <span> / {specialist.unit}</span>
                    </div>

                    <a
                      href={`/specialists/${specialist.id}`}
                      className="profile-button"
                    >
                      Ver perfil
                    </a>

                  </div>
                </div>
              </article>
            ))}

            {filteredSpecialists.length === 0 && (
              <div className="no-results">
                <h3>No encontramos especialistas</h3>

                <p>
                  Intenta buscar otro servicio o cambiar los filtros.
                </p>
              </div>
            )}

          </div>
        </section>

      </main>
    </div>
  );
};

export default Specialists;