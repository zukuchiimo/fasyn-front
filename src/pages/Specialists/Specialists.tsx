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

type UserRole =
  | 'CLIENT'
  | 'SPECIALIST'
  | 'ADMIN';

type SessionUser = {
  id?: number;
  name?: string;
  email?: string;
  role?: UserRole;
};

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

  profilePhotoUrl?: string | null;

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
  const navigate =
    useNavigate();

  /*
    =====================================================
    SESIÓN

    La pantalla sigue siendo pública.

    Solamente detectamos si ya existe una sesión
    para cambiar los botones del navbar.
    =====================================================
  */

  const token =
    localStorage.getItem(
      'token'
    );

  const storedUser =
    localStorage.getItem(
      'user'
    );

  const currentUser =
    useMemo<SessionUser | null>(
      () => {
        if (!storedUser) {
          return null;
        }

        try {
          return JSON.parse(
            storedUser
          );
        } catch (
          storageError
        ) {
          console.error(
            'ERROR LEYENDO USUARIO:',
            storageError
          );

          return null;
        }
      },
      [storedUser]
    );

  const isLoggedIn =
    Boolean(
      token &&
      currentUser
    );

  /*
    =====================================================
    ESTADOS
    =====================================================
  */

  const [
    specialists,
    setSpecialists,
  ] =
    useState<Specialist[]>(
      []
    );

  const [
    categories,
    setCategories,
  ] =
    useState<Category[]>(
      []
    );

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    categoryId,
    setCategoryId,
  ] =
    useState('ALL');

  const [
    priceType,
    setPriceType,
  ] =
    useState<
      'ALL' |
      PriceType
    >(
      'ALL'
    );

  const [
    sort,
    setSort,
  ] =
    useState<SortOption>(
      'DEFAULT'
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState('');

  /*
    =====================================================
    FORMATO CATEGORÍA
    =====================================================
  */

  const formatCategoryName = (
    value: string
  ) => {
    if (!value) {
      return 'Especialidad';
    }

    const formatted =
      value
        .replace(
          /([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g,
          '$1 $2'
        )
        .replace(
          /[_-]+/g,
          ' '
        )
        .replace(
          /\s+/g,
          ' '
        )
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

  /*
    =====================================================
    INICIALES
    =====================================================
  */

  const getInitials = (
    name: string
  ) => {
    return (
      name
        .trim()
        .split(' ')
        .filter(Boolean)
        .map(
          (word) =>
            word.charAt(0)
        )
        .join('')
        .substring(0, 2)
        .toUpperCase() ||
      'ES'
    );
  };

  /*
    =====================================================
    TIPO DE PRECIO
    =====================================================
  */

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

  /*
    =====================================================
    URL DE FOTO
    =====================================================
  */

  const resolveStoredFileUrl = (
    fileUrl?:
      string |
      null
  ) => {
    if (!fileUrl) {
      return '';
    }

    if (
      /^https?:\/\//i.test(
        fileUrl
      )
    ) {
      return fileUrl;
    }

    const apiBaseUrl =
      api.defaults.baseURL ||
      'http://localhost:3000/api';

    const apiOrigin =
      apiBaseUrl
        .replace(
          /\/api\/?$/,
          ''
        )
        .replace(
          /\/$/,
          ''
        );

    const normalizedPath =
      fileUrl.startsWith(
        '/'
      )
        ? fileUrl
        : `/${fileUrl}`;

    return (
      `${apiOrigin}${normalizedPath}`
    );
  };

  /*
    =====================================================
    IR AL PANEL SEGÚN EL ROL
    =====================================================
  */

  const goToPanel = () => {
    if (!currentUser) {
      navigate(
        '/login'
      );

      return;
    }

    switch (
      currentUser.role
    ) {
      case 'CLIENT':
        navigate(
          '/client'
        );

        break;

      case 'SPECIALIST':
        navigate(
          '/specialist'
        );

        break;

      case 'ADMIN':
        navigate(
          '/admin'
        );

        break;

      default:
        navigate(
          '/'
        );
    }
  };

  /*
    =====================================================
    CERRAR SESIÓN
    =====================================================
  */

  const handleLogout =
    () => {
      localStorage.removeItem(
        'token'
      );

      localStorage.removeItem(
        'user'
      );

      navigate(
        '/'
      );

      window.location.reload();
    };

  /*
    =====================================================
    CARGAR DATOS PÚBLICOS

    IMPORTANTE:
    NO mandamos Authorization.

    Cualquier persona puede consultar:
    - especialistas
    - categorías
    =====================================================
  */

  const loadData =
    async () => {
      try {
        setLoading(
          true
        );

        setError('');

        const [
          specialistsResponse,
          categoriesResponse,
        ] =
          await Promise.all([
            api.get(
              '/specialists'
            ),

            api.get(
              '/categories'
            ),
          ]);

        setSpecialists(
          specialistsResponse
            .data
            ?.specialists ||
          []
        );

        setCategories(
          categoriesResponse
            .data
            ?.categories ||
          []
        );

      } catch (
        requestError: any
      ) {
        console.error(
          'ERROR CARGANDO ESPECIALISTAS:',
          requestError
            .response
            ?.data ||
          requestError
        );

        setError(
          requestError
            .response
            ?.data
            ?.message ||
          'No fue posible cargar los especialistas.'
        );

      } finally {
        setLoading(
          false
        );
      }
    };

  useEffect(() => {
    loadData();
  }, []);

  /*
    =====================================================
    FILTRADO
    =====================================================
  */

  const filteredSpecialists =
    useMemo(
      () => {
        const normalizedSearch =
          search
            .trim()
            .toLocaleLowerCase(
              'es-MX'
            );

        let result =
          specialists.filter(
            (
              specialist
            ) => {

              /*
                El directorio público
                solamente muestra perfiles:

                - disponibles
                - completos
              */

              if (
                !specialist.available ||
                !specialist.profileCompleted
              ) {
                return false;
              }

              const specialtyNames =
                specialist
                  .specialties
                  .map(
                    (
                      specialty
                    ) =>
                      specialty.name
                  )
                  .join(' ');

              const serviceNames =
                specialist
                  .services
                  .map(
                    (
                      service
                    ) =>
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
                searchableText
                  .includes(
                    normalizedSearch
                  );

              const matchesCategory =
                categoryId ===
                  'ALL' ||

                specialist
                  .specialties
                  .some(
                    (
                      specialty
                    ) =>
                      String(
                        specialty.id
                      ) ===
                      categoryId
                  ) ||

                specialist
                  .services
                  .some(
                    (
                      service
                    ) =>
                      String(
                        service
                          .category
                          .id
                      ) ===
                      categoryId
                  );

              const matchesPriceType =
                priceType ===
                  'ALL' ||

                specialist
                  .services
                  .some(
                    (
                      service
                    ) =>
                      service
                        .priceType ===
                      priceType
                  );

              return (
                matchesSearch &&
                matchesCategory &&
                matchesPriceType
              );
            }
          );

        result =
          [...result];

        /*
          ORDENAMIENTO
        */

        if (
          sort ===
          'PRICE_ASC'
        ) {
          result.sort(
            (
              a,
              b
            ) => {

              const priceA =
                a.startingPrice ??
                Number
                  .MAX_SAFE_INTEGER;

              const priceB =
                b.startingPrice ??
                Number
                  .MAX_SAFE_INTEGER;

              return (
                priceA -
                priceB
              );
            }
          );
        }

        if (
          sort ===
          'EXPERIENCE_DESC'
        ) {
          result.sort(
            (
              a,
              b
            ) =>
              (
                b.experience ||
                0
              ) -
              (
                a.experience ||
                0
              )
          );
        }

        if (
          sort ===
          'NAME_ASC'
        ) {
          result.sort(
            (
              a,
              b
            ) =>
              a.name.localeCompare(
                b.name,
                'es'
              )
          );
        }

        return result;
      },
      [
        specialists,
        search,
        categoryId,
        priceType,
        sort,
      ]
    );

  /*
    =====================================================
    TOTAL DE ESPECIALISTAS DISPONIBLES
    =====================================================
  */

  const availableSpecialists =
    useMemo(
      () =>
        specialists.filter(
          (
            specialist
          ) =>
            specialist.available &&
            specialist.profileCompleted
        ).length,

      [
        specialists,
      ]
    );

  /*
    =====================================================
    LIMPIAR FILTROS
    =====================================================
  */

  const clearFilters =
    () => {
      setSearch('');
      setCategoryId(
        'ALL'
      );
      setPriceType(
        'ALL'
      );
      setSort(
        'DEFAULT'
      );
    };

  const hasActiveFilters =
    Boolean(
      search.trim()
    ) ||
    categoryId !==
      'ALL' ||
    priceType !==
      'ALL' ||
    sort !==
      'DEFAULT';

  /*
    =====================================================
    RENDER
    =====================================================
  */

  return (
    <div className="specialists-page">

      {/* =====================================
          NAVBAR
      ====================================== */}

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
              alt="FEISIN"
            />
          </button>

          <nav>

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/'
                )
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

            {/* =================================
                USUARIO CON SESIÓN
            ================================== */}

            {isLoggedIn ? (
              <>

                <button
                  type="button"
                  onClick={
                    goToPanel
                  }
                >
                  Mi panel
                </button>

                <button
                  type="button"
                  className="create-account"
                  onClick={
                    handleLogout
                  }
                >
                  Cerrar sesión
                </button>

              </>
            ) : (

              /*
                USUARIO PÚBLICO
              */

              <>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      '/login'
                    )
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

              </>
            )}

          </nav>

        </div>

      </header>

      {/* =====================================
          HERO
      ====================================== */}

      <section className="specialists-hero">

        <div className="specialists-hero-inner">

          <div className="specialists-hero-copy">

            <span className="specialists-eyebrow">
              PROFESIONALES EN FEISIN
            </span>

            <h1>
              Encuentra al especialista

              <strong>
                {' '}
                ideal para tu proyecto.
              </strong>
            </h1>

            <p>
              Compara experiencia,
              especialidades y precios.
              Encuentra profesionales
              disponibles cerca de ti.
            </p>

            {/* BUSCADOR */}

            <div className="specialists-search-card">

              <div className="specialists-search-field">

                <span className="specialists-search-icon">
                  ⌕
                </span>

                <div className="specialists-search-copy">

                  <label
                    htmlFor="specialists-search-input"
                  >
                    ¿Qué servicio necesitas?
                  </label>

                  <input
                    id="specialists-search-input"
                    type="text"
                    placeholder="Ej. carpintería, plomería o pintura"
                    value={
                      search
                    }
                    onChange={(
                      event
                    ) =>
                      setSearch(
                        event
                          .target
                          .value
                      )
                    }
                  />

                </div>

                {search && (
                  <button
                    type="button"
                    className="specialists-search-clear"
                    onClick={() =>
                      setSearch('')
                    }
                    aria-label="Limpiar búsqueda"
                  >
                    ×
                  </button>
                )}

              </div>

              <button
                type="button"
                className="specialists-search-button"
                onClick={() => {

                  const results =
                    document
                      .querySelector(
                        '.results'
                      );

                  results
                    ?.scrollIntoView(
                      {
                        behavior:
                          'smooth',

                        block:
                          'start',
                      }
                    );
                }}
              >
                Buscar especialistas

                <span>
                  →
                </span>
              </button>

            </div>

            {/* ESTADÍSTICAS */}

            <div className="hero-trust-row">

              <div className="hero-stat">

                <span className="hero-stat-value">
                  {
                    availableSpecialists
                  }
                </span>

                <span className="hero-stat-label">
                  Profesionales disponibles
                </span>

              </div>

              <div className="hero-stat">

                <span className="hero-stat-value">
                  {
                    categories.length
                  }
                </span>

                <span className="hero-stat-label">
                  Especialidades
                </span>

              </div>

              <div className="hero-stat hero-stat-text">

                <span className="hero-stat-value">
                  ✓
                </span>

                <span className="hero-stat-label">
                  Perfiles completos
                </span>

              </div>

            </div>

          </div>

          {/* CÓMO FUNCIONA */}

          <div className="specialists-hero-panel">

            <span>
              CÓMO FUNCIONA
            </span>

            <ol>

              <li>

                <b>
                  01
                </b>

                <div>

                  <strong>
                    Busca
                  </strong>

                  <p>
                    Encuentra el servicio que necesitas.
                  </p>

                </div>

              </li>

              <li>

                <b>
                  02
                </b>

                <div>

                  <strong>
                    Compara
                  </strong>

                  <p>
                    Revisa experiencia,
                    especialidades y precios.
                  </p>

                </div>

              </li>

              <li>

                <b>
                  03
                </b>

                <div>

                  <strong>
                    Elige
                  </strong>

                  <p>
                    Consulta el perfil completo
                    antes de solicitar el servicio.
                  </p>

                </div>

              </li>

            </ol>

          </div>

        </div>

      </section>

      {/* =====================================
          CONTENIDO
      ====================================== */}

      <main className="specialists-content">

        {/* =====================================
            FILTROS
        ====================================== */}

        <aside className="filters">

          <div className="filters-sticky">

            <div className="filters-header">

              <div>

                <span>
                  FILTRAR RESULTADOS
                </span>

                <h3>
                  Filtros
                </h3>

              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                >
                  Limpiar
                </button>
              )}

            </div>

            {/* ESPECIALIDAD */}

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
                  Todas las especialidades
                </span>

              </label>

              {categories.map(
                (
                  category
                ) => (

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
                      {
                        formatCategoryName(
                          category.name
                        )
                      }
                    </span>

                  </label>
                )
              )}

            </div>

            {/* TIPO DE COBRO */}

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

          </div>

        </aside>

        {/* =====================================
            RESULTADOS
        ====================================== */}

        <section className="results">

          <div className="results-header">

            <div>

              <span className="results-eyebrow">
                DIRECTORIO
              </span>

              <h2>
                Especialistas disponibles
              </h2>

              <p>
                {
                  loading
                    ? 'Buscando especialistas...'
                    : `${filteredSpecialists.length} ${
                        filteredSpecialists.length ===
                        1
                          ? 'profesional encontrado'
                          : 'profesionales encontrados'
                      }`
                }
              </p>

            </div>

            {/* ORDENAMIENTO */}

            <div className="results-sort">

              <span>
                Ordenar por
              </span>

              <select
                value={
                  sort
                }
                onChange={(
                  event
                ) =>
                  setSort(
                    event
                      .target
                      .value as
                    SortOption
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

          </div>

          {/* ERROR */}

          {error && (

            <div className="specialists-error">

              <span>
                !
              </span>

              <div>

                <strong>
                  No pudimos cargar el directorio
                </strong>

                <p>
                  {
                    error
                  }
                </p>

              </div>

              <button
                type="button"
                onClick={
                  loadData
                }
              >
                Reintentar
              </button>

            </div>
          )}

          {/* LOADING */}

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
                (
                  specialist
                ) => {

                  const firstService =
                    specialist
                      .services[
                        0
                      ];

                  const location =
                    [
                      specialist
                        .municipality,

                      specialist
                        .state,
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        ', '
                      );

                  return (

                    <article
                      className="result-card"
                      key={
                        specialist.id
                      }
                    >

                      {/* FOTO */}

                      <div className="result-avatar-column">

                        <div className="result-avatar">

                          {
                            specialist
                              .profilePhotoUrl
                              ? (

                                <img
                                  src={
                                    resolveStoredFileUrl(
                                      specialist
                                        .profilePhotoUrl
                                    )
                                  }
                                  alt={
                                    specialist
                                      .name
                                  }
                                />

                              )
                              : (

                                <span>
                                  {
                                    getInitials(
                                      specialist.name
                                    )
                                  }
                                </span>
                              )
                          }

                        </div>

                        <div className="availability-badge">

                          <i />

                          Disponible

                        </div>

                      </div>

                      {/* INFORMACIÓN */}

                      <div className="result-information">

                        <div className="result-name">

                          <div>

                            <div className="result-name-line">

                              <h3>
                                {
                                  specialist.name
                                }
                              </h3>

                              {
                                specialist
                                  .profileCompleted && (

                                  <span
                                    className="profile-complete"
                                    title="Perfil completo"
                                  >
                                    ✓
                                  </span>
                                )
                              }

                            </div>

                            {/* ESPECIALIDADES */}

                            <div className="specialist-specialties">

                              {
                                specialist
                                  .specialties
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
                                        {
                                          formatCategoryName(
                                            specialty.name
                                          )
                                        }
                                      </strong>
                                    )
                                  )
                              }

                              {
                                specialist
                                  .specialties
                                  .length >
                                3 && (

                                  <span>
                                    +
                                    {
                                      specialist
                                        .specialties
                                        .length -
                                      3
                                    }
                                  </span>
                                )
                              }

                            </div>

                          </div>

                          <span className="profile-state">
                            PERFIL COMPLETO
                          </span>

                        </div>

                        {/* DESCRIPCIÓN */}

                        <p className="description">

                          {
                            specialist
                              .description ||

                            'Este especialista aún no ha agregado una descripción profesional.'
                          }

                        </p>

                        {/* META */}

                        <div className="specialist-meta">

                          <span>

                            <b>
                              ◷
                            </b>

                            {
                              specialist
                                .experience
                                ? `${
                                    specialist.experience
                                  } ${
                                    specialist.experience ===
                                    1
                                      ? 'año de experiencia'
                                      : 'años de experiencia'
                                  }`
                                : 'Experiencia no especificada'
                            }

                          </span>

                          {location && (

                            <span>

                              <b>
                                ⌖
                              </b>

                              {
                                location
                              }

                            </span>
                          )}

                          <span>

                            <b>
                              ▤
                            </b>

                            {
                              specialist
                                .services
                                .length
                            }{' '}

                            {
                              specialist
                                .services
                                .length ===
                              1
                                ? 'servicio'
                                : 'servicios'
                            }

                          </span>

                        </div>

                        {/* SERVICIO DESTACADO */}

                        {firstService && (

                          <div className="service-preview">

                            <div>

                              <span>
                                SERVICIO DESTACADO
                              </span>

                              <strong>
                                {
                                  firstService
                                    .name
                                }
                              </strong>

                            </div>

                            <small>

                              {
                                formatCategoryName(
                                  firstService
                                    .category
                                    .name
                                )
                              }

                            </small>

                          </div>
                        )}

                        {/* PARTE INFERIOR */}

                        <div className="result-bottom">

                          <div className="result-price">

                            <small>

                              {
                                firstService
                                  ? 'Precio desde'
                                  : 'Servicios'
                              }

                            </small>

                            {
                              specialist
                                .startingPrice !==
                                null &&

                              specialist
                                .startingPrice !==
                                undefined
                                ? (

                                  <div>

                                    <strong>

                                      {
                                        Number(
                                          specialist
                                            .startingPrice
                                        )
                                          .toLocaleString(
                                            'es-MX',
                                            {
                                              style:
                                                'currency',

                                              currency:
                                                'MXN',

                                              minimumFractionDigits:
                                                0,

                                              maximumFractionDigits:
                                                2,
                                            }
                                          )
                                      }

                                    </strong>

                                    {firstService && (

                                      <span>

                                        /{' '}

                                        {
                                          getPriceTypeLabel(
                                            firstService
                                              .priceType
                                          )
                                        }

                                      </span>
                                    )}

                                  </div>

                                )
                                : (

                                  <strong>
                                    Consultar
                                  </strong>
                                )
                            }

                          </div>

                          {/* VER PERFIL */}

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

              {/* SIN RESULTADOS */}

              {
                filteredSpecialists
                  .length ===
                  0 && (

                  <div className="no-results">

                    <div className="no-results-icon">
                      ⌕
                    </div>

                    <span>
                      SIN RESULTADOS
                    </span>

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
                )
              }

            </div>
          )}

        </section>

      </main>

    </div>
  );
};

export default Specialists;