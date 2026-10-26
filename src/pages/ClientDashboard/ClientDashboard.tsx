import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/fasyn_logo_blanco_transparente_blanco.png';
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
  // Estos campos deben venir de /clients/profile cuando el backend los exponga.
  whatsapp?: string | null;
  hasWhatsApp?: boolean | null;
  whatsappNumber?: string | null;
  address?: string | null | ClientAddress;
  addresses?: ClientAddress[];
  emailVerified?: boolean;
  // Avisos únicamente si el backend ya los incluye en la respuesta.
  adminMessage?: string | null;
  adminMessages?: Array<{ id?: number | string; message?: string; content?: string; read?: boolean }>;
};
type ClientAddress = {
  id?: number;
  street?: string | null;
  exteriorNumber?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  colony?: string | null;
  zipCode?: string | null;
  postalCode?: string | null;
  municipality?: string | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  isServiceLocation?: boolean;
  isDefault?: boolean;
};
const hasValue = (value: unknown) =>
  typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined;
const ClientDashboard = () => {
  const navigate = useNavigate();
  const [clientProfile, setClientProfile] =
    useState<ClientProfile | null>(
      null
    );
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const [clientAddresses, setClientAddresses] = useState<ClientAddress[]>([]);
  const [addressesLoaded, setAddressesLoaded] = useState(false);
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
  // Consulta información real cada vez que el cliente regresa al Dashboard.
  // Así se refleja la preferencia de WhatsApp recién guardada en Mi perfil.
  useEffect(() => {
    if (!token) {
      setClientProfile(null);
      setProfileLoading(false);
      return;
    }

    let active = true;
    const loadClientProfile = async () => {
      setProfileLoading(true);
      setProfileError(false);
      try {
        const response = await api.get('/clients/profile', {
          headers: { Authorization: `Bearer ${token}` },
          params: { _refresh: Date.now() },
        });
        if (!active) return;
        setClientProfile(response.data?.profile ?? null);
      } catch (error: any) {
        if (!active) return;
        setProfileError(true);
        console.error('ERROR CARGANDO PERFIL CLIENTE:', error.response?.data || error);
      } finally {
        if (active) setProfileLoading(false);
      }
    };

    void loadClientProfile();
    const refreshOnFocus = () => { void loadClientProfile(); };
    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') void loadClientProfile();
    };
    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnVisible);

    return () => {
      active = false;
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnVisible);
    };
  }, [token]);
  // Complementa los datos generales con las direcciones reales del cliente.
  // No se inventa información cuando la API aún no la proporciona.
  useEffect(() => {
    if (!token) return;
    let active = true;
    api.get('/addresses', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (!active) return;
        const data = response.data;
        const list = Array.isArray(data) ? data
          : Array.isArray(data?.addresses) ? data.addresses
          : Array.isArray(data?.data) ? data.data : [];
        setClientAddresses(list);
        setAddressesLoaded(true);
      })
      .catch((error) => {
        if (!active) return;
        console.error('ERROR CARGANDO DIRECCIONES:', error);
        setAddressesLoaded(false);
      });
    return () => { active = false; };
  }, [token]);
  const pendingGeneralData = useMemo(() => {
    if (!clientProfile) return [] as string[];
    const missing: string[] = [];
    const name = (clientProfile.name || '').trim();
    const emailAlias = (clientProfile.email || '').split('@')[0];
    if (!name || name.toLowerCase() === emailAlias.toLowerCase()) missing.push('Nombre completo');
    if (!hasValue(clientProfile.email)) missing.push('Correo electrónico');
    if (clientProfile.emailVerified === false) missing.push('Verificar correo electrónico');
    if (!hasValue(clientProfile.phone)) missing.push('Teléfono');
    // false significa que respondió «No» y es un dato completo.
    // null/undefined significa que aún no ha indicado su preferencia.
    if (clientProfile.hasWhatsApp !== true && clientProfile.hasWhatsApp !== false) {
      missing.push('Indicar si tienes WhatsApp');
    } else if (
      clientProfile.hasWhatsApp === true &&
      !hasValue(clientProfile.whatsappNumber) &&
      !hasValue(clientProfile.whatsapp)
    ) {
      missing.push('Número de WhatsApp');
    }
    const embedded = clientProfile.address;
    const addresses = [
      ...clientAddresses,
      ...(clientProfile.addresses || []),
      ...(embedded && typeof embedded === 'object' ? [embedded] : []),
    ];
    const hasAddress = addresses.some((a) =>
      hasValue(a.street) && hasValue(a.neighborhood || a.colony) &&
      hasValue(a.zipCode || a.postalCode) && hasValue(a.municipality || a.city) && hasValue(a.state)
    ) || (typeof embedded === 'string' && embedded.trim().length > 0);
    if (addressesLoaded && !hasAddress) missing.push('Dirección completa');
    if (!addressesLoaded && !hasAddress) missing.push('Dirección (pendiente de consultar)');
    // Una dirección registrada con coordenadas ya tiene un punto de servicio.
    const serviceLocation = addresses.some((a) =>
      Number.isFinite(Number(a.latitude ?? a.lat)) &&
      Number.isFinite(Number(a.longitude ?? a.lng)) &&
      (a.latitude ?? a.lat) != null && (a.longitude ?? a.lng) != null
    );
    if (!serviceLocation) missing.push('Punto en el mapa donde se realizará el servicio');
    return missing;
  }, [clientProfile, clientAddresses, addressesLoaded]);
  const adminNotices = (clientProfile?.adminMessages || [])
    .filter((item) => item.read !== true)
    .map((item) => item.message || item.content || '')
    .filter(Boolean);
  if (clientProfile?.adminMessage) adminNotices.unshift(clientProfile.adminMessage);
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
            onClick={() =>
              navigate(
                '/client/history'
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
        {/* ESTADO DE DATOS GENERALES */}
        {!profileLoading && !profileError && clientProfile && pendingGeneralData.length > 0 && (
          <section className="client-panel" style={{ marginBottom: 24, padding: 24, borderLeft: '4px solid #e0a324' }} aria-label="Datos generales pendientes">
            <span className="client-section-eyebrow">TU CUENTA FASYN</span>
            <h2 style={{ margin: '8px 0' }}>Completa tus datos generales</h2>
            <p>Antes de solicitar un servicio, completa tu información de contacto y señala dónde se realizará el trabajo.</p>
            <p><strong>{pendingGeneralData.length} dato(s) por completar:</strong></p>
            <ul style={{ paddingLeft: 22, marginTop: 8 }}>
              {pendingGeneralData.map((field) => <li key={field}>{field}</li>)}
            </ul>
            <button type="button" className="find-specialist-button" onClick={() => navigate('/client/profile')}>
              Completar mi perfil
            </button>
          </section>
        )}
        {!profileLoading && !profileError && clientProfile && pendingGeneralData.length === 0 && (
          <section className="client-panel" style={{ marginBottom: 24, padding: 18 }}>
            <strong>✓ Tus datos generales están completos.</strong>
          </section>
        )}
        {profileError && (
          <section className="client-panel" style={{ marginBottom: 24, padding: 18 }} role="alert">
            No pudimos comprobar tus datos generales. Actualiza la página para intentarlo de nuevo.
          </section>
        )}
        {/* Los avisos solo aparecen cuando /clients/profile los devuelve; falta conectar un endpoint dedicado si no llegan ahí. */}
        {adminNotices.length > 0 && (
          <section className="client-panel" style={{ marginBottom: 24, padding: 24 }} aria-label="Avisos del administrador">
            <span className="client-section-eyebrow">AVISOS DE FASYN</span>
            <h2>Mensajes del administrador</h2>
            {adminNotices.map((notice, index) => <p key={`${index}-${notice}`}>{notice}</p>)}
          </section>
        )}
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
