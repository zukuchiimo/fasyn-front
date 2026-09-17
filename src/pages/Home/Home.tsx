import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import { api } from '../../api/api';
import logo from '../../assets/logo.png';

import './Home.css';

type PriceType =
  | 'HOUR'
  | 'DAY'
  | 'ACTIVITY';

type Category = {
  id: number;
  name: string;
  description?: string | null;
};

type Service = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  priceType: PriceType;

  category: Category;
};

type Specialist = {
  id: number;
  userId: number;
  name: string;

  description?: string | null;
  experience?: number | null;

  state?: string | null;
  municipality?: string | null;
  neighborhood?: string | null;

  available: boolean;
  profileCompleted: boolean;

  specialties: Category[];
  services: Service[];

  startingPrice?: number | null;
};

const Home = () => {
  const navigate = useNavigate();

  const [
    categories,
    setCategories,
  ] = useState<Category[]>([]);

  const [
    specialists,
    setSpecialists,
  ] = useState<Specialist[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    appliedSearch,
    setAppliedSearch,
  ] = useState('');

  /*
    CARGAR INFORMACIÓN REAL
  */
  const loadHomeData =
    async () => {
      try {
        setLoading(true);

        const [
          categoriesResponse,
          specialistsResponse,
        ] = await Promise.all([
          api.get('/categories'),
          api.get('/specialists'),
        ]);

        setCategories(
          categoriesResponse.data
            ?.categories ||
            categoriesResponse.data ||
            []
        );

        setSpecialists(
          specialistsResponse.data
            ?.specialists ||
            []
        );
      } catch (error: any) {
        console.error(
          'ERROR CARGANDO HOME:',
          error.response?.data ||
            error
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadHomeData();
  }, []);

  /*
    ICONO POR CATEGORÍA
  */
  const getCategoryIcon = (
    categoryName: string
  ) => {
    const name =
      categoryName
        .toLocaleLowerCase(
          'es-MX'
        );

    if (
      name.includes(
        'carpinter'
      )
    ) {
      return '🪚';
    }

    if (
      name.includes(
        'plomer'
      )
    ) {
      return '🔧';
    }

    if (
      name.includes(
        'electric'
      )
    ) {
      return '⚡';
    }

    if (
      name.includes(
        'pint'
      )
    ) {
      return '🎨';
    }

    if (
      name.includes(
        'limpieza'
      )
    ) {
      return '🧹';
    }

    if (
      name.includes(
        'jardin'
      )
    ) {
      return '🌿';
    }

    if (
      name.includes(
        'aire'
      )
    ) {
      return '❄️';
    }

    if (
      name.includes(
        'mecán'
      ) ||
      name.includes(
        'mecan'
      )
    ) {
      return '🔩';
    }

    return '🛠️';
  };

  /*
    INICIALES
  */
  const getInitials = (
    name: string
  ) => {
    return name
      .trim()
      .split(' ')
      .filter(Boolean)
      .map((word) =>
        word.charAt(0)
      )
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  /*
    PRECIO
  */
  const formatPrice = (
    price: number
  ) => {
    return Number(
      price
    ).toLocaleString(
      'es-MX',
      {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    );
  };

  const getPriceType = (
    type?: PriceType
  ) => {
    switch (type) {
      case 'HOUR':
        return 'hora';

      case 'DAY':
        return 'día';

      default:
        return 'servicio';
    }
  };

  /*
    ESPECIALISTAS PARA HOME
  */
  const visibleSpecialists =
    useMemo(() => {
      const term =
        appliedSearch
          .trim()
          .toLocaleLowerCase(
            'es-MX'
          );

      let result =
        specialists.filter(
          (specialist) =>
            specialist.available
        );

      if (term) {
        result =
          result.filter(
            (specialist) => {
              const specialtyNames =
                specialist.specialties
                  .map(
                    (specialty) =>
                      specialty.name
                  )
                  .join(' ');

              const serviceNames =
                specialist.services
                  .map(
                    (service) =>
                      service.name
                  )
                  .join(' ');

              const content = [
                specialist.name,
                specialist.description,
                specialtyNames,
                serviceNames,
                specialist.municipality,
                specialist.state,
              ]
                .filter(Boolean)
                .join(' ')
                .toLocaleLowerCase(
                  'es-MX'
                );

              return content.includes(
                term
              );
            }
          );
      }

      return result.slice(
        0,
        3
      );
    }, [
      specialists,
      appliedSearch,
    ]);

  /*
    CATEGORÍAS DESTACADAS
  */
  const visibleCategories =
    useMemo(() => {
      return categories.slice(
        0,
        6
      );
    }, [categories]);

  const handleSearch = (
    event: FormEvent
  ) => {
    event.preventDefault();

    setAppliedSearch(
      search.trim()
    );

    window.setTimeout(
      () => {
        document
          .getElementById(
            'specialists'
          )
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
      },
      50
    );
  };

  const handleCategory = (
    category: Category
  ) => {
    setSearch(
      category.name
    );

    setAppliedSearch(
      category.name
    );

    window.setTimeout(
      () => {
        document
          .getElementById(
            'specialists'
          )
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
      },
      50
    );
  };

  return (
    <div className="home-page">

      {/* ========================= */}
      {/* NAVBAR */}
      {/* ========================= */}

      <header className="home-navbar">

        <div className="home-navbar-inner">

          <button
            type="button"
            className="home-brand"
            onClick={() =>
              navigate('/')
            }
          >
            <img
              src={logo}
              alt="FASYN"
            />
          </button>

          <nav className="home-nav">

            <button
              type="button"
              onClick={() =>
                document
                  .getElementById(
                    'categories'
                  )
                  ?.scrollIntoView({
                    behavior:
                      'smooth',
                  })
              }
            >
              Servicios
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/specialists'
                )
              }
            >
              Especialistas
            </button>

            <button
              type="button"
              onClick={() =>
                navigate('/login')
              }
            >
              Iniciar sesión
            </button>

            <button
              type="button"
              className="home-register"
              onClick={() =>
                navigate(
                  '/register'
                )
              }
            >
              Crear cuenta
            </button>

          </nav>

        </div>

      </header>

      <main>

        {/* ========================= */}
        {/* HERO */}
        {/* ========================= */}

        <section className="home-hero">

          <div className="home-hero-glow home-hero-glow-one" />
          <div className="home-hero-glow home-hero-glow-two" />

          <div className="home-hero-inner">

            <div className="home-hero-copy">

              <div className="home-hero-badge">

                <span />

                Profesionales cerca
                de ti

              </div>

              <h1>
                Encuentra al
                especialista que

                <strong>
                  {' '}
                  necesitas.
                </strong>
              </h1>

              <p>
                Encuentra profesionales
                para resolver trabajos
                en tu hogar, negocio o
                proyecto de una forma
                sencilla y segura.
              </p>

              <form
                className="home-search"
                onSubmit={
                  handleSearch
                }
              >

                <div className="home-search-input">

                  <span>
                    ⌕
                  </span>

                  <input
                    type="text"
                    value={search}
                    placeholder="¿Qué servicio necesitas?"
                    onChange={(event) =>
                      setSearch(
                        event
                          .target
                          .value
                      )
                    }
                  />

                </div>

                <button
                  type="submit"
                >
                  Buscar
                </button>

              </form>

              <div className="home-hero-features">

                <div>
                  <span>✓</span>

                  <small>
                    Profesionales
                    registrados
                  </small>
                </div>

                <div>
                  <span>✓</span>

                  <small>
                    Precios claros
                  </small>
                </div>

                <div>
                  <span>✓</span>

                  <small>
                    Solicitudes
                    administradas
                  </small>
                </div>

              </div>

            </div>

            <div className="home-hero-visual">

              <div className="home-visual-main">

                <div className="home-visual-header">

                  <span>
                    FASYN
                  </span>

                  <small>
                    PROFESIONALES
                  </small>

                </div>

                <div className="home-visual-title">
                  El trabajo correcto,
                  con la persona correcta.
                </div>

                <div className="home-visual-list">

                  <div>
                    <span>
                      01
                    </span>

                    <p>
                      Encuentra el
                      servicio que
                      necesitas.
                    </p>
                  </div>

                  <div>
                    <span>
                      02
                    </span>

                    <p>
                      Revisa perfiles y
                      servicios.
                    </p>
                  </div>

                  <div>
                    <span>
                      03
                    </span>

                    <p>
                      Envía tu solicitud.
                    </p>
                  </div>

                </div>

              </div>

              <div className="home-floating-card">

                <span>
                  DISPONIBILIDAD
                </span>

                <strong>
                  Profesionales
                  listos para ayudarte
                </strong>

                <div>
                  <i />
                  En FASYN
                </div>

              </div>

            </div>

          </div>

        </section>

        {/* ========================= */}
        {/* CATEGORÍAS */}
        {/* ========================= */}

        <section
          id="categories"
          className="home-section"
        >

          <div className="home-section-header">

            <div>

              <span className="home-section-number">
                01
              </span>

              <div>

                <small>
                  SERVICIOS
                </small>

                <h2>
                  ¿Qué necesitas
                  resolver?
                </h2>

                <p>
                  Explora las
                  especialidades
                  disponibles en FASYN.
                </p>

              </div>

            </div>

            <button
              type="button"
              className="home-link-button"
              onClick={() =>
                navigate(
                  '/specialists'
                )
              }
            >
              Ver todos
              <span>→</span>
            </button>

          </div>

          {loading ? (

            <div className="home-loading">
              Cargando servicios...
            </div>

          ) : visibleCategories
              .length > 0 ? (

            <div className="home-categories-grid">

              {visibleCategories.map(
                (category) => (

                  <button
                    type="button"
                    className="home-category-card"
                    key={
                      category.id
                    }
                    onClick={() =>
                      handleCategory(
                        category
                      )
                    }
                  >

                    <div className="home-category-icon">
                      {getCategoryIcon(
                        category.name
                      )}
                    </div>

                    <div>

                      <strong>
                        {category.name}
                      </strong>

                      <span>
                        Ver especialistas
                      </span>

                    </div>

                    <b>
                      →
                    </b>

                  </button>

                )
              )}

            </div>

          ) : (

            <div className="home-empty">
              Aún no hay categorías
              disponibles.
            </div>

          )}

        </section>

        {/* ========================= */}
        {/* ESPECIALISTAS */}
        {/* ========================= */}

        <section
          id="specialists"
          className="home-section home-specialists-section"
        >

          <div className="home-section-header">

            <div>

              <span className="home-section-number">
                02
              </span>

              <div>

                <small>
                  ESPECIALISTAS
                </small>

                <h2>
                  Profesionales
                  disponibles
                </h2>

                <p>
                  Conoce perfiles y
                  servicios publicados
                  directamente por los
                  especialistas.
                </p>

              </div>

            </div>

            <button
              type="button"
              className="home-link-button"
              onClick={() =>
                navigate(
                  '/specialists'
                )
              }
            >
              Explorar todos
              <span>→</span>
            </button>

          </div>

          {appliedSearch && (

            <div className="home-search-result">

              <span>
                Resultados para
              </span>

              <strong>
                “{appliedSearch}”
              </strong>

              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setAppliedSearch('');
                }}
              >
                Limpiar
              </button>

            </div>

          )}

          {loading ? (

            <div className="home-loading">
              Buscando especialistas...
            </div>

          ) : visibleSpecialists
              .length > 0 ? (

            <div className="home-specialists-grid">

              {visibleSpecialists.map(
                (
                  specialist
                ) => {

                  const lowestService =
                    specialist.services
                      ?.length
                      ? [
                          ...specialist.services,
                        ].sort(
                          (
                            first,
                            second
                          ) =>
                            Number(
                              first.price
                            ) -
                            Number(
                              second.price
                            )
                        )[0]
                      : null;

                  return (
                    <article
                      className="home-specialist-card"
                      key={
                        specialist.id
                      }
                    >

                      <div className="home-specialist-top">

                        <div className="home-specialist-avatar">
                          {getInitials(
                            specialist.name
                          )}
                        </div>

                        <div className="home-specialist-info">

                          <div className="home-specialist-status">
                            <i />

                            Disponible
                          </div>

                          <h3>
                            {
                              specialist.name
                            }
                          </h3>

                          <p>
                            {specialist
                              .specialties
                              .length > 0
                              ? specialist.specialties
                                  .map(
                                    (
                                      specialty
                                    ) =>
                                      specialty.name
                                  )
                                  .join(
                                    ' · '
                                  )
                              : 'Especialista FASYN'}
                          </p>

                        </div>

                      </div>

                      <div className="home-specialist-details">

                        <div>

                          <span>
                            EXPERIENCIA
                          </span>

                          <strong>
                            {specialist.experience
                              ? `${specialist.experience} ${
                                  specialist.experience ===
                                  1
                                    ? 'año'
                                    : 'años'
                                }`
                              : 'No especificada'}
                          </strong>

                        </div>

                        <div>

                          <span>
                            UBICACIÓN
                          </span>

                          <strong>
                            {[
                              specialist.neighborhood,
                              specialist.municipality,
                              specialist.state,
                            ]
                              .filter(
                                Boolean
                              )
                              .join(
                                ', '
                              ) ||
                              'No especificada'}
                          </strong>

                        </div>

                      </div>

                      <div className="home-specialist-footer">

                        <div>

                          <small>
                            {lowestService
                              ? 'Servicios desde'
                              : 'Servicios'}
                          </small>

                          {lowestService ? (
                            <>
                              <strong>
                                {formatPrice(
                                  lowestService.price
                                )}
                              </strong>

                              <span>
                                /{' '}
                                {getPriceType(
                                  lowestService.priceType
                                )}
                              </span>
                            </>
                          ) : (
                            <strong>
                              Por publicar
                            </strong>
                          )}

                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/specialists/${specialist.id}`
                            )
                          }
                        >
                          Ver perfil
                          <span>
                            →
                          </span>
                        </button>

                      </div>

                    </article>
                  );
                }
              )}

            </div>

          ) : (

            <div className="home-empty-specialists">

              <div>
                ⌕
              </div>

              <h3>
                No encontramos
                especialistas
              </h3>

              <p>
                Intenta buscar otro
                servicio o consulta
                todos los profesionales.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setAppliedSearch('');

                  navigate(
                    '/specialists'
                  );
                }}
              >
                Ver especialistas
              </button>

            </div>

          )}

        </section>

        {/* ========================= */}
        {/* CTA PROFESIONALES */}
        {/* ========================= */}

        <section className="home-professional">

          <div className="home-professional-decoration">
            F
          </div>

          <div className="home-professional-copy">

            <span>
              PARA PROFESIONALES
            </span>

            <h2>
              Convierte tu experiencia
              en nuevas oportunidades.
            </h2>

            <p>
              Crea tu perfil, registra
              tus especialidades,
              publica tus servicios y
              conecta con personas que
              necesitan tu trabajo.
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                '/register'
              )
            }
          >
            Ofrecer mis servicios

            <span>
              →
            </span>
          </button>

        </section>

      </main>

      {/* ========================= */}
      {/* FOOTER */}
      {/* ========================= */}

      <footer className="home-footer">

        <div>

          <img
            src={logo}
            alt="FASYN"
          />

          <div>
            <strong>
              FASYN
            </strong>

            <span>
              Find All Specialists
              You Need
            </span>
          </div>

        </div>

        <small>
          Encuentra profesionales
          para cada proyecto.
        </small>

      </footer>

    </div>
  );
};

export default Home;