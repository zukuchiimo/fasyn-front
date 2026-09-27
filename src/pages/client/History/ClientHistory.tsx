import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import { api } from '../../../api/api';
import logo from '../../../assets/logo.png';

import '../ClientProfile.css';
import '../MyRequests/MyRequests.css';

type RequestStatus =
  | 'PENDING_PAYMENT'
  | 'PENDING_ADMIN'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

type Review = {
  id: number;
  rating: number;
  comment?: string | null;
};

type ServiceRequest = {
  id: number;

  status: RequestStatus;

  message?: string | null;

  createdAt: string;
  updatedAt: string;

  service: {
    id: number;
    name: string;
    price: string;

    priceType:
      | 'HOUR'
      | 'DAY'
      | 'ACTIVITY';

    category: {
      id: number;
      name: string;
    };

    specialist: {
      id: number;

      user: {
        id: number;
        name: string;
        profilePhotoUrl?: string | null;
      };
    };
  };

  review?: Review | null;
};

type ClientProfile = {
  id: number;
  name: string;
  email: string;
  profilePhotoUrl?: string | null;
};

const ClientHistory = () => {
  const navigate =
    useNavigate();

  const token =
    localStorage.getItem(
      'token'
    );

  const [
    requests,
    setRequests,
  ] = useState<ServiceRequest[]>(
    []
  );

  const [
    profile,
    setProfile,
  ] =
    useState<ClientProfile | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  const initials =
    useMemo(() => {
      const name =
        profile?.name ||
        'Cliente';

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
        'CL'
      );
    }, [profile]);

  const resolveStoredFileUrl = (
    fileUrl?: string | null
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
      fileUrl.startsWith('/')
        ? fileUrl
        : `/${fileUrl}`;

    return `${apiOrigin}${normalizedPath}`;
  };

  const loadHistory =
    async () => {
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        setError('');

        const [
          requestsResponse,
          profileResponse,
        ] =
          await Promise.all([
            api.get(
              '/requests/my',
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            ),

            api.get(
              '/clients/profile',
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            ),
          ]);

        const allRequests:
          ServiceRequest[] =
            requestsResponse
              .data
              ?.requests ||
            [];

        const history =
          allRequests.filter(
            (request) =>
              request.status ===
                'COMPLETED' ||
              request.status ===
                'CANCELLED' ||
              request.status ===
                'REJECTED'
          );

        setRequests(
          history
        );

        setProfile(
          profileResponse
            .data
            ?.profile ||
            null
        );
      } catch (
        requestError: any
      ) {
        console.error(
          'ERROR HISTORIAL:',
          requestError
        );

        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
            'No fue posible cargar tu historial.'
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadHistory();
  }, []);

  const formatDate = (
    date: string
  ) =>
    new Intl.DateTimeFormat(
      'es-MX',
      {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    ).format(
      new Date(date)
    );

  const getStatus = (
    status: RequestStatus
  ) => {
    switch (status) {
      case 'COMPLETED':
        return {
          label:
            'Servicio terminado',
          className:
            'request-status completed',
        };

      case 'CANCELLED':
        return {
          label:
            'Cancelado',
          className:
            'request-status cancelled',
        };

      case 'REJECTED':
        return {
          label:
            'Rechazado',
          className:
            'request-status rejected',
        };

      default:
        return {
          label: status,
          className:
            'request-status',
        };
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(
      'token'
    );

    localStorage.removeItem(
      'user'
    );

    navigate('/login');
  };

  if (loading) {
    return (
      <div className="client-profile-loading">

        <div className="client-profile-spinner" />

        <strong>
          Cargando historial
        </strong>

        <span>
          Estamos consultando tus servicios anteriores.
        </span>

      </div>
    );
  }

  return (
    <div className="client-dashboard">

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
            alt="FEISIN"
          />
        </button>

        <div className="client-user">

          <div
            className="client-avatar"
            style={{
              overflow:
                'hidden',
            }}
          >
            {profile
              ?.profilePhotoUrl ? (
              <img
                src={
                  resolveStoredFileUrl(
                    profile
                      .profilePhotoUrl
                  )
                }
                alt={
                  profile.name
                }
                style={{
                  width:
                    '100%',
                  height:
                    '100%',
                  objectFit:
                    'cover',
                }}
              />
            ) : (
              initials
            )}
          </div>

          <div className="client-user-info">

            <strong>
              {profile?.name ||
                'Cliente'}
            </strong>

            <span>
              Cliente
            </span>

          </div>

        </div>

        <nav className="client-menu">

          <button
            type="button"
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
              navigate(
                '/client/requests'
              )
            }
          >
            <span>◉</span>
            Mis solicitudes
          </button>
<button
  type="button"
  onClick={() =>
    navigate('/client/favorites')
  }
>
  <span>♡</span>
  Favoritos
</button>

          <button
            type="button"
            className="active"
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
            ← Volver a FEISIN
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

      <main className="client-main">

        <header className="client-header">

          <div>

            <span className="client-eyebrow">
              PANEL DEL CLIENTE
            </span>

            <h1>
              Historial de servicios
            </h1>

            <p>
              Consulta los servicios terminados,
              cancelados o rechazados.
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
            <span>＋</span>
            Solicitar servicio
          </button>

        </header>

        {error && (
          <div className="client-profile-message error">
            {error}
          </div>
        )}

        <section className="requests-summary">

          <div className="request-summary-card">
            <span>
              TOTAL
            </span>

            <strong>
              {requests.length}
            </strong>

            <small>
              Servicios en historial
            </small>
          </div>

          <div className="request-summary-card">
            <span>
              TERMINADOS
            </span>

            <strong>
              {
                requests.filter(
                  (request) =>
                    request.status ===
                    'COMPLETED'
                ).length
              }
            </strong>

            <small>
              Trabajos finalizados
            </small>
          </div>

          <div className="request-summary-card">
            <span>
              CANCELADOS
            </span>

            <strong>
              {
                requests.filter(
                  (request) =>
                    request.status ===
                    'CANCELLED'
                ).length
              }
            </strong>

            <small>
              Solicitudes canceladas
            </small>
          </div>

        </section>

        {requests.length === 0 ? (

          <section className="requests-empty-card">

            <div className="requests-empty-icon">
              ✓
            </div>

            <h2>
              Aún no tienes historial
            </h2>

            <p>
              Cuando un servicio termine o sea
              cancelado aparecerá aquí.
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

          </section>

        ) : (

          <section className="requests-container">

            <div className="requests-section-header">

              <div>
                <span className="client-section-eyebrow">
                  HISTORIAL
                </span>

                <h2>
                  Servicios anteriores
                </h2>

                <p>
                  Consulta los trabajos que ya no
                  se encuentran activos.
                </p>
              </div>

            </div>

            <div className="requests-list">

              {requests.map(
                (request) => {

                  const status =
                    getStatus(
                      request.status
                    );

                  const specialist =
                    request
                      .service
                      .specialist
                      .user;

                  return (
                    <article
                      key={
                        request.id
                      }
                      className="service-request-card"
                    >

                      <div className="service-request-top">

                        <div>

                          <span className="request-number">
                            Solicitud #{request.id}
                          </span>

                          <h3>
                            {
                              request
                                .service
                                .name
                            }
                          </h3>

                          <span className="request-category">
                            {
                              request
                                .service
                                .category
                                .name
                            }
                          </span>

                        </div>

                        <span
                          className={
                            status.className
                          }
                        >
                          {
                            status.label
                          }
                        </span>

                      </div>

                      <div className="service-request-info">

                        <div className="request-info-item">
                          <span>
                            SOLICITADO EL
                          </span>

                          <strong>
                            {
                              formatDate(
                                request
                                  .createdAt
                              )
                            }
                          </strong>
                        </div>

                        <div className="request-info-item">
                          <span>
                            PRECIO
                          </span>

                          <strong>
                            $
                            {
                              Number(
                                request
                                  .service
                                  .price
                              )
                                .toLocaleString(
                                  'es-MX'
                                )
                            }
                          </strong>
                        </div>

                      </div>

                      <div className="request-specialist-card">

                        <div className="request-specialist-avatar">

                          {specialist
                            .profilePhotoUrl ? (
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
                          ) : (
                            specialist
                              .name
                              .charAt(0)
                              .toUpperCase()
                          )}

                        </div>

                        <div className="request-specialist-info">

                          <span>
                            ESPECIALISTA
                          </span>

                          <strong>
                            {
                              specialist.name
                            }
                          </strong>

                        </div>

                      </div>

                      {request.review && (

                        <div className="existing-review">

                          <div>

                            <span className="request-detail-title">
                              TU RESEÑA
                            </span>

                            <div className="existing-review-stars">

                              {[1,2,3,4,5]
                                .map(
                                  (
                                    star
                                  ) => (
                                    <span
                                      key={
                                        star
                                      }
                                      className={
                                        star <=
                                        request
                                          .review!
                                          .rating
                                          ? 'selected'
                                          : ''
                                      }
                                    >
                                      ★
                                    </span>
                                  )
                                )}

                            </div>

                            {request
                              .review
                              .comment && (
                              <p>
                                “
                                {
                                  request
                                    .review
                                    .comment
                                }
                                ”
                              </p>
                            )}

                          </div>

                        </div>

                      )}

                    </article>
                  );
                }
              )}

            </div>

          </section>

        )}

      </main>

    </div>
  );
};

export default ClientHistory;