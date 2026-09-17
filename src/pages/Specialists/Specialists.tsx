import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import { api } from '../../api/api';
import logo from '../../assets/logo.png';

import './Specialists.css';

type PriceType =
  | 'HOUR'
  | 'DAY'
  | 'ACTIVITY';

type Category = {
  id: number;
  name: string;
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

type SortOption =
  | 'DEFAULT'
  | 'PRICE_ASC'
  | 'EXPERIENCE_DESC'
  | 'NAME_ASC';

const Specialists = () => {
  const navigate = useNavigate();

  const [specialists, setSpecialists] =
    useState<Specialist[]>([]);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [search, setSearch] =
    useState('');

  const [categoryId, setCategoryId] =
    useState('ALL');

  const [priceType, setPriceType] =
    useState<'ALL' | PriceType>(
      'ALL'
    );

  const [sort, setSort] =
    useState<SortOption>(
      'DEFAULT'
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const formatCategoryName = (
    value: string
  ) => {
    if (!value) {
      return 'Especialidad';
    }

    const formatted = value
      .replace(
        /([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g,
        '$1 $2'
      )
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return (
      formatted
        .charAt(0)
        .toLocaleUpperCase(
          'es-MX'
        ) +
      formatted.slice(1)
    );
  };

  const getInitials = (
    name: string
  ) => {
    return (
      name
        .trim()
        .split(' ')
        .filter(Boolean)
        .map((word) =>
          word.charAt(0)
        )
        .join('')
        .substring(0, 2)
        .toUpperCase() ||
      'ES'
    );
  };

  const getPriceTypeLabel = (
    value: PriceType
  ) => {
    switch (value) {
      case 'HOUR':
        return 'hora';

      case 'DAY':
        return 'día';

      default:
        return 'servicio';
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        specialistsResponse,
        categoriesResponse,
      ] = await Promise.all([
        api.get('/specialists'),
        api.get('/categories'),
      ]);

      setSpecialists(
        specialistsResponse.data
          ?.specialists || []
      );

      setCategories(
        categoriesResponse.data
          ?.categories || []
      );
    } catch (requestError: any) {
      console.error(
        'ERROR CARGANDO ESPECIALISTAS:',
        requestError.response?.data ||
          requestError
      );

      setError(
        requestError.response?.data
          ?.message ||
          'No fue posible cargar los especialistas.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSpecialists =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLocaleLowerCase(
            'es-MX'
          );

      let result =
        specialists.filter(
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
                    `${service.name} ${
                      service.description ||
                      ''
                    }`
                )
                .join(' ');

            const searchableText =
              [
                specialist.name,
                specialist.description ||
                  '',
                specialtyNames,
                serviceNames,
                specialist.state ||
                  '',
                specialist.municipality ||
                  '',
                specialist.neighborhood ||
                  '',
              ]
                .join(' ')
                .toLocaleLowerCase(
                  'es-MX'
                );

            const matchesSearch =
              !normalizedSearch ||
              searchableText.includes(
                normalizedSearch
              );

            const matchesCategory =
              categoryId === 'ALL' ||
              specialist.specialties.some(
                (specialty) =>
                  String(
                    specialty.id
                  ) ===
                  categoryId
              ) ||
              specialist.services.some(
                (service) =>
                  String(
                    service.category
                      .id
                  ) ===
                  categoryId
              );

            const matchesPriceType =
              priceType === 'ALL' ||
              specialist.services.some(
                (service) =>
                  service.priceType ===
                  priceType
              );

            return (
              matchesSearch &&
              matchesCategory &&
              matchesPriceType
            );
          }
        );

      result = [...result];

      if (
        sort === 'PRICE_ASC'
      ) {
        result.sort((a, b) => {
          const priceA =
            a.startingPrice ??
            Number.MAX_SAFE_INTEGER;

          const priceB =
            b.startingPrice ??
            Number.MAX_SAFE_INTEGER;

          return priceA - priceB;
        });
      }

      if (
        sort ===
        'EXPERIENCE_DESC'
      ) {
        result.sort(
          (a, b) =>
            (b.experience || 0) -
            (a.experience || 0)
        );
      }

      if (
        sort === 'NAME_ASC'
      ) {
        result.sort((a, b) =>
          a.name.localeCompare(
            b.name,
            'es'
          )
        );
      }

      return result;
    }, [
      specialists,
      search,
      categoryId,
      priceType,
      sort,
    ]);

  const clearFilters = () => {
    setSearch('');
    setCategoryId('ALL');
    setPriceType('ALL');
    setSort('DEFAULT');
  };

  return (
    <div className="specialists-page">

      <header className="specialists-navbar">

        <div className="specialists-navbar-content">

          <button
            type="button"
            className="specialists-logo"
            onClick={() =>
              navigate('/')
            }
          >
            <img
              src={logo}
              alt="FASYN"
            />
          </button>

          <nav>

            <button
              type="button"
              onClick={() =>
                navigate('/')
              }
            >
              Inicio
            </button>

            <button
              type="button"
              className="active"
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
              className="create-account"
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

      <section className="specialists-hero">

        <div className="specialists-hero-inner">

          <span className="specialists-eyebrow">
            ENCUENTRA PROFESIONALES
          </span>

          <h1>
            Encuentra al especialista
            <strong>
              {' '}
              ideal para tu proyecto.
            </strong>
          </h1>

          <p>
            Explora profesionales
            registrados en FASYN y
            encuentra el servicio que
            necesitas.
          </p>

          <div className="specialists-search">

            <span>⌕</span>

            <input
              type="text"
              placeholder="Ej. carpintería, plomería, aire acondicionado..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />

            <button
              type="button"
            >
              Buscar
            </button>

          </div>

        </div>

      </section>

      <main className="specialists-content">

        <aside className="filters">

          <div className="filters-header">

            <h3>
              Filtros
            </h3>

            <button
              type="button"
              onClick={
                clearFilters
              }
            >
              Limpiar
            </button>

          </div>

          <div className="filter-section">

            <h4>
              Especialidad
            </h4>

            <label>
              <input
                type="radio"
                name="category"
                checked={
                  categoryId ===
                  'ALL'
                }
                onChange={() =>
                  setCategoryId(
                    'ALL'
                  )
                }
              />

              <span>
                Todos
              </span>
            </label>

            {categories.map(
              (category) => (
                <label
                  key={
                    category.id
                  }
                >
                  <input
                    type="radio"
                    name="category"
                    checked={
                      categoryId ===
                      String(
                        category.id
                      )
                    }
                    onChange={() =>
                      setCategoryId(
                        String(
                          category.id
                        )
                      )
                    }
                  />

                  <span>
                    {formatCategoryName(
                      category.name
                    )}
                  </span>
                </label>
              )
            )}

          </div>

          <div className="filter-section">

            <h4>
              Tipo de cobro
            </h4>

            <label>
              <input
                type="radio"
                name="price-type"
                checked={
                  priceType ===
                  'ALL'
                }
                onChange={() =>
                  setPriceType(
                    'ALL'
                  )
                }
              />

              <span>
                Cualquier tipo
              </span>
            </label>

            <label>
              <input
                type="radio"
                name="price-type"
                checked={
                  priceType ===
                  'HOUR'
                }
                onChange={() =>
                  setPriceType(
                    'HOUR'
                  )
                }
              />

              <span>
                Por hora
              </span>
            </label>

            <label>
              <input
                type="radio"
                name="price-type"
                checked={
                  priceType ===
                  'DAY'
                }
                onChange={() =>
                  setPriceType(
                    'DAY'
                  )
                }
              />

              <span>
                Por día
              </span>
            </label>

            <label>
              <input
                type="radio"
                name="price-type"
                checked={
                  priceType ===
                  'ACTIVITY'
                }
                onChange={() =>
                  setPriceType(
                    'ACTIVITY'
                  )
                }
              />

              <span>
                Por servicio
              </span>
            </label>

          </div>

        </aside>

        <section className="results">

          <div className="results-header">

            <div>

              <span className="results-eyebrow">
                PROFESIONALES
              </span>

              <h2>
                Especialistas
              </h2>

              <p>
                {loading
                  ? 'Buscando especialistas...'
                  : `${filteredSpecialists.length} ${
                      filteredSpecialists.length ===
                      1
                        ? 'profesional encontrado'
                        : 'profesionales encontrados'
                    }`}
              </p>

            </div>

            <select
              value={sort}
              onChange={(event) =>
                setSort(
                  event.target
                    .value as SortOption
                )
              }
            >
              <option value="DEFAULT">
                Más recientes
              </option>

              <option value="PRICE_ASC">
                Menor precio
              </option>

              <option value="EXPERIENCE_DESC">
                Mayor experiencia
              </option>

              <option value="NAME_ASC">
                Nombre A-Z
              </option>
            </select>

          </div>

          {error && (
            <div className="specialists-error">
              {error}
            </div>
          )}

          {loading ? (

            <div className="specialists-loading">

              <div className="specialists-spinner" />

              <strong>
                Buscando profesionales
              </strong>

              <p>
                Estamos cargando los
                especialistas disponibles.
              </p>

            </div>

          ) : (

            <div className="results-list">

              {filteredSpecialists.map(
                (specialist) => {
                  const firstService =
                    specialist.services[
                      0
                    ];

                  return (
                    <article
                      className="result-card"
                      key={
                        specialist.id
                      }
                    >

                      <div className="result-avatar">
                        {getInitials(
                          specialist.name
                        )}
                      </div>

                      <div className="result-information">

                        <div className="result-name">

                          <div>

                            <h3>
                              {
                                specialist.name
                              }

                              {specialist.profileCompleted && (
                                <span
                                  className="profile-complete"
                                  title="Perfil completo"
                                >
                                  ✓
                                </span>
                              )}
                            </h3>

                            <div className="specialist-specialties">

                              {specialist.specialties
                                .slice(
                                  0,
                                  3
                                )
                                .map(
                                  (
                                    specialty
                                  ) => (
                                    <strong
                                      key={
                                        specialty.id
                                      }
                                    >
                                      {formatCategoryName(
                                        specialty.name
                                      )}
                                    </strong>
                                  )
                                )}

                            </div>

                          </div>

                        </div>

                        <p className="description">
                          {specialist.description ||
                            'Este especialista aún no ha agregado una descripción profesional.'}
                        </p>

                        <div className="specialist-meta">

                          {specialist.experience ? (
                            <span>
                              <b>◷</b>
                              {
                                specialist.experience
                              }{' '}
                              {specialist.experience ===
                              1
                                ? 'año de experiencia'
                                : 'años de experiencia'}
                            </span>
                          ) : (
                            <span>
                              Experiencia no especificada
                            </span>
                          )}

                          {(specialist.municipality ||
                            specialist.state) && (
                            <span>
                              <b>⌖</b>

                              {[
                                specialist.municipality,
                                specialist.state,
                              ]
                                .filter(
                                  Boolean
                                )
                                .join(
                                  ', '
                                )}
                            </span>
                          )}

                          <span>
                            <b>●</b>
                            Disponible
                          </span>

                        </div>

                        <div className="result-bottom">

                          <div className="result-price">

                            <small>
                              {firstService
                                ? 'Desde'
                                : 'Servicios'}
                            </small>

                            {specialist.startingPrice !==
                            null &&
                            specialist.startingPrice !==
                              undefined ? (
                              <>
                                <strong>
                                  {Number(
                                    specialist.startingPrice
                                  ).toLocaleString(
                                    'es-MX',
                                    {
                                      style:
                                        'currency',
                                      currency:
                                        'MXN',
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 2,
                                    }
                                  )}
                                </strong>

                                {firstService && (
                                  <span>
                                    {' '}
                                    /{' '}
                                    {getPriceTypeLabel(
                                      firstService.priceType
                                    )}
                                  </span>
                                )}
                              </>
                            ) : (
                              <strong>
                                Consultar
                              </strong>
                            )}

                          </div>

                          <button
                            type="button"
                            className="profile-button"
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

                      </div>

                    </article>
                  );
                }
              )}

              {filteredSpecialists.length ===
                0 && (
                <div className="no-results">

                  <div>
                    ⌕
                  </div>

                  <h3>
                    No encontramos especialistas
                  </h3>

                  <p>
                    Intenta buscar otro
                    servicio o cambia los
                    filtros seleccionados.
                  </p>

                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                  >
                    Limpiar filtros
                  </button>

                </div>
              )}

            </div>

          )}

        </section>

      </main>

    </div>
  );
};

export default Specialists;