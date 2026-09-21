import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import { api } from '../../api/api';
import logo from '../../assets/logo.png';

import './SpecialistDashboard.css';

type PriceType =
  | 'HOUR'
  | 'DAY'
  | 'ACTIVITY';

type Service = {
  id: number;
  name: string;
  description?: string | null;
  price: string | number;
  priceType: PriceType;
  active: boolean;

  category: {
    id: number;
    name: string;
  };
};


type SpecialtyRelation = {
  category: {
    id: number;
    name: string;
  };
};

type SpecialistProfileData = {
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

  // ARCHIVOS DEL ESPECIALISTA
  profilePhotoUrl?: string | null;
  idFrontUrl?: string | null;
  idBackUrl?: string | null;

  available?: boolean;
  profileCompleted?: boolean;
  specialties?: SpecialtyRelation[];
};

type SpecialistRequest = {
  id: number;
  status:
    | 'APPROVED'
    | 'IN_PROGRESS'
    | 'COMPLETED';
  message?: string | null;
  createdAt: string;
  updatedAt: string;

  client: {
    id: number;
    name: string;
    email: string;
  };

  service: {
    id: number;
    name: string;
    price: string | number;
    priceType: PriceType;

    category: {
      id: number;
      name: string;
    };
  };
};

type EditForm = {
  name: string;
  description: string;
  price: string;
  priceType: PriceType;
};

const SpecialistDashboard = () => {
  const navigate = useNavigate();

  const storedUser =
    localStorage.getItem('user');

  let user = {
    name: 'Especialista',
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

  const firstName =
    user.name?.trim().split(' ')[0] ||
    'Especialista';

  const initials =
    user.name
      ?.trim()
      .split(' ')
      .filter(Boolean)
      .map((word: string) =>
        word.charAt(0)
      )
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'ES';

  const getUploadedFileUrl = (
    fileUrl?: string | null
  ) => {
    if (!fileUrl) {
      return null;
    }

    if (/^https?:\/\//i.test(fileUrl)) {
      return fileUrl;
    }

    const apiBaseUrl =
      api.defaults.baseURL ||
      'http://localhost:3000/api';

    try {
      const apiUrl = new URL(
        apiBaseUrl,
        window.location.origin
      );

      const normalizedFileUrl =
        fileUrl.startsWith('/')
          ? fileUrl
          : `/${fileUrl}`;

      return `${apiUrl.origin}${normalizedFileUrl}`;
    } catch (error) {
      console.error(
        'ERROR CONSTRUYENDO URL DE ARCHIVO:',
        error
      );

      return fileUrl;
    }
  };

  const [services, setServices] =
    useState<Service[]>([]);

  const [profile, setProfile] =
    useState<SpecialistProfileData | null>(
      null
    );

  const [profilePhotoError, setProfilePhotoError] =
    useState(false);

  const [requests, setRequests] =
    useState<SpecialistRequest[]>([]);

  const [
    loadingRequests,
    setLoadingRequests,
  ] = useState(true);

  const [
    requestsError,
    setRequestsError,
  ] = useState('');

  const [
    loadingServices,
    setLoadingServices,
  ] = useState(true);

  const [
    servicesError,
    setServicesError,
  ] = useState('');

  const [
    openMenu,
    setOpenMenu,
  ] = useState<number | null>(null);

  const [
    editingService,
    setEditingService,
  ] = useState<Service | null>(null);

  const [
    savingEdit,
    setSavingEdit,
  ] = useState(false);

  const [
    editForm,
    setEditForm,
  ] = useState<EditForm>({
    name: '',
    description: '',
    price: '',
    priceType: 'ACTIVITY',
  });

  const profilePhotoSrc =
    getUploadedFileUrl(
      profile?.profilePhotoUrl
    );

  useEffect(() => {
    setProfilePhotoError(false);
  }, [profile?.profilePhotoUrl]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    navigate('/login');
  };

  const loadProfile = async () => {
    try {
      const token =
        localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      const response = await api.get(
        '/specialists/profile',
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const profileData =
        response.data?.profile || null;

      console.log(
        'PERFIL ESPECIALISTA:',
        profileData
      );

      console.log(
        'FOTO DE PERFIL:',
        profileData?.profilePhotoUrl
      );

      setProfile(profileData);

    } catch (error: any) {
      console.error(
        'ERROR CARGANDO PERFIL:',
        error.response?.data || error
      );
    }
  };

  const loadServices = async () => {
    try {
      setLoadingServices(true);
      setServicesError('');

      const token =
        localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      const response = await api.get(
        '/specialists/services',
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      setServices(
        response.data.services || []
      );

    } catch (error: any) {
      console.error(
        'ERROR CARGANDO SERVICIOS:',
        error.response?.data || error
      );

      setServicesError(
        error.response?.data?.message ||
          'No fue posible cargar tus servicios.'
      );

    } finally {
      setLoadingServices(false);
    }
  };

  const loadRequests = async () => {
    try {
      setLoadingRequests(true);
      setRequestsError('');

      const token =
        localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      const response = await api.get(
        '/requests/specialist',
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      console.log(
        'SOLICITUDES ESPECIALISTA:',
        response.data
      );

      setRequests(
        response.data?.requests || []
      );

    } catch (error: any) {
      console.error(
        'ERROR CARGANDO SOLICITUDES:',
        error.response?.data || error
      );

      setRequestsError(
        error.response?.data?.message ||
          'No fue posible cargar tus solicitudes.'
      );

    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadProfile();
    loadServices();
    loadRequests();
  }, []);

  const completionPercentage =
    useMemo(() => {
      if (!profile) {
        return 0;
      }

      let completed = 0;
      const total = 8;

      if (profile.phone?.trim()) {
        completed++;
      }

      if (profile.description?.trim()) {
        completed++;
      }

      if (
        profile.experience !== null &&
        profile.experience !== undefined
      ) {
        completed++;
      }

      if (profile.state?.trim()) {
        completed++;
      }

      if (profile.municipality?.trim()) {
        completed++;
      }

      if (profile.neighborhood?.trim()) {
        completed++;
      }

      if (profile.postalCode?.trim()) {
        completed++;
      }

      if (
        (profile.specialties?.length || 0) >
        0
      ) {
        completed++;
      }

      return Math.round(
        (completed / total) * 100
      );
    }, [profile]);

  const getPriceTypeLabel = (
    priceType: PriceType
  ) => {
    switch (priceType) {
      case 'HOUR':
        return 'Por hora';

      case 'DAY':
        return 'Por día';

      default:
        return 'Por servicio';
    }
  };

  const formatPrice = (
    price: string | number
  ) => {
    return Number(price).toLocaleString(
      'es-MX',
      {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    );
  };

  const openEditService = (
    service: Service
  ) => {
    setOpenMenu(null);

    setEditingService(service);

    setEditForm({
      name: service.name,
      description:
        service.description || '',
      price: String(service.price),
      priceType: service.priceType,
    });
  };

  const closeEditService = () => {
    if (savingEdit) {
      return;
    }

    setEditingService(null);
  };

  const handleSaveEdit = async () => {
    if (!editingService) {
      return;
    }

    if (!editForm.name.trim()) {
      alert(
        'Ingresa el nombre del servicio.'
      );

      return;
    }

    if (
      !editForm.price ||
      Number(editForm.price) <= 0
    ) {
      alert(
        'Ingresa un precio válido.'
      );

      return;
    }

    try {
      setSavingEdit(true);

      const token =
        localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      const response = await api.patch(
        `/specialists/services/${editingService.id}`,
        {
          name: editForm.name.trim(),

          description:
            editForm.description.trim(),

          price: Number(
            editForm.price
          ),

          priceType:
            editForm.priceType,
        },
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const updatedService =
        response.data.service;

      setServices((current) =>
        current.map((service) =>
          service.id ===
          updatedService.id
            ? updatedService
            : service
        )
      );

      setEditingService(null);

    } catch (error: any) {
      console.error(
        'ERROR EDITANDO SERVICIO:',
        error.response?.data || error
      );

      alert(
        error.response?.data?.message ||
          'No fue posible editar el servicio.'
      );

    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleService = async (
    service: Service
  ) => {
    try {
      setOpenMenu(null);

      const token =
        localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      const response = await api.patch(
        `/specialists/services/${service.id}`,
        {
          active: !service.active,
        },
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const updatedService =
        response.data.service;

      setServices((current) =>
        current.map((item) =>
          item.id === updatedService.id
            ? updatedService
            : item
        )
      );

    } catch (error: any) {
      console.error(
        'ERROR CAMBIANDO ESTADO:',
        error.response?.data || error
      );

      alert(
        error.response?.data?.message ||
          'No fue posible cambiar el estado del servicio.'
      );
    }
  };

  const handleDeleteService = async (
    service: Service
  ) => {
    setOpenMenu(null);

    const confirmed = window.confirm(
      `¿Eliminar "${service.name}"? Esta acción no se puede deshacer.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const token =
        localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      await api.delete(
        `/specialists/services/${service.id}`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      setServices((current) =>
        current.filter(
          (item) =>
            item.id !== service.id
        )
      );

    } catch (error: any) {
      console.error(
        'ERROR ELIMINANDO SERVICIO:',
        error.response?.data || error
      );

      alert(
        error.response?.data?.message ||
          'No fue posible eliminar el servicio.'
      );
    }
  };

  const goToServices = () => {
    const element =
      document.getElementById(
        'my-services'
      );

    element?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };


  const goToRequests = () => {
    const element =
      document.getElementById(
        'my-requests'
      );

    element?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="pro-dashboard">

      <header className="pro-header">

        <div className="pro-header-inner">

          <button
            type="button"
            className="pro-brand"
            onClick={() =>
              navigate('/')
            }
          >
            <img
              src={logo}
              alt="FASYN"
            />
          </button>

          <nav className="pro-navigation">

            <button
              type="button"
              className="pro-nav-item active"
            >
              Inicio
            </button>

            <button
              type="button"
              className="pro-nav-item"
              onClick={goToRequests}
            >
              Solicitudes
            </button>

            <button
              type="button"
              className="pro-nav-item"
              onClick={goToServices}
            >
              Servicios
            </button>

  <button
  type="button"
  className="pro-nav-item"
  onClick={() =>
    navigate('/specialist/profile')
  }
>
  Mi perfil
</button>

          </nav>

          <div className="pro-header-actions">

            <div className="pro-availability">
              <span className="availability-dot" />
              Disponible
            </div>

            <button
              type="button"
              className="pro-user-button"
            >
              <span
                style={{
                  overflow: 'hidden',
                }}
              >
                {profilePhotoSrc &&
                !profilePhotoError ? (
                  <img
                    src={profilePhotoSrc}
                    alt={`Foto de ${user.name}`}
                    onError={() => {
                      console.error(
                        'NO SE PUDO CARGAR FOTO DE PERFIL:',
                        profilePhotoSrc
                      );

                      setProfilePhotoError(true);
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'block',
                      objectFit: 'cover',
                      borderRadius: 'inherit',
                    }}
                  />
                ) : (
                  initials
                )}
              </span>

              <div>
                <strong>
                  {firstName}
                </strong>

                <small>
                  Especialista
                </small>
              </div>
            </button>

            <button
              type="button"
              className="pro-logout"
              onClick={handleLogout}
            >
              Salir
            </button>

          </div>

        </div>

      </header>

      <main className="pro-main">

        <section className="pro-hero">

          <div className="pro-hero-content">

            <span className="pro-eyebrow">
              PANEL DEL ESPECIALISTA
            </span>

            <h1>
              Hola, {firstName}.
              <br />

              <span>
                ¿Qué vamos a hacer hoy?
              </span>
            </h1>

            <p>
              Administra tu perfil,
              publica tus servicios y
              mantente al día con las
              solicitudes de tus clientes.
            </p>

          </div>

          <button
            type="button"
            className="pro-create-service"
            onClick={() =>
              navigate(
                '/specialist/services/new'
              )
            }
          >
            <span>
              +
            </span>

            <div>
              <small>
                NUEVO
              </small>

              <strong>
                Publicar servicio
              </strong>
            </div>
          </button>

        </section>

        <section className="pro-overview">

          <article className="pro-profile-card">

            <div className="profile-main">

              <div
                className="profile-avatar"
                style={{
                  overflow: 'hidden',
                }}
              >
                {profilePhotoSrc &&
                !profilePhotoError ? (
                  <img
                    src={profilePhotoSrc}
                    alt={`Foto de ${user.name}`}
                    onError={() => {
                      console.error(
                        'NO SE PUDO CARGAR FOTO DE PERFIL:',
                        profilePhotoSrc
                      );

                      setProfilePhotoError(true);
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'block',
                      objectFit: 'cover',
                      borderRadius: 'inherit',
                    }}
                  />
                ) : (
                  initials
                )}
              </div>

              <div className="profile-identity">

                <span className="profile-label">
                  PERFIL PROFESIONAL
                </span>

                <h2>
                  {user.name}
                </h2>

                <p>
                  Especialista en FASYN
                </p>

              </div>

              <span className="profile-status">
                Activo
              </span>

            </div>

            <div className="profile-specialties">

              <span>
                ESPECIALIDADES
              </span>

              <div>

                {[
                  ...new Set(
                    services.map(
                      (service) =>
                        service.category.name
                    )
                  ),
                ].map(
                  (category) => (
                    <strong key={category}>
                      {category}
                    </strong>
                  )
                )}

                {services.length === 0 && (
                  <strong>
                    Sin servicios publicados
                  </strong>
                )}

              </div>

            </div>

            <div className="profile-progress">

              <div className="profile-progress-header">

                <div>

                  <strong>
                    {completionPercentage === 100
                      ? 'Perfil completo'
                      : 'Completa tu perfil'}
                  </strong>

                  <span>
                    {completionPercentage === 100
                      ? 'Tu información principal está completa'
                      : 'Agrega la información pendiente'}
                  </span>

                </div>

                <strong>
                  {completionPercentage}%
                </strong>

              </div>

              <div className="profile-progress-track">
                <div
                  className="profile-progress-bar"
                  style={{
                    width:
                      `${completionPercentage}%`,
                  }}
                />
              </div>

            </div>

         <button
  type="button"
  className="profile-edit"
  onClick={() =>
    navigate('/specialist/profile')
  }
>
  Editar mi perfil
  <span>→</span>
</button>
          </article>

          <div className="pro-metrics">

            <article className="metric-card">

              <div className="metric-number">
                {requests.filter(
                  (request) =>
                    request.status === 'APPROVED'
                ).length}
              </div>

              <div>
                <strong>
                  Solicitudes
                </strong>

                <span>
                  Nuevas solicitudes
                </span>
              </div>

            </article>

            <article className="metric-card">

              <div className="metric-number">
                {requests.filter(
                  (request) =>
                    request.status === 'COMPLETED'
                ).length}
              </div>

              <div>
                <strong>
                  Trabajos
                </strong>

                <span>
                  Servicios completados
                </span>
              </div>

            </article>

            <article className="metric-card">

              <div className="metric-number">
                —
              </div>

              <div>
                <strong>
                  Calificación
                </strong>

                <span>
                  Aún sin opiniones
                </span>
              </div>

            </article>

            <article className="metric-card metric-highlight">

              <div className="metric-number">
                {services.length}
              </div>

              <div>
                <strong>
                  Servicios
                </strong>

                <span>
                  Servicios publicados
                </span>
              </div>

            </article>

          </div>

        </section>

        <section className="pro-content-grid">

          <article
            id="my-requests"
            className="pro-section-card"
          >

            <div className="pro-section-header">

              <div>

                <span className="pro-section-eyebrow">
                  ACTIVIDAD
                </span>

                <h2>
                  Solicitudes recientes
                </h2>

                <p>
                  Revisa quién está interesado
                  en contratarte.
                </p>

              </div>

              <button
                type="button"
                onClick={loadRequests}
              >
                Ver todas
                <span>
                  →
                </span>
              </button>

            </div>

            {requestsError && (
              <div className="services-dashboard-error">
                {requestsError}
              </div>
            )}

            {loadingRequests ? (

              <div className="requests-empty">

                <strong>
                  Cargando solicitudes...
                </strong>

              </div>

            ) : requests.length === 0 ? (

              <div className="requests-empty">

                <div className="empty-graphic">
                  <div className="empty-line" />
                  <div className="empty-line short" />
                  <div className="empty-line smaller" />
                </div>

                <strong>
                  Todo tranquilo por ahora
                </strong>

                <p>
                  Cuando el administrador apruebe
                  una solicitud de servicio,
                  aparecerá en este espacio.
                </p>

              </div>

            ) : (

              <div className="service-management-grid">

                {requests.map(
                  (request) => (

                    <article
                      key={request.id}
                      className="management-service-card"
                    >

                      <div className="management-service-top">

                        <span className="management-category">
                          {request.service.category.name}
                        </span>

                        <span className="management-status active">
                          <i />

                          {request.status === 'APPROVED'
                            ? 'Aprobada'
                            : request.status === 'IN_PROGRESS'
                              ? 'En proceso'
                              : 'Completada'}
                        </span>

                      </div>

                      <div className="management-service-content">

                        <h3>
                          {request.service.name}
                        </h3>

                        <p>
                          Cliente: {request.client.name}
                        </p>

                        <p>
                          {request.client.email}
                        </p>

                        {request.message && (
                          <p>
                            Mensaje: {request.message}
                          </p>
                        )}

                      </div>

                      <div className="management-service-price">

                        <strong>
                          {formatPrice(
                            request.service.price
                          )}
                        </strong>

                        <span>
                          {getPriceTypeLabel(
                            request.service.priceType
                          )}
                        </span>

                      </div>

                      <div className="management-service-bottom">

                        <span className="management-status active">
                          <i />
                          Solicitud #{request.id}
                        </span>

                      </div>

                    </article>

                  )
                )}

              </div>

            )}

          </article>

          <aside className="quick-actions-card">

            <div className="quick-actions-header">

              <span className="pro-section-eyebrow">
                ACCESO RÁPIDO
              </span>

              <h2>
                ¿Qué necesitas hacer?
              </h2>

            </div>

            <button
              type="button"
              className="quick-action primary"
              onClick={() =>
                navigate(
                  '/specialist/services/new'
                )
              }
            >
              <span className="quick-number">
                01
              </span>

              <div>
                <strong>
                  Publicar servicio
                </strong>

                <small>
                  Agrega un trabajo y establece
                  su precio
                </small>
              </div>

              <span className="quick-arrow">
                →
              </span>
            </button>

    <button
  type="button"
  className="quick-action"
  onClick={() =>
    navigate('/specialist/profile')
  }
>
  <span className="quick-number">
    02
  </span>

  <div>
    <strong>
      Editar mi perfil
    </strong>

    <small>
      Actualiza tu información
      profesional
    </small>
  </div>

  <span className="quick-arrow">
    →
  </span>
</button>
            <button
              type="button"
              className="quick-action"
              onClick={goToRequests}
            >
              <span className="quick-number">
                03
              </span>

              <div>
                <strong>
                  Ver solicitudes
                </strong>

                <small>
                  Administra trabajos de clientes
                </small>
              </div>

              <span className="quick-arrow">
                →
              </span>
            </button>

          </aside>

        </section>

        {/* MIS SERVICIOS */}

        <section
          id="my-services"
          className="pro-services"
        >

          <div className="pro-services-heading">

            <div>

              <span className="pro-section-eyebrow">
                MIS SERVICIOS
              </span>

              <h2>
                Gestiona lo que ofreces
              </h2>

              <p>
                Publica, edita y controla los
                servicios visibles para tus
                clientes.
              </p>

            </div>

            <button
              type="button"
              className="services-new-button"
              onClick={() =>
                navigate(
                  '/specialist/services/new'
                )
              }
            >
              + Publicar servicio
            </button>

          </div>

          {servicesError && (
            <div className="services-dashboard-error">
              {servicesError}
            </div>
          )}

          {loadingServices ? (

            <div className="services-dashboard-loading">
              Cargando servicios...
            </div>

          ) : services.length === 0 ? (

            <div className="services-dashboard-empty">

              <div className="services-empty-symbol">
                +
              </div>

              <h3>
                Publica tu primer servicio
              </h3>

              <p>
                Agrega un servicio para que los
                clientes puedan encontrar lo que
                haces y conocer tu precio.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/specialist/services/new'
                  )
                }
              >
                Crear servicio
              </button>

            </div>

          ) : (

            <div className="service-management-grid">

              {services.map(
                (service) => (

                  <article
                    key={service.id}
                    className={
                      service.active
                        ? 'management-service-card'
                        : 'management-service-card inactive'
                    }
                  >

                    <div className="management-service-top">

                      <span className="management-category">
                        {service.category.name}
                      </span>

                      <div className="management-menu-wrapper">

                        <button
                          type="button"
                          className="management-menu-trigger"
                          aria-label="Opciones del servicio"
                          onClick={() =>
                            setOpenMenu(
                              openMenu ===
                                service.id
                                ? null
                                : service.id
                            )
                          }
                        >
                          •••
                        </button>

                        {openMenu ===
                          service.id && (

                          <div className="management-menu">

                            <button
                              type="button"
                              onClick={() =>
                                openEditService(
                                  service
                                )
                              }
                            >
                              Editar servicio
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleToggleService(
                                  service
                                )
                              }
                            >
                              {service.active
                                ? 'Desactivar'
                                : 'Activar'}
                            </button>

                            <div className="management-menu-divider" />

                            <button
                              type="button"
                              className="danger"
                              onClick={() =>
                                handleDeleteService(
                                  service
                                )
                              }
                            >
                              Eliminar servicio
                            </button>

                          </div>

                        )}

                      </div>

                    </div>

                    <div className="management-service-content">

                      <h3>
                        {service.name}
                      </h3>

                      <p>
                        {service.description ||
                          'Sin descripción.'}
                      </p>

                    </div>

                    <div className="management-service-price">

                      <strong>
                        {formatPrice(
                          service.price
                        )}
                      </strong>

                      <span>
                        {getPriceTypeLabel(
                          service.priceType
                        )}
                      </span>

                    </div>

                    <div className="management-service-bottom">

                      <span
                        className={
                          service.active
                            ? 'management-status active'
                            : 'management-status inactive'
                        }
                      >
                        <i />

                        {service.active
                          ? 'Publicado'
                          : 'Desactivado'}
                      </span>

                      <button
                        type="button"
                        className="management-edit-link"
                        onClick={() =>
                          openEditService(
                            service
                          )
                        }
                      >
                        Editar
                        <span>
                          →
                        </span>
                      </button>

                    </div>

                  </article>

                )
              )}

            </div>

          )}

        </section>

      </main>

      {/* MODAL EDITAR SERVICIO */}

      {editingService && (

        <div className="service-edit-overlay">

          <div className="service-edit-modal">

            <div className="service-edit-header">

              <div>

                <span>
                  EDITAR SERVICIO
                </span>

                <h2>
                  Actualiza tu publicación
                </h2>

              </div>

              <button
                type="button"
                onClick={
                  closeEditService
                }
              >
                ×
              </button>

            </div>

            <div className="service-edit-category">
              {editingService.category.name}
            </div>

            <div className="service-edit-field">

              <label>
                Nombre del servicio
              </label>

              <input
                type="text"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm(
                    (current) => ({
                      ...current,
                      name:
                        e.target.value,
                    })
                  )
                }
              />

            </div>

            <div className="service-edit-field">

              <label>
                Descripción
              </label>

              <textarea
                maxLength={300}
                value={
                  editForm.description
                }
                onChange={(e) =>
                  setEditForm(
                    (current) => ({
                      ...current,
                      description:
                        e.target.value,
                    })
                  )
                }
              />

            </div>

            <div className="service-edit-row">

              <div className="service-edit-field">

                <label>
                  Precsssio
                </label>

                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={editForm.price}
                  onChange={(e) =>
                    setEditForm(
                      (current) => ({
                        ...current,
                        price:
                          e.target.value,
                      })
                    )
                  }
                />

              </div>

              <div className="service-edit-field">

                <label>
                  Tipo de cobro
                </label>

                <select
                  value={
                    editForm.priceType
                  }
                  onChange={(e) =>
                    setEditForm(
                      (current) => ({
                        ...current,
                        priceType:
                          e.target
                            .value as PriceType,
                      })
                    )
                  }
                >

                  <option value="ACTIVITY">
                    Por servicio
                  </option>

                  <option value="HOUR">
                    Por hora
                  </option>

                  <option value="DAY">
                    Por día
                  </option>

                </select>

              </div>

            </div>

            <div className="service-edit-actions">

              <button
                type="button"
                className="service-edit-cancel"
                disabled={savingEdit}
                onClick={
                  closeEditService
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="service-edit-save"
                disabled={savingEdit}
                onClick={
                  handleSaveEdit
                }
              >
                {savingEdit
                  ? 'Guardando...'
                  : 'Guardar cambios'}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
};

export default SpecialistDashboard;