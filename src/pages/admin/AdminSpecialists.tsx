import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import { api } from '../../api/api';
import logo from '../../assets/logo.png';

import './AdminSpecialists.css';

type PriceType =
  | 'HOUR'
  | 'DAY'
  | 'ACTIVITY';

interface Category {
  id: number;
  name: string;
  description?: string | null;
}

interface Specialty {
  specialistId: number;
  categoryId: number;
  category: Category;
}

interface Service {
  id: number;
  specialistId: number;
  categoryId: number;
  name: string;
  description?: string | null;
  price: string;
  priceType: PriceType;
  active: boolean;
  category: Category;
}

interface SpecialistProfile {
  id: number;
  userId: number;

  phone?: string | null;
  description?: string | null;
  experience?: number | null;

  state?: string | null;
  municipality?: string | null;
  neighborhood?: string | null;
  postalCode?: string | null;
  address?: string | null;

  available: boolean;
  profileCompleted: boolean;

  createdAt: string;
  updatedAt: string;

  specialties: Specialty[];
  services: Service[];
}

interface Specialist {
  id: number;
  name: string;
  email: string;
  createdAt: string;

  specialistProfile:
    | SpecialistProfile
    | null;
}

type FilterType =
  | 'ALL'
  | 'ACTIVE'
  | 'INACTIVE';

interface EditForm {
  name: string;
  phone: string;
  description: string;
  experience: string;
  state: string;
  municipality: string;
  neighborhood: string;
  postalCode: string;
  address: string;
}

const EMPTY_FORM: EditForm = {
  name: '',
  phone: '',
  description: '',
  experience: '',
  state: '',
  municipality: '',
  neighborhood: '',
  postalCode: '',
  address: '',
};

const AdminSpecialists = () => {
  const navigate = useNavigate();

  const [specialists, setSpecialists] =
    useState<Specialist[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [filter, setFilter] =
    useState<FilterType>('ALL');

  const [
    selectedSpecialist,
    setSelectedSpecialist,
  ] = useState<Specialist | null>(
    null
  );

  const [
    editingSpecialist,
    setEditingSpecialist,
  ] = useState<Specialist | null>(
    null
  );

  const [
    deletingSpecialist,
    setDeletingSpecialist,
  ] = useState<Specialist | null>(
    null
  );

  const [
    statusSpecialist,
    setStatusSpecialist,
  ] = useState<Specialist | null>(
    null
  );

  const [editForm, setEditForm] =
    useState<EditForm>(EMPTY_FORM);

  const [saving, setSaving] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [successMessage, setSuccessMessage] =
    useState('');

  const token =
    localStorage.getItem('token');

  const userRaw =
    localStorage.getItem('user');

  const currentUser = useMemo(() => {
    try {
      return userRaw
        ? JSON.parse(userRaw)
        : null;
    } catch {
      return null;
    }
  }, [userRaw]);

  const loadSpecialists =
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
            '/admin/specialists',
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        setSpecialists(
          response.data.specialists ?? []
        );
      } catch (err: any) {
        console.error(
          'GET ADMIN SPECIALISTS ERROR:',
          err
        );

        if (
          err?.response?.status === 401 ||
          err?.response?.status === 403
        ) {
          setError(
            'No tienes permisos para consultar los especialistas.'
          );

          return;
        }

        setError(
          err?.response?.data?.message ||
            'No fue posible consultar los especialistas.'
        );
      } finally {
        setLoading(false);
      }
    }, [navigate, token]);

  useEffect(() => {
    loadSpecialists();
  }, [loadSpecialists]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(
      () => {
        setSuccessMessage('');
      },
      3500
    );

    return () =>
      window.clearTimeout(timer);
  }, [successMessage]);

  const filteredSpecialists =
    useMemo(() => {
      const value =
        search.trim().toLowerCase();

      return specialists.filter(
        (specialist) => {
          const profile =
            specialist.specialistProfile;

          const available =
            profile?.available ?? false;

          if (
            filter === 'ACTIVE' &&
            !available
          ) {
            return false;
          }

          if (
            filter === 'INACTIVE' &&
            available
          ) {
            return false;
          }

          if (!value) {
            return true;
          }

          const specialties =
            profile?.specialties
              ?.map(
                (item) =>
                  item.category.name
              )
              .join(' ') ?? '';

          const services =
            profile?.services
              ?.map(
                (service) =>
                  service.name
              )
              .join(' ') ?? '';

          const location = [
            profile?.state,
            profile?.municipality,
            profile?.neighborhood,
          ]
            .filter(Boolean)
            .join(' ');

          const searchable = [
            specialist.name,
            specialist.email,
            profile?.phone,
            specialties,
            services,
            location,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return searchable.includes(
            value
          );
        }
      );
    }, [specialists, search, filter]);

  const stats = useMemo(() => {
    const total =
      specialists.length;

    const active =
      specialists.filter(
        (specialist) =>
          specialist.specialistProfile
            ?.available
      ).length;

    const inactive =
      total - active;

    const services =
      specialists.reduce(
        (totalServices, specialist) =>
          totalServices +
          (
            specialist
              .specialistProfile
              ?.services ?? []
          ).filter(
            (service) =>
              service.active
          ).length,
        0
      );

    return {
      total,
      active,
      inactive,
      services,
    };
  }, [specialists]);

  const openEdit = (
    specialist: Specialist
  ) => {
    const profile =
      specialist.specialistProfile;

    setEditForm({
      name: specialist.name ?? '',
      phone: profile?.phone ?? '',
      description:
        profile?.description ?? '',
      experience:
        profile?.experience !== null &&
        profile?.experience !== undefined
          ? String(
              profile.experience
            )
          : '',
      state: profile?.state ?? '',
      municipality:
        profile?.municipality ?? '',
      neighborhood:
        profile?.neighborhood ?? '',
      postalCode:
        profile?.postalCode ?? '',
      address:
        profile?.address ?? '',
    });

    setEditingSpecialist(
      specialist
    );
  };

  const handleInputChange = (
    event:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const {
      name,
      value,
    } = event.target;

    setEditForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSave = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!editingSpecialist) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      await api.patch(
        `/admin/specialists/${editingSpecialist.id}`,
        {
          name:
            editForm.name.trim(),
          phone:
            editForm.phone.trim(),
          description:
            editForm.description.trim(),
          experience:
            editForm.experience
              ? Number(
                  editForm.experience
                )
              : null,
          state:
            editForm.state.trim(),
          municipality:
            editForm.municipality.trim(),
          neighborhood:
            editForm.neighborhood.trim(),
          postalCode:
            editForm.postalCode.trim(),
          address:
            editForm.address.trim(),
        },
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      setEditingSpecialist(null);
      setEditForm(EMPTY_FORM);

      setSuccessMessage(
        'Especialista actualizado correctamente.'
      );

      await loadSpecialists();
    } catch (err: any) {
      console.error(
        'UPDATE SPECIALIST ERROR:',
        err
      );

      setError(
        err?.response?.data?.message ||
          'No fue posible actualizar el especialista.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChangeStatus =
    async () => {
      if (!statusSpecialist) {
        return;
      }

      const currentStatus =
        statusSpecialist
          .specialistProfile
          ?.available ?? false;

      try {
        setActionLoading(true);
        setError('');

        await api.patch(
          `/admin/specialists/${statusSpecialist.id}/status`,
          {
            available:
              !currentStatus,
          },
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        setStatusSpecialist(null);

        setSuccessMessage(
          currentStatus
            ? 'Especialista dado de baja correctamente.'
            : 'Especialista reactivado correctamente.'
        );

        await loadSpecialists();
      } catch (err: any) {
        console.error(
          'STATUS SPECIALIST ERROR:',
          err
        );

        setError(
          err?.response?.data?.message ||
            'No fue posible cambiar el estado del especialista.'
        );
      } finally {
        setActionLoading(false);
      }
    };

  const handleDelete =
    async () => {
      if (!deletingSpecialist) {
        return;
      }

      try {
        setActionLoading(true);
        setError('');

        await api.delete(
          `/admin/specialists/${deletingSpecialist.id}`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        setDeletingSpecialist(null);

        setSuccessMessage(
          'Especialista eliminado correctamente.'
        );

        await loadSpecialists();
      } catch (err: any) {
        console.error(
          'DELETE SPECIALIST ERROR:',
          err
        );

        setError(
          err?.response?.data?.message ||
            'No fue posible eliminar el especialista.'
        );
      } finally {
        setActionLoading(false);
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

  const formatPriceType = (
    priceType: PriceType
  ) => {
    switch (priceType) {
      case 'HOUR':
        return 'por hora';

      case 'DAY':
        return 'por día';

      case 'ACTIVITY':
        return 'por actividad';

      default:
        return '';
    }
  };

  const formatMoney = (
    value: string
  ) => {
    const amount =
      Number(value);

    if (
      Number.isNaN(amount)
    ) {
      return `$${value}`;
    }

    return new Intl.NumberFormat(
      'es-MX',
      {
        style: 'currency',
        currency: 'MXN',
      }
    ).format(amount);
  };

  return (
    <div className="admin-page">
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
      navigate('/admin')
    }
  >
    <span>⌂</span>
    Resumen
  </button>

  <button
    type="button"
    onClick={() =>
      navigate('/admin')
    }
  >
    <span>▤</span>
    Solicitudes
  </button>

  <button
    type="button"
    className="active"
    onClick={() =>
      navigate('/admin/specialists')
    }
  >
    <span>♙</span>
    Especialistas
  </button>

  <button
    type="button"
    onClick={() =>
      navigate('/admin/clients')
    }
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

      <main className="admin-content">
        <header className="admin-header">
          <div>
            <span className="admin-eyebrow">
              PANEL DE CONTROL
            </span>

            <h1>
              Especialistas
            </h1>

            <p>
              Administra los especialistas
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

        <section className="specialist-stats">
          <article>
            <span>
              ESPECIALISTAS
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
              Disponibles
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
              SERVICIOS
            </span>

            <strong>
              {stats.services}
            </strong>

            <small>
              Servicios activos
            </small>
          </article>
        </section>

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

        <section className="specialists-panel">
          <div className="specialists-panel-header">
            <div>
              <span className="admin-eyebrow">
                DIRECTORIO
              </span>

              <h2>
                Especialistas registrados
              </h2>

              <p>
                Consulta, edita y administra
                el estado de cada especialista.
              </p>
            </div>

            <span className="specialists-result-count">
              {
                filteredSpecialists.length
              }{' '}
              resultado
              {filteredSpecialists.length !==
              1
                ? 's'
                : ''}
            </span>
          </div>

          <div className="specialists-toolbar">
            <div className="specialists-search">
              <span>
                ⌕
              </span>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Buscar por nombre, correo, especialidad o ubicación..."
              />
            </div>

            <div className="specialists-filters">
              <button
                type="button"
                className={
                  filter === 'ALL'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setFilter(
                    'ALL'
                  )
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

          {loading ? (
            <div className="specialists-state">
              <div className="admin-loader" />

              <h3>
                Cargando especialistas
              </h3>

              <p>
                Estamos consultando
                la información.
              </p>
            </div>
          ) : filteredSpecialists.length ===
            0 ? (
            <div className="specialists-state">
              <div className="specialists-empty-icon">
                ♙
              </div>

              <h3>
                No encontramos especialistas
              </h3>

              <p>
                Intenta cambiar
                la búsqueda o el filtro.
              </p>
            </div>
          ) : (
            <div className="specialists-list">
              {filteredSpecialists.map(
                (specialist) => {
                  const profile =
                    specialist.specialistProfile;

                  const available =
                    profile?.available ??
                    false;

                  const specialties =
                    profile?.specialties ??
                    [];

                  const services =
                    profile?.services ??
                    [];

                  const activeServices =
                    services.filter(
                      (service) =>
                        service.active
                    ).length;

                  return (
                    <article
                      className="specialist-card"
                      key={
                        specialist.id
                      }
                    >
                      <div className="specialist-card-main">
                        <div className="specialist-avatar">
                          {specialist.name
                            ?.charAt(0)
                            ?.toUpperCase() ||
                            'E'}
                        </div>

                        <div className="specialist-info">
                          <div className="specialist-title-row">
                            <div>
                              <h3>
                                {
                                  specialist.name
                                }
                              </h3>

                              <span className="specialist-email">
                                {
                                  specialist.email
                                }
                              </span>
                            </div>

                            <span
                              className={
                                available
                                  ? 'specialist-status active'
                                  : 'specialist-status inactive'
                              }
                            >
                              <i />

                              {available
                                ? 'Activo'
                                : 'Inactivo'}
                            </span>
                          </div>

                          <div className="specialist-meta">
                            <span>
                              ☎{' '}
                              {profile?.phone ||
                                'Sin teléfono'}
                            </span>

                            <span>
                              ◉{' '}
                              {profile?.municipality ||
                                'Sin municipio'}
                              {profile?.state
                                ? `, ${profile.state}`
                                : ''}
                            </span>

                            <span>
                              ◷{' '}
                              {profile?.experience ??
                                0}{' '}
                              año
                              {(profile?.experience ??
                                0) !==
                              1
                                ? 's'
                                : ''}{' '}
                              de experiencia
                            </span>
                          </div>

                          <div className="specialist-specialties">
                            {specialties.length >
                            0 ? (
                              specialties.map(
                                (
                                  specialty
                                ) => (
                                  <span
                                    key={`${specialty.specialistId}-${specialty.categoryId}`}
                                  >
                                    {
                                      specialty
                                        .category
                                        .name
                                    }
                                  </span>
                                )
                              )
                            ) : (
                              <span className="empty">
                                Sin especialidades
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="specialist-card-footer">
                        <div className="specialist-card-numbers">
                          <span>
                            <strong>
                              {
                                services.length
                              }
                            </strong>

                            Servicios
                          </span>

                          <span>
                            <strong>
                              {
                                activeServices
                              }
                            </strong>

                            Activos
                          </span>

                          <span>
                            <strong>
                              {profile?.profileCompleted
                                ? 'Sí'
                                : 'No'}
                            </strong>

                            Perfil completo
                          </span>
                        </div>

                        <div className="specialist-actions">
                          <button
                            type="button"
                            className="specialist-action view"
                            onClick={() =>
                              setSelectedSpecialist(
                                specialist
                              )
                            }
                          >
                            Ver
                          </button>

                          <button
                            type="button"
                            className="specialist-action edit"
                            onClick={() =>
                              openEdit(
                                specialist
                              )
                            }
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className={
                              available
                                ? 'specialist-action disable'
                                : 'specialist-action enable'
                            }
                            onClick={() =>
                              setStatusSpecialist(
                                specialist
                              )
                            }
                          >
                            {available
                              ? 'Dar de baja'
                              : 'Reactivar'}
                          </button>

                          <button
                            type="button"
                            className="specialist-action delete"
                            onClick={() =>
                              setDeletingSpecialist(
                                specialist
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

      {selectedSpecialist && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={() =>
            setSelectedSpecialist(
              null
            )
          }
        >
          <div
            className="admin-modal admin-specialist-detail-modal"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="admin-modal-header">
              <div>
                <span className="admin-eyebrow">
                  INFORMACIÓN
                </span>

                <h2>
                  {
                    selectedSpecialist.name
                  }
                </h2>

                <p>
                  {
                    selectedSpecialist.email
                  }
                </p>
              </div>

              <button
                type="button"
                className="admin-modal-close"
                onClick={() =>
                  setSelectedSpecialist(
                    null
                  )
                }
              >
                ×
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="detail-status-row">
                <span
                  className={
                    selectedSpecialist
                      .specialistProfile
                      ?.available
                      ? 'specialist-status active'
                      : 'specialist-status inactive'
                  }
                >
                  <i />

                  {selectedSpecialist
                    .specialistProfile
                    ?.available
                    ? 'Activo'
                    : 'Inactivo'}
                </span>

                <span className="detail-profile-state">
                  Perfil{' '}
                  {selectedSpecialist
                    .specialistProfile
                    ?.profileCompleted
                    ? 'completo'
                    : 'incompleto'}
                </span>
              </div>

              <div className="detail-grid">
                <div>
                  <span>
                    TELÉFONO
                  </span>

                  <strong>
                    {selectedSpecialist
                      .specialistProfile
                      ?.phone ||
                      'No registrado'}
                  </strong>
                </div>

                <div>
                  <span>
                    EXPERIENCIA
                  </span>

                  <strong>
                    {selectedSpecialist
                      .specialistProfile
                      ?.experience ??
                      0}{' '}
                    años
                  </strong>
                </div>

                <div>
                  <span>
                    ESTADO
                  </span>

                  <strong>
                    {selectedSpecialist
                      .specialistProfile
                      ?.state ||
                      'No registrado'}
                  </strong>
                </div>

                <div>
                  <span>
                    MUNICIPIO
                  </span>

                  <strong>
                    {selectedSpecialist
                      .specialistProfile
                      ?.municipality ||
                      'No registrado'}
                  </strong>
                </div>

                <div>
                  <span>
                    COLONIA
                  </span>

                  <strong>
                    {selectedSpecialist
                      .specialistProfile
                      ?.neighborhood ||
                      'No registrada'}
                  </strong>
                </div>

                <div>
                  <span>
                    CÓDIGO POSTAL
                  </span>

                  <strong>
                    {selectedSpecialist
                      .specialistProfile
                      ?.postalCode ||
                      'No registrado'}
                  </strong>
                </div>
              </div>

              <div className="detail-section">
                <span className="detail-section-label">
                  DIRECCIÓN
                </span>

                <p>
                  {selectedSpecialist
                    .specialistProfile
                    ?.address ||
                    'No se registró una dirección.'}
                </p>
              </div>

              <div className="detail-section">
                <span className="detail-section-label">
                  DESCRIPCIÓN
                </span>

                <p>
                  {selectedSpecialist
                    .specialistProfile
                    ?.description ||
                    'El especialista no agregó una descripción.'}
                </p>
              </div>

              <div className="detail-section">
                <span className="detail-section-label">
                  ESPECIALIDADES
                </span>

                <div className="specialist-specialties detail-specialties">
                  {selectedSpecialist
                    .specialistProfile
                    ?.specialties
                    .length ? (
                    selectedSpecialist.specialistProfile.specialties.map(
                      (
                        specialty
                      ) => (
                        <span
                          key={`${specialty.specialistId}-${specialty.categoryId}`}
                        >
                          {
                            specialty
                              .category
                              .name
                          }
                        </span>
                      )
                    )
                  ) : (
                    <span className="empty">
                      Sin especialidades
                    </span>
                  )}
                </div>
              </div>

              <div className="detail-section">
                <span className="detail-section-label">
                  SERVICIOS
                </span>

                <div className="detail-services">
                  {selectedSpecialist
                    .specialistProfile
                    ?.services
                    .length ? (
                    selectedSpecialist.specialistProfile.services.map(
                      (service) => (
                        <article
                          key={
                            service.id
                          }
                        >
                          <div>
                            <strong>
                              {
                                service.name
                              }
                            </strong>

                            <span>
                              {
                                service
                                  .category
                                  .name
                              }
                            </span>
                          </div>

                          <div className="detail-service-price">
                            <strong>
                              {formatMoney(
                                service.price
                              )}
                            </strong>

                            <span>
                              {formatPriceType(
                                service.priceType
                              )}
                            </span>
                          </div>
                        </article>
                      )
                    )
                  ) : (
                    <p>
                      Este especialista
                      todavía no tiene
                      servicios.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="modal-secondary-button"
                onClick={() =>
                  setSelectedSpecialist(
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
                  const specialist =
                    selectedSpecialist;

                  setSelectedSpecialist(
                    null
                  );

                  openEdit(
                    specialist
                  );
                }}
              >
                Editar especialista
              </button>
            </div>
          </div>
        </div>
      )}

      {editingSpecialist && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal admin-edit-modal">
            <div className="admin-modal-header">
              <div>
                <span className="admin-eyebrow">
                  EDITAR PERFIL
                </span>

                <h2>
                  {
                    editingSpecialist.name
                  }
                </h2>

                <p>
                  Actualiza la
                  información del
                  especialista.
                </p>
              </div>

              <button
                type="button"
                className="admin-modal-close"
                disabled={saving}
                onClick={() =>
                  setEditingSpecialist(
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
                <div className="admin-form-grid">
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
                      Teléfono
                    </span>

                    <input
                      type="text"
                      name="phone"
                      value={
                        editForm.phone
                      }
                      onChange={
                        handleInputChange
                      }
                    />
                  </label>

                  <label>
                    <span>
                      Experiencia
                    </span>

                    <input
                      type="number"
                      min="0"
                      name="experience"
                      value={
                        editForm.experience
                      }
                      onChange={
                        handleInputChange
                      }
                    />
                  </label>

                  <label>
                    <span>
                      Estado
                    </span>

                    <input
                      type="text"
                      name="state"
                      value={
                        editForm.state
                      }
                      onChange={
                        handleInputChange
                      }
                    />
                  </label>

                  <label>
                    <span>
                      Municipio
                    </span>

                    <input
                      type="text"
                      name="municipality"
                      value={
                        editForm.municipality
                      }
                      onChange={
                        handleInputChange
                      }
                    />
                  </label>

                  <label>
                    <span>
                      Colonia
                    </span>

                    <input
                      type="text"
                      name="neighborhood"
                      value={
                        editForm.neighborhood
                      }
                      onChange={
                        handleInputChange
                      }
                    />
                  </label>

                  <label>
                    <span>
                      Código postal
                    </span>

                    <input
                      type="text"
                      name="postalCode"
                      value={
                        editForm.postalCode
                      }
                      onChange={
                        handleInputChange
                      }
                    />
                  </label>

                  <label>
                    <span>
                      Dirección
                    </span>

                    <input
                      type="text"
                      name="address"
                      value={
                        editForm.address
                      }
                      onChange={
                        handleInputChange
                      }
                    />
                  </label>

                  <label className="admin-form-full">
                    <span>
                      Descripción
                    </span>

                    <textarea
                      name="description"
                      rows={5}
                      value={
                        editForm.description
                      }
                      onChange={
                        handleInputChange
                      }
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
                    setEditingSpecialist(
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

      {statusSpecialist && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal admin-confirm-modal">
            <div className="confirm-icon">
              {statusSpecialist
                .specialistProfile
                ?.available
                ? '!'
                : '✓'}
            </div>

            <h2>
              {statusSpecialist
                .specialistProfile
                ?.available
                ? 'Dar de baja al especialista'
                : 'Reactivar especialista'}
            </h2>

            <p>
              {statusSpecialist
                .specialistProfile
                ?.available
                ? `${statusSpecialist.name} dejará de aparecer como especialista disponible para los clientes. Su información no será eliminada.`
                : `${statusSpecialist.name} volverá a aparecer como especialista disponible para los clientes.`}
            </p>

            <div className="confirm-actions">
              <button
                type="button"
                className="modal-secondary-button"
                disabled={
                  actionLoading
                }
                onClick={() =>
                  setStatusSpecialist(
                    null
                  )
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className={
                  statusSpecialist
                    .specialistProfile
                    ?.available
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
                  : statusSpecialist
                        .specialistProfile
                        ?.available
                    ? 'Sí, dar de baja'
                    : 'Sí, reactivar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingSpecialist && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal admin-confirm-modal">
            <div className="confirm-icon danger">
              !
            </div>

            <h2>
              Eliminar especialista
            </h2>

            <p>
              Estás por eliminar
              definitivamente a{' '}
              <strong>
                {
                  deletingSpecialist.name
                }
              </strong>
              . Esta acción puede
              eliminar su perfil,
              servicios e información
              relacionada.
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
                  setDeletingSpecialist(
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

export default AdminSpecialists;