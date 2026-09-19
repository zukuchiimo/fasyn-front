import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import { api } from '../../api/api';
import logo from '../../assets/logo.png';

import './AdminClients.css';

type RequestStatus =
  | 'PENDING_ADMIN'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

interface Category {
  id: number;
  name: string;
  description?: string | null;
}

interface SpecialistUser {
  id: number;
  name: string;
  email?: string;
}

interface SpecialistProfile {
  id: number;
  userId: number;
  user: SpecialistUser;
}

interface Service {
  id: number;
  name: string;
  description?: string | null;
  price: string;
  priceType: string;

  category: Category;
  specialist: SpecialistProfile;
}

interface ClientRequest {
  id: number;
  clientId: number;
  serviceId: number;

  status: RequestStatus;

  message?: string | null;

  reviewedById?: number | null;
  reviewedAt?: string | null;

  createdAt: string;
  updatedAt: string;

  service: Service;
}

interface Client {
  id: number;
  name: string;
  email: string;

  active: boolean;

  createdAt: string;
  updatedAt: string;

  clientRequests: ClientRequest[];
}

type FilterType =
  | 'ALL'
  | 'ACTIVE'
  | 'INACTIVE';

interface EditForm {
  name: string;
  email: string;
}

const EMPTY_FORM: EditForm = {
  name: '',
  email: '',
};

const AdminClients = () => {
  const navigate = useNavigate();

  const token =
    localStorage.getItem('token');

  const userRaw =
    localStorage.getItem('user');

  const [clients, setClients] =
    useState<Client[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('');

  const [search, setSearch] =
    useState('');

  const [filter, setFilter] =
    useState<FilterType>('ALL');

  const [
    selectedClient,
    setSelectedClient,
  ] = useState<Client | null>(
    null
  );

  const [
    editingClient,
    setEditingClient,
  ] = useState<Client | null>(
    null
  );

  const [
    statusClient,
    setStatusClient,
  ] = useState<Client | null>(
    null
  );

  const [
    deletingClient,
    setDeletingClient,
  ] = useState<Client | null>(
    null
  );

  const [editForm, setEditForm] =
    useState<EditForm>(
      EMPTY_FORM
    );

  const [saving, setSaving] =
    useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  /*
    USUARIO ADMINISTRADOR
  */

  const currentUser =
    useMemo(() => {
      try {
        return userRaw
          ? JSON.parse(userRaw)
          : null;
      } catch {
        return null;
      }
    }, [userRaw]);

  /*
    CARGAR CLIENTES
  */

  const loadClients =
    useCallback(async () => {
      try {
        setLoading(true);
        setError('');

        if (!token) {
          navigate('/login');
          return;
        }

        const response =
          await api.get(
            '/admin/clients',
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        setClients(
          response.data.clients ??
            []
        );
      } catch (err: any) {
        console.error(
          'GET ADMIN CLIENTS ERROR:',
          err
        );

        if (
          err?.response?.status ===
            401 ||
          err?.response?.status ===
            403
        ) {
          setError(
            'No tienes permisos para consultar los clientes.'
          );

          return;
        }

        setError(
          err?.response?.data
            ?.message ||
            'No fue posible consultar los clientes.'
        );
      } finally {
        setLoading(false);
      }
    }, [navigate, token]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  /*
    OCULTAR MENSAJE DE ÉXITO
  */

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setSuccessMessage('');
        },
        3500
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [successMessage]);

  /*
    ESTADÍSTICAS
  */

  const stats = useMemo(() => {
    const total =
      clients.length;

    const active =
      clients.filter(
        (client) =>
          client.active
      ).length;

    const inactive =
      clients.filter(
        (client) =>
          !client.active
      ).length;

    const requests =
      clients.reduce(
        (
          accumulator,
          client
        ) =>
          accumulator +
          (
            client.clientRequests ??
            []
          ).length,
        0
      );

    return {
      total,
      active,
      inactive,
      requests,
    };
  }, [clients]);

  /*
    FILTROS
  */

  const filteredClients =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      return clients.filter(
        (client) => {
          /*
            FILTRO POR ESTADO
          */

          if (
            filter ===
              'ACTIVE' &&
            !client.active
          ) {
            return false;
          }

          if (
            filter ===
              'INACTIVE' &&
            client.active
          ) {
            return false;
          }

          /*
            SIN BÚSQUEDA
          */

          if (!value) {
            return true;
          }

          /*
            TAMBIÉN BUSCAMOS
            POR SERVICIOS,
            ESPECIALISTAS
            Y CATEGORÍAS
          */

          const requestData =
            (
              client.clientRequests ??
              []
            )
              .map(
                (request) =>
                  [
                    request.service
                      ?.name,

                    request.service
                      ?.category
                      ?.name,

                    request.service
                      ?.specialist
                      ?.user
                      ?.name,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(' ')
              )
              .join(' ');

          const searchable = [
            client.name,
            client.email,
            requestData,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return searchable.includes(
            value
          );
        }
      );
    }, [
      clients,
      search,
      filter,
    ]);

  /*
    ABRIR EDICIÓN
  */

  const openEdit = (
    client: Client
  ) => {
    setEditForm({
      name: client.name ?? '',
      email:
        client.email ?? '',
    });

    setEditingClient(
      client
    );
  };

  /*
    INPUTS
  */

  const handleInputChange = (
    event:
      React.ChangeEvent<HTMLInputElement>
  ) => {
    const {
      name,
      value,
    } = event.target;

    setEditForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  };

  /*
    GUARDAR EDICIÓN
  */

  const handleSave = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!editingClient) {
      return;
    }

    if (
      !editForm.name.trim()
    ) {
      setError(
        'El nombre del cliente es obligatorio.'
      );

      return;
    }

    if (
      !editForm.email.trim()
    ) {
      setError(
        'El correo electrónico es obligatorio.'
      );

      return;
    }

    try {
      setSaving(true);
      setError('');

      await api.patch(
        `/admin/clients/${editingClient.id}`,
        {
          name:
            editForm.name.trim(),

          email:
            editForm.email
              .trim()
              .toLowerCase(),
        },
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      setEditingClient(null);

      setEditForm(
        EMPTY_FORM
      );

      setSuccessMessage(
        'Cliente actualizado correctamente.'
      );

      await loadClients();
    } catch (err: any) {
      console.error(
        'UPDATE CLIENT ERROR:',
        err
      );

      setError(
        err?.response?.data
          ?.message ||
          'No fue posible actualizar el cliente.'
      );
    } finally {
      setSaving(false);
    }
  };

  /*
    ACTIVAR / DAR DE BAJA
  */

  const handleChangeStatus =
    async () => {
      if (!statusClient) {
        return;
      }

      const currentStatus =
        statusClient.active;

      try {
        setActionLoading(
          true
        );

        setError('');

        await api.patch(
          `/admin/clients/${statusClient.id}/status`,
          {
            active:
              !currentStatus,
          },
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        setStatusClient(null);

        setSuccessMessage(
          currentStatus
            ? 'Cliente dado de baja correctamente.'
            : 'Cliente reactivado correctamente.'
        );

        await loadClients();
      } catch (err: any) {
        console.error(
          'STATUS CLIENT ERROR:',
          err
        );

        setError(
          err?.response?.data
            ?.message ||
            'No fue posible cambiar el estado del cliente.'
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  /*
    ELIMINAR
  */

  const handleDelete =
    async () => {
      if (!deletingClient) {
        return;
      }

      try {
        setActionLoading(
          true
        );

        setError('');

        await api.delete(
          `/admin/clients/${deletingClient.id}`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        setDeletingClient(
          null
        );

        setSuccessMessage(
          'Cliente eliminado correctamente.'
        );

        await loadClients();
      } catch (err: any) {
        console.error(
          'DELETE CLIENT ERROR:',
          err
        );

        setError(
          err?.response?.data
            ?.message ||
            'No fue posible eliminar el cliente.'
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  /*
    LOGOUT
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
    FECHA
  */

  const formatDate = (
    date: string
  ) => {
    if (!date) {
      return '--';
    }

    return new Intl.DateTimeFormat(
      'es-MX',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    ).format(
      new Date(date)
    );
  };

  /*
    DINERO
  */

  const formatMoney = (
    value?: string
  ) => {
    const amount =
      Number(value ?? 0);

    return new Intl.NumberFormat(
      'es-MX',
      {
        style: 'currency',
        currency: 'MXN',
      }
    ).format(
      Number.isNaN(amount)
        ? 0
        : amount
    );
  };

  /*
    STATUS
  */

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

  return (
    <div className="admin-page">

      {/* ============================
          SIDEBAR
      ============================ */}

      <aside className="admin-sidebar">
        <div>

          <div className="admin-brand">
            <img
              src={logo}
              alt="FASYN"
            />

            <div>
              <strong>
                FASYN
              </strong>

              <span>
                ADMIN
              </span>
            </div>
          </div>

          <nav className="admin-menu">

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/admin'
                )
              }
            >
              <span>⌂</span>
              Resumen
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/admin'
                )
              }
            >
              <span>▤</span>
              Solicitudes
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/admin/specialists'
                )
              }
            >
              <span>♙</span>
              Especialistas
            </button>

            <button
              type="button"
              className="active"
            >
              <span>♧</span>
              Clientes
            </button>

            <button
              type="button"
            >
              <span>▦</span>
              Categorías
            </button>

          </nav>
        </div>

        <div className="admin-sidebar-bottom">
          <button
            type="button"
            onClick={
              handleLogout
            }
          >
            <span>↪</span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ============================
          CONTENIDO
      ============================ */}

      <main className="admin-content">

        {/* HEADER */}

        <header className="admin-header">

          <div>
            <span className="admin-eyebrow">
              PANEL DE CONTROL
            </span>

            <h1>
              Clientes
            </h1>

            <p>
              Administra los clientes
              registrados en FASYN.
            </p>
          </div>

          <div className="admin-user">

            <div className="admin-user-avatar">
              {currentUser?.name
                ?.charAt(0)
                ?.toUpperCase() ||
                'A'}
            </div>

            <div>
              <strong>
                {currentUser?.name ||
                  'Administrador'}
              </strong>

              <span>
                Administrador
              </span>
            </div>

          </div>

        </header>

        {/* ============================
            ESTADÍSTICAS
        ============================ */}

        <section className="client-stats">

          <article>
            <span>
              CLIENTES
            </span>

            <strong>
              {stats.total}
            </strong>

            <small>
              Registrados
            </small>
          </article>

          <article>
            <span>
              ACTIVOS
            </span>

            <strong>
              {stats.active}
            </strong>

            <small>
              Cuentas activas
            </small>
          </article>

          <article>
            <span>
              INACTIVOS
            </span>

            <strong>
              {stats.inactive}
            </strong>

            <small>
              Dados de baja
            </small>
          </article>

          <article>
            <span>
              SOLICITUDES
            </span>

            <strong>
              {stats.requests}
            </strong>

            <small>
              Solicitudes realizadas
            </small>
          </article>

        </section>

        {/* MENSAJES */}

        {successMessage && (
          <div className="admin-success-message">
            <span>✓</span>

            {successMessage}
          </div>
        )}

        {error && (
          <div className="admin-error-message">
            {error}
          </div>
        )}

        {/* ============================
            PANEL CLIENTES
        ============================ */}

        <section className="clients-panel">

          <div className="clients-panel-header">

            <div>
              <span className="admin-eyebrow">
                DIRECTORIO
              </span>

              <h2>
                Clientes registrados
              </h2>

              <p>
                Consulta, edita y
                administra las cuentas
                de los clientes.
              </p>
            </div>

            <span className="clients-result-count">
              {
                filteredClients.length
              }{' '}
              resultado
              {filteredClients.length !==
              1
                ? 's'
                : ''}
            </span>

          </div>

          {/* TOOLBAR */}

          <div className="clients-toolbar">

            <div className="clients-search">
              <span>
                ⌕
              </span>

              <input
                type="text"
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Buscar por nombre, correo, servicio o especialista..."
              />
            </div>

            <div className="clients-filters">

              <button
                type="button"
                className={
                  filter === 'ALL'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setFilter('ALL')
                }
              >
                Todos
              </button>

              <button
                type="button"
                className={
                  filter ===
                  'ACTIVE'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setFilter(
                    'ACTIVE'
                  )
                }
              >
                Activos
              </button>

              <button
                type="button"
                className={
                  filter ===
                  'INACTIVE'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setFilter(
                    'INACTIVE'
                  )
                }
              >
                Inactivos
              </button>

            </div>

          </div>

          {/* ============================
              LOADING
          ============================ */}

          {loading ? (
            <div className="clients-state">

              <div className="admin-loader" />

              <h3>
                Cargando clientes
              </h3>

              <p>
                Estamos consultando
                la información.
              </p>

            </div>
          ) : filteredClients.length ===
            0 ? (
            <div className="clients-state">

              <div className="clients-empty-icon">
                ♧
              </div>

              <h3>
                No encontramos clientes
              </h3>

              <p>
                Intenta cambiar
                la búsqueda o el filtro.
              </p>

            </div>
          ) : (

            /* ============================
                LISTADO
            ============================ */

            <div className="clients-list">

              {filteredClients.map(
                (client) => {

                  const requests =
                    client.clientRequests ??
                    [];

                  const completed =
                    requests.filter(
                      (request) =>
                        request.status ===
                        'COMPLETED'
                    ).length;

                  const pending =
                    requests.filter(
                      (request) =>
                        request.status ===
                        'PENDING_ADMIN'
                    ).length;

                  return (
                    <article
                      className="client-card"
                      key={
                        client.id
                      }
                    >

                      <div className="client-card-main">

                        <div className="client-avatar">
                          {client.name
                            ?.charAt(0)
                            ?.toUpperCase() ||
                            'C'}
                        </div>

                        <div className="client-info">

                          <div className="client-title-row">

                            <div>
                              <h3>
                                {
                                  client.name
                                }
                              </h3>

                              <span className="client-email">
                                {
                                  client.email
                                }
                              </span>
                            </div>

                            <span
                              className={
                                client.active
                                  ? 'client-status active'
                                  : 'client-status inactive'
                              }
                            >
                              <i />

                              {client.active
                                ? 'Activo'
                                : 'Inactivo'}
                            </span>

                          </div>

                          <div className="client-meta">

                            <span>
                              ID #{client.id}
                            </span>

                            <span>
                              Registrado el{' '}
                              {formatDate(
                                client.createdAt
                              )}
                            </span>

                            <span>
                              {
                                requests.length
                              }{' '}
                              solicitud
                              {requests.length !==
                              1
                                ? 'es'
                                : ''}
                            </span>

                          </div>

                        </div>

                      </div>

                      <div className="client-card-footer">

                        <div className="client-card-numbers">

                          <span>
                            <strong>
                              {
                                requests.length
                              }
                            </strong>

                            Solicitudes
                          </span>

                          <span>
                            <strong>
                              {
                                completed
                              }
                            </strong>

                            Completadas
                          </span>

                          <span>
                            <strong>
                              {
                                pending
                              }
                            </strong>

                            Pendientes
                          </span>

                        </div>

                        <div className="client-actions">

                          <button
                            type="button"
                            className="client-action view"
                            onClick={() =>
                              setSelectedClient(
                                client
                              )
                            }
                          >
                            Ver
                          </button>

                          <button
                            type="button"
                            className="client-action edit"
                            onClick={() =>
                              openEdit(
                                client
                              )
                            }
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className={
                              client.active
                                ? 'client-action disable'
                                : 'client-action enable'
                            }
                            onClick={() =>
                              setStatusClient(
                                client
                              )
                            }
                          >
                            {client.active
                              ? 'Dar de baja'
                              : 'Reactivar'}
                          </button>

                          <button
                            type="button"
                            className="client-action delete"
                            onClick={() =>
                              setDeletingClient(
                                client
                              )
                            }
                          >
                            Eliminar
                          </button>

                        </div>

                      </div>

                    </article>
                  );
                }
              )}

            </div>
          )}

        </section>

      </main>

      {/* ============================
          MODAL VER CLIENTE
      ============================ */}

      {selectedClient && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={() =>
            setSelectedClient(
              null
            )
          }
        >

          <div
            className="admin-modal client-detail-modal"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >

            <div className="admin-modal-header">

              <div>
                <span className="admin-eyebrow">
                  INFORMACIÓN DEL CLIENTE
                </span>

                <h2>
                  {
                    selectedClient.name
                  }
                </h2>

                <p>
                  {
                    selectedClient.email
                  }
                </p>
              </div>

              <button
                type="button"
                className="admin-modal-close"
                onClick={() =>
                  setSelectedClient(
                    null
                  )
                }
              >
                ×
              </button>

            </div>

            <div className="admin-modal-body">

              <div className="client-detail-top">

                <div className="client-detail-avatar">
                  {selectedClient.name
                    ?.charAt(0)
                    ?.toUpperCase()}
                </div>

                <div>
                  <h3>
                    {
                      selectedClient.name
                    }
                  </h3>

                  <span>
                    Cliente #{selectedClient.id}
                  </span>
                </div>

                <span
                  className={
                    selectedClient.active
                      ? 'client-status active'
                      : 'client-status inactive'
                  }
                >
                  <i />

                  {selectedClient.active
                    ? 'Activo'
                    : 'Inactivo'}
                </span>

              </div>

              <div className="client-detail-grid">

                <div>
                  <span>
                    CORREO
                  </span>

                  <strong>
                    {
                      selectedClient.email
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    REGISTRO
                  </span>

                  <strong>
                    {formatDate(
                      selectedClient.createdAt
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    SOLICITUDES
                  </span>

                  <strong>
                    {
                      selectedClient
                        .clientRequests
                        ?.length
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    ESTADO
                  </span>

                  <strong>
                    {selectedClient.active
                      ? 'Cuenta activa'
                      : 'Cuenta inactiva'}
                  </strong>
                </div>

              </div>

              {/* HISTORIAL */}

              <div className="client-detail-section">

                <div className="client-section-title">
                  <div>
                    <span className="admin-eyebrow">
                      ACTIVIDAD
                    </span>

                    <h3>
                      Historial de solicitudes
                    </h3>
                  </div>

                  <span className="client-request-count">
                    {
                      selectedClient
                        .clientRequests
                        ?.length
                    }
                  </span>
                </div>

                {!selectedClient
                  .clientRequests
                  ?.length ? (
                  <div className="client-no-requests">
                    <span>
                      ▤
                    </span>

                    <p>
                      Este cliente todavía
                      no ha realizado
                      solicitudes.
                    </p>
                  </div>
                ) : (
                  <div className="client-request-list">

                    {selectedClient.clientRequests.map(
                      (request) => (
                        <article
                          className="client-request-item"
                          key={
                            request.id
                          }
                        >

                          <div className="client-request-main">

                            <div>
                              <span className="client-request-id">
                                SOLICITUD #
                                {request.id}
                              </span>

                              <h4>
                                {request
                                  .service
                                  ?.name ||
                                  'Servicio'}
                              </h4>

                              <p>
                                {request
                                  .service
                                  ?.category
                                  ?.name ||
                                  'Sin categoría'}
                                {' · '}
                                {request
                                  .service
                                  ?.specialist
                                  ?.user
                                  ?.name ||
                                  'Sin especialista'}
                              </p>
                            </div>

                            <span
                              className={`request-status ${request.status.toLowerCase()}`}
                            >
                              {getStatusLabel(
                                request.status
                              )}
                            </span>

                          </div>

                          <div className="client-request-footer">

                            <span>
                              {formatDate(
                                request.createdAt
                              )}
                            </span>

                            <strong>
                              {formatMoney(
                                request.service
                                  ?.price
                              )}
                            </strong>

                          </div>

                          {request.message && (
                            <div className="client-request-message">
                              {
                                request.message
                              }
                            </div>
                          )}

                        </article>
                      )
                    )}

                  </div>
                )}

              </div>

            </div>

            <div className="admin-modal-footer">

              <button
                type="button"
                className="modal-secondary-button"
                onClick={() =>
                  setSelectedClient(
                    null
                  )
                }
              >
                Cerrar
              </button>

              <button
                type="button"
                className="modal-primary-button"
                onClick={() => {
                  const client =
                    selectedClient;

                  setSelectedClient(
                    null
                  );

                  openEdit(
                    client
                  );
                }}
              >
                Editar cliente
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ============================
          MODAL EDITAR
      ============================ */}

      {editingClient && (
        <div className="admin-modal-backdrop">

          <div className="admin-modal client-edit-modal">

            <div className="admin-modal-header">

              <div>
                <span className="admin-eyebrow">
                  EDITAR CLIENTE
                </span>

                <h2>
                  {
                    editingClient.name
                  }
                </h2>

                <p>
                  Actualiza la información
                  de la cuenta.
                </p>
              </div>

              <button
                type="button"
                className="admin-modal-close"
                disabled={saving}
                onClick={() =>
                  setEditingClient(
                    null
                  )
                }
              >
                ×
              </button>

            </div>

            <form
              onSubmit={
                handleSave
              }
            >

              <div className="admin-modal-body">

                <div className="client-form">

                  <label>
                    <span>
                      Nombre
                    </span>

                    <input
                      type="text"
                      name="name"
                      value={
                        editForm.name
                      }
                      onChange={
                        handleInputChange
                      }
                      required
                    />
                  </label>

                  <label>
                    <span>
                      Correo electrónico
                    </span>

                    <input
                      type="email"
                      name="email"
                      value={
                        editForm.email
                      }
                      onChange={
                        handleInputChange
                      }
                      required
                    />
                  </label>

                </div>

              </div>

              <div className="admin-modal-footer">

                <button
                  type="button"
                  className="modal-secondary-button"
                  disabled={saving}
                  onClick={() =>
                    setEditingClient(
                      null
                    )
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="modal-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Guardando...'
                    : 'Guardar cambios'}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* ============================
          MODAL ESTADO
      ============================ */}

      {statusClient && (
        <div className="admin-modal-backdrop">

          <div className="admin-modal admin-confirm-modal">

            <div className="confirm-icon">
              {statusClient.active
                ? '!'
                : '✓'}
            </div>

            <h2>
              {statusClient.active
                ? 'Dar de baja al cliente'
                : 'Reactivar cliente'}
            </h2>

            <p>
              {statusClient.active
                ? `${statusClient.name} quedará marcado como cliente inactivo. Su información y sus solicitudes se conservarán.`
                : `${statusClient.name} volverá a tener su cuenta activa en FASYN.`}
            </p>

            <div className="confirm-actions">

              <button
                type="button"
                className="modal-secondary-button"
                disabled={
                  actionLoading
                }
                onClick={() =>
                  setStatusClient(
                    null
                  )
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className={
                  statusClient.active
                    ? 'modal-warning-button'
                    : 'modal-primary-button'
                }
                disabled={
                  actionLoading
                }
                onClick={
                  handleChangeStatus
                }
              >
                {actionLoading
                  ? 'Procesando...'
                  : statusClient.active
                    ? 'Sí, dar de baja'
                    : 'Sí, reactivar'}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ============================
          MODAL ELIMINAR
      ============================ */}

      {deletingClient && (
        <div className="admin-modal-backdrop">

          <div className="admin-modal admin-confirm-modal">

            <div className="confirm-icon danger">
              !
            </div>

            <h2>
              Eliminar cliente
            </h2>

            <p>
              Estás por eliminar
              definitivamente a{' '}
              <strong>
                {
                  deletingClient.name
                }
              </strong>
              . Sus solicitudes e
              información relacionada
              también pueden ser
              eliminadas.
            </p>

            <div className="delete-warning">
              Esta acción no se puede
              deshacer.
            </div>

            <div className="confirm-actions">

              <button
                type="button"
                className="modal-secondary-button"
                disabled={
                  actionLoading
                }
                onClick={() =>
                  setDeletingClient(
                    null
                  )
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="modal-danger-button"
                disabled={
                  actionLoading
                }
                onClick={
                  handleDelete
                }
              >
                {actionLoading
                  ? 'Eliminando...'
                  : 'Eliminar definitivamente'}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default AdminClients;