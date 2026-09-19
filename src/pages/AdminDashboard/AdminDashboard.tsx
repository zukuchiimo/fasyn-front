import {
  useEffect,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import { api } from '../../api/api';
import logo from '../../assets/logo.png';

import './AdminDashboard.css';

type RequestStatus =
  | 'PENDING_ADMIN'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

type AdminRequest = {
  id: number;
  status: RequestStatus;
  message?: string | null;
  createdAt: string;

  client: {
    id: number;
    name: string;
    email: string;
  };

  service: {
    id: number;
    name: string;
    price: number;
    priceType: string;

    category: {
      id: number;
      name: string;
    };

    specialist: {
      user: {
        id: number;
        name: string;
        email: string;
      };
    };
  };
};

type AdminStats = {
  pending: number;
  specialists: number;
  clients: number;
  services: number;
};

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [
    userName,
    setUserName,
  ] = useState(
    'Administrador'
  );

  const [
    requests,
    setRequests,
  ] = useState<
    AdminRequest[]
  >([]);

  const [
    stats,
    setStats,
  ] = useState<AdminStats>({
    pending: 0,
    specialists: 0,
    clients: 0,
    services: 0,
  });

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  const [
    processingId,
    setProcessingId,
  ] = useState<
    number | null
  >(null);

  /*
    CARGAR USUARIO
  */
  useEffect(() => {
    try {
      const storedUser =
        localStorage.getItem(
          'user'
        );

      if (storedUser) {
        const user =
          JSON.parse(
            storedUser
          );

        if (user?.name) {
          setUserName(
            user.name
          );
        }
      }
    } catch (error) {
      console.error(
        'ERROR CARGANDO USUARIO:',
        error
      );
    }

    loadAdminData();
  }, []);

  /*
    CARGAR SOLICITUDES
  */
  const loadAdminData =
    async () => {
      try {
        const token =
          localStorage.getItem(
            'token'
          );

        if (!token) {
          navigate('/login');
          return;
        }

        setLoading(true);
        setError('');

        const response =
          await api.get(
            '/admin/requests',
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        console.log(
          'SOLICITUDES ADMIN:',
          response.data
        );

        setRequests(
          response.data
            ?.requests ||
            []
        );

        setStats(
          response.data
            ?.stats || {
            pending: 0,
            specialists: 0,
            clients: 0,
            services: 0,
          }
        );
      } catch (
        requestError: any
      ) {
        console.error(
          'ERROR ADMIN:',
          requestError.response
            ?.data ||
            requestError
        );

        if (
          requestError.response
            ?.status === 401
        ) {
          localStorage.removeItem(
            'token'
          );

          localStorage.removeItem(
            'user'
          );

          navigate('/login');
          return;
        }

        if (
          requestError.response
            ?.status === 403
        ) {
          setError(
            'Este usuario no tiene permisos de administrador. Cierra sesión y vuelve a iniciar sesión.'
          );

          return;
        }

        setError(
          requestError.response
            ?.data?.message ||
            'No fue posible cargar las solicitudes.'
        );
      } finally {
        setLoading(false);
      }
    };

  /*
    APROBAR SOLICITUD
  */
  const handleApprove =
    async (
      requestId: number
    ) => {
      try {
        const token =
          localStorage.getItem(
            'token'
          );

        if (!token) {
          navigate('/login');
          return;
        }

        setProcessingId(
          requestId
        );

        setError('');

        await api.patch(
          `/admin/requests/${requestId}/approve`,
          {},
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        await loadAdminData();
      } catch (
        requestError: any
      ) {
        console.error(
          'ERROR APROBANDO:',
          requestError.response
            ?.data ||
            requestError
        );

        setError(
          requestError.response
            ?.data?.message ||
            'No fue posible aprobar la solicitud.'
        );
      } finally {
        setProcessingId(
          null
        );
      }
    };

  /*
    RECHAZAR SOLICITUD
  */
  const handleReject =
    async (
      requestId: number
    ) => {
      try {
        const token =
          localStorage.getItem(
            'token'
          );

        if (!token) {
          navigate('/login');
          return;
        }

        setProcessingId(
          requestId
        );

        setError('');

        await api.patch(
          `/admin/requests/${requestId}/reject`,
          {},
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        await loadAdminData();
      } catch (
        requestError: any
      ) {
        console.error(
          'ERROR RECHAZANDO:',
          requestError.response
            ?.data ||
            requestError
        );

        setError(
          requestError.response
            ?.data?.message ||
            'No fue posible rechazar la solicitud.'
        );
      } finally {
        setProcessingId(
          null
        );
      }
    };

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

  const formatDate = (
    value: string
  ) => {
    return new Date(
      value
    ).toLocaleString(
      'es-MX',
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      }
    );
  };

  const getStatusLabel = (
    status: RequestStatus
  ) => {
    switch (status) {
      case 'PENDING_ADMIN':
        return 'Pendiente';

      case 'APPROVED':
        return 'Aprobada';

      case 'REJECTED':
        return 'Rechazada';

      case 'IN_PROGRESS':
        return 'En proceso';

      case 'COMPLETED':
        return 'Completada';

      case 'CANCELLED':
        return 'Cancelada';

      default:
        return status;
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

  return (
    <div className="admin-page">

      {/* SIDEBAR */}

      <aside className="admin-sidebar">

        <div className="admin-brand">

          <img
            src={logo}
            alt="FASYN"
          />

          <span>
            ADMIN
          </span>

        </div>

        <nav className="admin-menu">

          <button
            type="button"
            className="active"
          >
            <span>◫</span>
            Resumen
          </button>

          <button
            type="button"
            onClick={() => {
              document
                .getElementById(
                  'admin-requests'
                )
                ?.scrollIntoView({
                  behavior:
                    'smooth',
                });
            }}
          >
            <span>◉</span>
            Solicitudes
          </button>

 <button
  type="button"
  onClick={() => navigate('/admin/specialists')}
>
  <span>♙</span>
  Especialistas
</button>
<button
  type="button"
  onClick={() => {
    console.log('CLICK CLIENTES');
    navigate('/admin/clients');
  }}
>
  <span>♧</span>
  Clientes
</button>
      <button
  type="button"
  onClick={() =>
    navigate('/admin/categories')
  }
>
  <span>◇</span>
  Categorías
</button>

        </nav>

        <div className="admin-sidebar-bottom">

          <button
            type="button"
            onClick={
              handleLogout
            }
          >
            Cerrar sesión
          </button>

        </div>

      </aside>

      {/* CONTENT */}

      <main className="admin-content">

        <header className="admin-header">

          <div>

            <span>
              PANEL DE CONTROL
            </span>

            <h1>
              Administrador
            </h1>

            <p>
              Gestiona las solicitudes
              y usuarios de FASYN.
            </p>

          </div>

          <div className="admin-user">

            <div className="admin-user-avatar">
              {userName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>

              <strong>
                {userName}
              </strong>

              <span>
                Administrador
              </span>

            </div>

          </div>

        </header>

        {/* ESTADÍSTICAS */}

        <section className="admin-stats">

          <article>

            <span>
              SOLICITUDES PENDIENTES
            </span>

            <strong>
              {stats.pending}
            </strong>

            <small>
              Por revisar
            </small>

          </article>

          <article>

            <span>
              ESPECIALISTAS
            </span>

            <strong>
              {stats.specialists}
            </strong>

            <small>
              Registrados
            </small>

          </article>

          <article>

            <span>
              CLIENTES
            </span>

            <strong>
              {stats.clients}
            </strong>

            <small>
              Registrados
            </small>

          </article>

          <article>

            <span>
              SERVICIOS
            </span>

            <strong>
              {stats.services}
            </strong>

            <small>
              Publicados
            </small>

          </article>

        </section>

        {/* SOLICITUDES */}

        <section
          id="admin-requests"
          className="admin-panel"
        >

          <div className="admin-panel-header">

            <div>

              <span>
                SOLICITUDES
              </span>

              <h2>
                Solicitudes registradas
              </h2>

            </div>

            <button
              type="button"
              className="admin-refresh"
              onClick={
                loadAdminData
              }
            >
              Actualizar
            </button>

          </div>

          {error && (
            <div className="admin-error">
              {error}
            </div>
          )}

          {loading ? (

            <div className="admin-empty">

              <div>
                …
              </div>

              <h3>
                Cargando
                solicitudes
              </h3>

              <p>
                Consultando la
                información de FASYN.
              </p>

            </div>

          ) : requests.length ===
            0 ? (

            <div className="admin-empty">

              <div>
                ✓
              </div>

              <h3>
                Sin solicitudes
              </h3>

              <p>
                Actualmente no hay
                solicitudes registradas.
              </p>

            </div>

          ) : (

            <div className="admin-requests-list">

              {requests.map(
                (request) => (

                  <article
                    key={
                      request.id
                    }
                    className="admin-request-card"
                  >

                    <div className="admin-request-main">

                      <div className="admin-request-number">

                        <span>
                          SOLICITUD
                        </span>

                        <strong>
                          #{request.id}
                        </strong>

                      </div>

                      <div className="admin-request-info">

                        <div className="admin-request-title-row">

                          <div>

                            <span>
                              {
                                request
                                  .service
                                  .category
                                  .name
                              }
                            </span>

                            <h3>
                              {
                                request
                                  .service
                                  .name
                              }
                            </h3>

                          </div>

                          <span
                            className={`admin-request-status ${request.status.toLowerCase()}`}
                          >
                            {getStatusLabel(
                              request.status
                            )}
                          </span>

                        </div>

                        <div className="admin-request-data">

                          <div>

                            <span>
                              CLIENTE
                            </span>

                            <strong>
                              {
                                request
                                  .client
                                  .name
                              }
                            </strong>

                            <small>
                              {
                                request
                                  .client
                                  .email
                              }
                            </small>

                          </div>

                          <div>

                            <span>
                              ESPECIALISTA
                            </span>

                            <strong>
                              {
                                request
                                  .service
                                  .specialist
                                  .user
                                  .name
                              }
                            </strong>

                            <small>
                              {
                                request
                                  .service
                                  .specialist
                                  .user
                                  .email
                              }
                            </small>

                          </div>

                          <div>

                            <span>
                              PRECIO
                            </span>

                            <strong>
                              {formatPrice(
                                request
                                  .service
                                  .price
                              )}
                            </strong>

                          </div>

                          <div>

                            <span>
                              FECHA
                            </span>

                            <strong>
                              {formatDate(
                                request.createdAt
                              )}
                            </strong>

                          </div>

                        </div>

                        {request.message && (

                          <div className="admin-request-message">

                            <span>
                              MENSAJE DEL CLIENTE
                            </span>

                            <p>
                              {
                                request.message
                              }
                            </p>

                          </div>

                        )}

                        {request.status ===
                          'PENDING_ADMIN' && (

                          <div className="admin-request-actions">

                            <button
                              type="button"
                              className="admin-approve"
                              disabled={
                                processingId ===
                                request.id
                              }
                              onClick={() =>
                                handleApprove(
                                  request.id
                                )
                              }
                            >
                              {processingId ===
                              request.id
                                ? 'Procesando...'
                                : 'Aprobar'}
                            </button>

                            <button
                              type="button"
                              className="admin-reject"
                              disabled={
                                processingId ===
                                request.id
                              }
                              onClick={() =>
                                handleReject(
                                  request.id
                                )
                              }
                            >
                              Rechazar
                            </button>

                          </div>

                        )}

                      </div>

                    </div>

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

export default AdminDashboard;