import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';

import logo from '../../assets/logo.png';
import { api } from '../../api/api';

import './ClientDashboard.css';

type ClientRequest = {
  id: number;
  specialist: string;
  specialistId: number;
  service: string;
  date: string;
  status: 'Confirmada' | 'Pendiente' | 'Completada';
};

type Favorite = {
  id: number;
  initials: string;
  name: string;
  specialty: string;
  rating?: number | null;
  price?: string | null;
};


type ClientProfile = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  profilePhotoUrl?: string | null;
  active: boolean;
  createdAt: string;
};

const ClientDashboard = () => {
  const navigate = useNavigate();

  const [clientProfile, setClientProfile] =
    useState<ClientProfile | null>(
      null
    );

  /*
    Por ahora estos datos quedan vacíos.

    Después los vamos a cargar desde el backend.
  */
  const activeRequests: ClientRequest[] = [];

  const favorites: Favorite[] = [];

  /*
    USUARIO REAL
  */
  const storedUser =
    localStorage.getItem('user');

  let user = {
    name: 'Cliente',
    email: '',
  };

  if (storedUser) {
    try {
      user = JSON.parse(storedUser);
    } catch (error) {
      console.error(
        'ERROR LEYENDO USUARIO:',
        error
      );
    }
  }

  const token =
    localStorage.getItem('token');

  const resolveStoredFileUrl = (
    fileUrl?: string | null
  ) => {
    if (!fileUrl) {
      return '';
    }

    if (/^https?:\/\//i.test(fileUrl)) {
      return fileUrl;
    }

    const apiBaseUrl =
      api.defaults.baseURL ||
      'http://localhost:3000/api';

    const apiOrigin = apiBaseUrl
      .replace(/\/api\/?$/, '')
      .replace(/\/$/, '');

    const normalizedPath =
      fileUrl.startsWith('/')
        ? fileUrl
        : `/${fileUrl}`;

    return `${apiOrigin}${normalizedPath}`;
  };

  useEffect(() => {
    const loadClientProfile =
      async () => {
        if (!token) {
          return;
        }

        try {
          const response =
            await api.get(
              '/clients/profile',
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          setClientProfile(
            response.data?.profile ??
              null
          );
        } catch (error: any) {
          console.error(
            'ERROR CARGANDO PERFIL CLIENTE:',
            error.response?.data ||
              error
          );
        }
      };

    loadClientProfile();
  }, [token]);

  const displayName =
    clientProfile?.name ||
    user.name ||
    'Cliente';

  const firstName =
    displayName
      ?.trim()
      .split(' ')[0] ||
    'Cliente';

  const initials = useMemo(() => {
    return (
      displayName
        ?.trim()
        .split(' ')
        .filter(Boolean)
        .map((word: string) =>
          word.charAt(0)
        )
        .join('')
        .substring(0, 2)
        .toUpperCase() || 'CL'
    );
  }, [displayName]);

  /*
    ESTADÍSTICAS
  */
  const activeRequestCount =
    activeRequests.filter(
      (request) =>
        request.status !==
        'Completada'
    ).length;

  const completedRequestCount =
    activeRequests.filter(
      (request) =>
        request.status ===
        'Completada'
    ).length;

  const upcomingRequest =
    activeRequests.find(
      (request) =>
        request.status ===
          'Confirmada' ||
        request.status ===
          'Pendiente'
    );

  /*
    CERRAR SESIÓN
  */
  const handleLogout = () => {
    localStorage.removeItem(
      'token'
    );

    localStorage.removeItem(
      'user'
    );

    navigate('/login');
  };

  /*
    FUNCIONES TEMPORALES

    Las dejamos mientras hacemos
    solicitudes, favoritos e historial.
  */
  const handlePendingSection = (
    section: string
  ) => {
    alert(
      `${section} estará disponible próximamente.`
    );
  };

  return (
    <div className="client-dashboard">

      {/* SIDEBAR */}

      <aside className="client-sidebar">

        <button
          type="button"
          className="client-logo"
          onClick={() =>
            navigate('/')
          }
        >
          <img
            src={logo}
            alt="FASYN"
          />
        </button>

        <div className="client-user">

          <div
            className="client-avatar"
            style={{
              overflow: 'hidden',
            }}
          >
            {clientProfile?.profilePhotoUrl ? (
              <img
                src={resolveStoredFileUrl(
                  clientProfile.profilePhotoUrl
                )}
                alt={displayName}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              initials
            )}
          </div>

          <div className="client-user-info">

            <strong>
              {displayName}
            </strong>

            <span>
              Cliente
            </span>

          </div>

        </div>

        <nav className="client-menu">

          <button
            type="button"
            className="active"
            onClick={() =>
              navigate('/client')
            }
          >
            <span>⌂</span>
            Inicio
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(
                '/specialists'
              )
            }
          >
            <span>⌕</span>
            Buscar especialistas
          </button>

          <button
            type="button"
            onClick={() =>
              handlePendingSection(
                'Mis solicitudes'
              )
            }
          >
            <span>◉</span>
            Mis solicitudes
          </button>

          <button
            type="button"
            onClick={() =>
              handlePendingSection(
                'Favoritos'
              )
            }
          >
            <span>♡</span>
            Favoritos
          </button>

          <button
            type="button"
            onClick={() =>
              handlePendingSection(
                'Historial'
              )
            }
          >
            <span>✓</span>
            Historial
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(
                '/client/profile'
              )
            }
          >
            <span>♙</span>
            Mi perfil
          </button>

        </nav>

        <div className="client-sidebar-bottom">

          <button
            type="button"
            className="client-back-home"
            onClick={() =>
              navigate('/')
            }
          >
            ← Volver a FASYN
          </button>

          <button
            type="button"
            className="client-logout"
            onClick={
              handleLogout
            }
          >
            Cerrar sesión
          </button>

        </div>

      </aside>

      {/* CONTENIDO */}

      <main className="client-main">

        {/* HEADER */}

        <header className="client-header">

          <div>

            <span className="client-eyebrow">
              PANEL DEL CLIENTE
            </span>

            <h1>
              Hola, {firstName}.
            </h1>

            <p>
              Encuentra especialistas
              y administra tus servicios
              desde un solo lugar.
            </p>

          </div>

          <button
            type="button"
            className="find-specialist-button"
            onClick={() =>
              navigate(
                '/specialists'
              )
            }
          >
            <span>+</span>
            Buscar especialista
          </button>

        </header>

        {/* MÉTRICAS */}

        <section className="client-stats">

          <article>

            <div className="client-stat-icon">
              ◉
            </div>

            <div>
              <span>
                Solicitudes activas
              </span>

              <strong>
                {activeRequestCount}
              </strong>

              <small>
                Servicios en proceso
              </small>
            </div>

          </article>

          <article>

            <div className="client-stat-icon">
              ◷
            </div>

            <div>
              <span>
                Próximos servicios
              </span>

              <strong>
                {upcomingRequest
                  ? 1
                  : 0}
              </strong>

              <small>
                Servicios programados
              </small>
            </div>

          </article>

          <article>

            <div className="client-stat-icon">
              ♡
            </div>

            <div>
              <span>
                Favoritos
              </span>

              <strong>
                {favorites.length}
              </strong>

              <small>
                Especialistas guardados
              </small>
            </div>

          </article>

          <article>

            <div className="client-stat-icon">
              ✓
            </div>

            <div>
              <span>
                Servicios realizados
              </span>

              <strong>
                {completedRequestCount}
              </strong>

              <small>
                Trabajos completados
              </small>
            </div>

          </article>

        </section>

        {/* SOLICITUDES + PRÓXIMO SERVICIO */}

        <div className="client-grid">

          <section className="client-panel">

            <div className="client-panel-header">

              <div>

                <span className="client-section-eyebrow">
                  ACTIVIDAD
                </span>

                <h2>
                  Mis solicitudes
                </h2>

                <p>
                  Consulta el estado de
                  los servicios que has
                  solicitado.
                </p>

              </div>

              {activeRequests.length >
                0 && (
                <button
                  type="button"
                  onClick={() =>
                    handlePendingSection(
                      'Mis solicitudes'
                    )
                  }
                >
                  Ver todas
                  <span>→</span>
                </button>
              )}

            </div>

            {activeRequests.length ===
            0 ? (

              <div className="client-empty-state">

                <div className="client-empty-icon">
                  +
                </div>

                <h3>
                  Aún no tienes
                  solicitudes
                </h3>

                <p>
                  Encuentra un
                  especialista y solicita
                  el servicio que
                  necesitas.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      '/specialists'
                    )
                  }
                >
                  Buscar especialistas
                </button>

              </div>

            ) : (

              <div className="client-request-list">

                {activeRequests.map(
                  (request) => (
                    <article
                      className="client-request"
                      key={request.id}
                    >

                      <div className="request-specialist">

                        <div className="request-avatar">

                          {request.specialist
                            .split(' ')
                            .filter(Boolean)
                            .map(
                              (
                                word
                              ) =>
                                word.charAt(
                                  0
                                )
                            )
                            .join('')
                            .slice(
                              0,
                              2
                            )
                            .toUpperCase()}

                        </div>

                        <div>

                          <strong>
                            {
                              request.specialist
                            }
                          </strong>

                          <span>
                            {
                              request.service
                            }
                          </span>

                        </div>

                      </div>

                      <div className="client-request-date">

                        <small>
                          Fecha
                        </small>

                        <strong>
                          {
                            request.date
                          }
                        </strong>

                      </div>

                      <span
                        className={`client-request-status ${request.status.toLowerCase()}`}
                      >
                        {
                          request.status
                        }
                      </span>

                      <button
                        type="button"
                        className="client-details-button"
                        onClick={() =>
                          navigate(
                            `/specialists/${request.specialistId}`
                          )
                        }
                      >
                        Ver detalle
                      </button>

                    </article>
                  )
                )}

              </div>

            )}

          </section>

          {/* PRÓXIMO SERVICIO */}

          <aside className="client-next-service">

            <span className="next-label">
              PRÓXIMO SERVICIO
            </span>

            {upcomingRequest ? (
              <>

                <div className="next-date">

                  <strong>
                    {
                      upcomingRequest.date
                    }
                  </strong>

                </div>

                <h3>
                  {
                    upcomingRequest.service
                  }
                </h3>

                <p>
                  Con{' '}
                  {
                    upcomingRequest.specialist
                  }
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/specialists/${upcomingRequest.specialistId}`
                    )
                  }
                >
                  Ver servicio
                </button>

              </>
            ) : (
              <div className="next-service-empty">

                <div>
                  ◷
                </div>

                <h3>
                  Sin servicios
                  programados
                </h3>

                <p>
                  Cuando contrates un
                  servicio aparecerá
                  aquí.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      '/specialists'
                    )
                  }
                >
                  Buscar especialista
                </button>

              </div>
            )}

          </aside>

        </div>

        {/* FAVORITOS */}

        <section className="client-panel favorites-section">

          <div className="client-panel-header">

            <div>

              <span className="client-section-eyebrow">
                FAVORITOS
              </span>

              <h2>
                Tus especialistas
                favoritos
              </h2>

              <p>
                Guarda profesionales
                para encontrarlos más
                rápido cuando los
                necesites.
              </p>

            </div>

            {favorites.length >
              0 && (
              <button
                type="button"
                onClick={() =>
                  handlePendingSection(
                    'Favoritos'
                  )
                }
              >
                Ver favoritos
                <span>→</span>
              </button>
            )}

          </div>

          {favorites.length === 0 ? (

            <div className="client-empty-favorites">

              <div className="client-empty-icon">
                ♡
              </div>

              <div>

                <h3>
                  Aún no tienes
                  favoritos
                </h3>

                <p>
                  Explora especialistas
                  y guarda los perfiles
                  que más te interesen.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/specialists'
                  )
                }
              >
                Explorar especialistas
              </button>

            </div>

          ) : (

            <div className="client-favorites">

              {favorites.map(
                (favorite) => (
                  <article
                    className="client-favorite-card"
                    key={favorite.id}
                  >

                    <div className="favorite-avatar">
                      {
                        favorite.initials
                      }
                    </div>

                    <div className="favorite-info">

                      <h3>
                        {favorite.name}
                      </h3>

                      <span>
                        {
                          favorite.specialty
                        }
                      </span>

                      <div>
                        {favorite.rating
                          ? `★ ${favorite.rating}`
                          : 'Sin calificaciones'}
                      </div>

                    </div>

                    <div className="favorite-price">

                      <small>
                        Desde
                      </small>

                      <strong>
                        {favorite.price ||
                          'Consultar'}
                      </strong>

                    </div>

                    <button
                      type="button"
                      className="favorite-profile-button"
                      onClick={() =>
                        navigate(
                          `/specialists/${favorite.id}`
                        )
                      }
                    >
                      Ver perfil
                    </button>

                  </article>
                )
              )}

            </div>

          )}

        </section>

      </main>

    </div>
  );
};

export default ClientDashboard;