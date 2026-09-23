import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import logo from '../../../assets/logo.png';
import { api } from '../../../api/api';

import '../../client/ClientProfile.css';
import './MyRequests.css';

type Review = {
  id: number;
  rating: number;
  comment?: string | null;
  createdAt: string;
};

type SpecialistUser = {
  id: number;
  name: string;
  profilePhotoUrl?: string | null;
};

type Specialist = {
  id: number;
  user: SpecialistUser;
};

type Category = {
  id: number;
  name: string;
};

type Service = {
  id: number;
  name: string;
  description?: string | null;
  price: string;

  priceType:
    | 'HOUR'
    | 'DAY'
    | 'ACTIVITY';

  category: Category;

  specialist: Specialist;
};

type Address = {
  id: number;
  label: string;

  state: string;
  municipality: string;
  neighborhood: string;
  postalCode: string;

  street: string;
  exteriorNumber: string;
  interiorNumber?: string | null;
};

type ServiceRequest = {
  id: number;

  status:
    | 'PENDING_ADMIN'
    | 'APPROVED'
    | 'REJECTED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED';

  message?: string | null;

  createdAt: string;
  updatedAt: string;

  addressLabel?: string | null;
  addressState?: string | null;
  addressMunicipality?: string | null;
  addressNeighborhood?: string | null;
  addressPostalCode?: string | null;
  addressStreet?: string | null;
  addressExteriorNumber?: string | null;
  addressInteriorNumber?: string | null;

  service: Service;

  address?: Address | null;

  review?: Review | null;
};

type ClientProfile = {
  id: number;
  name: string;
  email: string;
  profilePhotoUrl?: string | null;
};

const MyRequests = () => {
  const navigate =
    useNavigate();

  const token =
    localStorage.getItem('token');

  const [requests, setRequests] =
    useState<ServiceRequest[]>([]);

  const [profile, setProfile] =
    useState<ClientProfile | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [
    cancellingId,
    setCancellingId,
  ] = useState<number | null>(
    null
  );

  /*
    MODAL DE RESEÑA
  */
  const [
    reviewRequest,
    setReviewRequest,
  ] = useState<ServiceRequest | null>(
    null
  );

  const [rating, setRating] =
    useState(0);

  const [comment, setComment] =
    useState('');

  const [
    savingReview,
    setSavingReview,
  ] = useState(false);

  /*
    URL FOTO
  */
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

  /*
    INICIALES DEL CLIENTE
  */
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
          .map(
            (word) =>
              word.charAt(0)
          )
          .join('')
          .substring(0, 2)
          .toUpperCase() ||
        'CL'
      );

    }, [profile]);

  /*
    CARGAR SOLICITUDES
  */
  const loadRequests =
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

        setRequests(
          requestsResponse
            .data
            ?.requests ||
            []
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
          'GET MY REQUESTS ERROR:',
          requestError
        );

        if (
          requestError
            ?.response
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

        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
          'No fue posible cargar tus solicitudes.'
        );

      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadRequests();
  }, []);

  /*
    CANCELAR SOLICITUD
  */
  const cancelRequest =
    async (
      requestId: number
    ) => {

      const confirmed =
        window.confirm(
          '¿Estás seguro de cancelar esta solicitud?'
        );

      if (!confirmed) {
        return;
      }

      try {
        setCancellingId(
          requestId
        );

        await api.patch(
          `/requests/${requestId}/cancel`,
          {},
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        await loadRequests();

      } catch (
        requestError: any
      ) {
        alert(
          requestError
            ?.response
            ?.data
            ?.message ||
          'No fue posible cancelar la solicitud.'
        );

      } finally {
        setCancellingId(
          null
        );
      }
    };

  /*
    ABRIR RESEÑA
  */
  const openReview = (
    request:
      ServiceRequest
  ) => {
    setReviewRequest(
      request
    );

    setRating(0);
    setComment('');
  };

  const closeReview = () => {
    if (savingReview) {
      return;
    }

    setReviewRequest(
      null
    );

    setRating(0);
    setComment('');
  };

  /*
    GUARDAR RESEÑA
  */
  const submitReview =
    async () => {

      if (
        !reviewRequest ||
        !token
      ) {
        return;
      }

      if (
        rating < 1 ||
        rating > 5
      ) {
        alert(
          'Selecciona una calificación.'
        );

        return;
      }

      try {
        setSavingReview(
          true
        );

        await api.post(
          `/requests/${reviewRequest.id}/review`,
          {
            rating,
            comment:
              comment
                .trim() ||
              null,
          },
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        setReviewRequest(
          null
        );

        setRating(0);
        setComment('');

        await loadRequests();

      } catch (
        requestError: any
      ) {
        alert(
          requestError
            ?.response
            ?.data
            ?.message ||
          'No fue posible guardar la reseña.'
        );

      } finally {
        setSavingReview(
          false
        );
      }
    };

  /*
    CERRAR SESIÓN
  */
  const handleLogout =
    () => {

      localStorage.removeItem(
        'token'
      );

      localStorage.removeItem(
        'user'
      );

      navigate('/login');
    };

  /*
    ESTADO
  */
  const getStatusInfo = (
    status:
      ServiceRequest['status']
  ) => {

    switch (status) {

      case 'PENDING_ADMIN':
        return {
          label:
            'Pendiente de aprobación',
          className:
            'request-status pending',
        };

      case 'APPROVED':
        return {
          label:
            'Aprobada',
          className:
            'request-status approved',
        };

      case 'IN_PROGRESS':
        return {
          label:
            'Trabajo en proceso',
          className:
            'request-status progress',
        };

      case 'COMPLETED':
        return {
          label:
            'Servicio terminado',
          className:
            'request-status completed',
        };

      case 'REJECTED':
        return {
          label:
            'Rechazada',
          className:
            'request-status rejected',
        };

      case 'CANCELLED':
        return {
          label:
            'Cancelada',
          className:
            'request-status cancelled',
        };

      default:
        return {
          label: status,
          className:
            'request-status',
        };
    }
  };

  /*
    FECHA
  */
  const formatDate = (
    date: string
  ) => {

    return new Intl
      .DateTimeFormat(
        'es-MX',
        {
          day:
            '2-digit',
          month:
            'long',
          year:
            'numeric',
          hour:
            '2-digit',
          minute:
            '2-digit',
        }
      )
      .format(
        new Date(date)
      );
  };

  /*
    PRECIO
  */
  const getPriceLabel = (
    request:
      ServiceRequest
  ) => {

    const price =
      Number(
        request
          .service
          .price
      );

    const formatted =
      price.toLocaleString(
        'es-MX',
        {
          style:
            'currency',
          currency:
            'MXN',
        }
      );

    const priceType =
      request
        .service
        .priceType;

    if (
      priceType === 'HOUR'
    ) {
      return `${formatted} / hora`;
    }

    if (
      priceType === 'DAY'
    ) {
      return `${formatted} / día`;
    }

    return formatted;
  };

  /*
    DIRECCIÓN
  */
  const getAddress = (
    request:
      ServiceRequest
  ) => {

    const street =
      request
        .addressStreet ||
      request
        .address
        ?.street;

    const exterior =
      request
        .addressExteriorNumber ||
      request
        .address
        ?.exteriorNumber;

    const interior =
      request
        .addressInteriorNumber ||
      request
        .address
        ?.interiorNumber;

    const neighborhood =
      request
        .addressNeighborhood ||
      request
        .address
        ?.neighborhood;

    const municipality =
      request
        .addressMunicipality ||
      request
        .address
        ?.municipality;

    const state =
      request
        .addressState ||
      request
        .address
        ?.state;

    return [
      `${street || ''} ${exterior || ''}`.trim(),

      interior
        ? `Interior ${interior}`
        : null,

      neighborhood,
      municipality,
      state,
    ]
      .filter(Boolean)
      .join(', ');
  };

  if (loading) {
    return (
      <div className="client-profile-loading">

        <div className="client-profile-spinner" />

        <strong>
          Cargando tus solicitudes
        </strong>

        <span>
          Estamos consultando tus servicios.
        </span>

      </div>
    );
  }

  return (
    <div className="client-dashboard">

      {/* =====================================
          SIDEBAR
      ====================================== */}

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
              ?.profilePhotoUrl
              ? (
                <img
                  src={
                    resolveStoredFileUrl(
                      profile
                        .profilePhotoUrl
                    )
                  }
                  alt={
                    profile
                      .name
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
              )
              : initials
            }
          </div>

          <div className="client-user-info">

            <strong>
              {
                profile?.name ||
                'Cliente'
              }
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
              navigate(
                '/client'
              )
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
            className="active"
          >
            <span>◉</span>
            Mis solicitudes
          </button>

          <button
            type="button"
            onClick={() =>
              alert(
                'Favoritos estará disponible próximamente.'
              )
            }
          >
            <span>♡</span>
            Favoritos
          </button>

          <button
            type="button"
            onClick={() =>
              alert(
                'Historial estará disponible próximamente.'
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

      {/* =====================================
          CONTENIDO
      ====================================== */}

      <main className="client-main">

        <header className="client-header">

          <div>

            <span className="client-eyebrow">
              PANEL DEL CLIENTE
            </span>

            <h1>
              Mis solicitudes
            </h1>

            <p>
              Consulta los servicios que has solicitado,
              revisa su avance y califica al especialista
              cuando termine el trabajo.
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

        {/* =====================================
            RESUMEN
        ====================================== */}

        <section className="requests-summary">

          <div className="request-summary-card">
            <span>
              TOTAL
            </span>

            <strong>
              {requests.length}
            </strong>

            <small>
              Solicitudes realizadas
            </small>
          </div>

          <div className="request-summary-card">
            <span>
              ACTIVAS
            </span>

            <strong>
              {
                requests.filter(
                  (item) =>
                    item.status ===
                      'APPROVED' ||
                    item.status ===
                      'IN_PROGRESS'
                ).length
              }
            </strong>

            <small>
              Servicios activos
            </small>
          </div>

          <div className="request-summary-card">
            <span>
              TERMINADAS
            </span>

            <strong>
              {
                requests.filter(
                  (item) =>
                    item.status ===
                    'COMPLETED'
                ).length
              }
            </strong>

            <small>
              Trabajos realizados
            </small>
          </div>

        </section>

        {/* =====================================
            SIN SOLICITUDES
        ====================================== */}

        {requests.length === 0 ? (

          <section className="requests-empty-card">

            <div className="requests-empty-icon">
              ◉
            </div>

            <h2>
              Aún no has solicitado ningún servicio
            </h2>

            <p>
              Encuentra especialistas cerca de ti y
              solicita el servicio que necesitas.
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

          /*
            LISTADO
          */

          <section className="requests-container">

            <div className="requests-section-header">

              <div>

                <span className="client-section-eyebrow">
                  SERVICIOS
                </span>

                <h2>
                  Tus solicitudes
                </h2>

                <p>
                  Aquí puedes consultar todo lo que has solicitado.
                </p>

              </div>

            </div>

            <div className="requests-list">

              {requests.map(
                (request) => {

                  const status =
                    getStatusInfo(
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

                      {/* CABECERA */}

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
                          {status.label}
                        </span>

                      </div>

                      {/* INFORMACIÓN */}

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
                            {
                              getPriceLabel(
                                request
                              )
                            }
                          </strong>

                        </div>

                      </div>

                      {/* ESPECIALISTA */}

                      <div className="request-specialist-card">

                        <div className="request-specialist-avatar">

                          {specialist
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
                              specialist
                                .name
                                .charAt(0)
                                .toUpperCase()
                            )
                          }

                        </div>

                        <div className="request-specialist-info">

                          <span>
                            ESPECIALISTA
                          </span>

                          <strong>
                            {
                              specialist
                                .name
                            }
                          </strong>

                          <small>
                            Profesional encargado de tu servicio
                          </small>

                        </div>

                      </div>

                      {/* DIRECCIÓN */}

                      <div className="request-address">

                        <span className="request-detail-title">
                          UBICACIÓN DEL SERVICIO
                        </span>

                        <p>
                          {getAddress(
                            request
                          )}
                        </p>

                      </div>

                      {/* MENSAJE */}

                      {request.message && (
                        <div className="request-message-box">

                          <span className="request-detail-title">
                            INDICACIONES
                          </span>

                          <p>
                            {
                              request
                                .message
                            }
                          </p>

                        </div>
                      )}

                      {/* RESEÑA EXISTENTE */}

                      {request.review && (
                        <div className="existing-review">

                          <div>

                            <span className="request-detail-title">
                              TU RESEÑA PARA {
                                specialist.name
                              }
                            </span>

                            <div className="existing-review-stars">

                              {[1, 2, 3, 4, 5]
                                .map(
                                  (star) => (
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
                                “{
                                  request
                                    .review
                                    .comment
                                }”
                              </p>
                            )}

                          </div>

                          <span className="review-done">
                            Reseña enviada
                          </span>

                        </div>
                      )}

                      {/* ACCIONES */}

                      <div className="request-card-actions">

                        {request.status ===
                          'PENDING_ADMIN' && (
                          <button
                            type="button"
                            className="cancel-request-button"
                            disabled={
                              cancellingId ===
                              request.id
                            }
                            onClick={() =>
                              cancelRequest(
                                request.id
                              )
                            }
                          >
                            {cancellingId ===
                            request.id
                              ? 'Cancelando...'
                              : 'Cancelar solicitud'}
                          </button>
                        )}

                        {request.status ===
                          'COMPLETED' &&
                          !request.review && (

                          <button
                            type="button"
                            className="review-request-button"
                            onClick={() =>
                              openReview(
                                request
                              )
                            }
                          >
                            ★ Calificar a {
                              specialist.name
                            }
                          </button>
                        )}

                      </div>

                    </article>
                  );
                }
              )}

            </div>

          </section>
        )}

      </main>

      {/* =====================================
          MODAL RESEÑA
      ====================================== */}

      {reviewRequest && (

        <div className="review-modal-overlay">

          <div className="review-modal">

            <button
              type="button"
              className="review-modal-close"
              onClick={
                closeReview
              }
            >
              ×
            </button>

            <span className="client-section-eyebrow">
              TU EXPERIENCIA
            </span>

            <h2>
              Califica a {
                reviewRequest
                  .service
                  .specialist
                  .user
                  .name
              }
            </h2>

            <p className="review-modal-description">
              Cuéntanos cómo fue el servicio de{' '}
              <strong>
                {
                  reviewRequest
                    .service
                    .name
                }
              </strong>.
            </p>

            <div className="review-specialist-preview">

              <div className="review-avatar">

                {
                  reviewRequest
                    .service
                    .specialist
                    .user
                    .name
                    .charAt(0)
                    .toUpperCase()
                }

              </div>

              <div>

                <strong>
                  {
                    reviewRequest
                      .service
                      .specialist
                      .user
                      .name
                  }
                </strong>

                <span>
                  Especialista
                </span>

              </div>

            </div>

            <div className="review-rating">

              <span>
                ¿Cómo calificarías su trabajo?
              </span>

              <div className="review-stars-picker">

                {[1, 2, 3, 4, 5]
                  .map(
                    (star) => (
                      <button
                        key={
                          star
                        }
                        type="button"
                        className={
                          star <=
                          rating
                            ? 'selected'
                            : ''
                        }
                        onClick={() =>
                          setRating(
                            star
                          )
                        }
                      >
                        ★
                      </button>
                    )
                  )}

              </div>

              <strong>
                {
                  rating === 1
                    ? 'Malo'
                    : rating === 2
                      ? 'Regular'
                      : rating === 3
                        ? 'Bueno'
                        : rating === 4
                          ? 'Muy bueno'
                          : rating === 5
                            ? 'Excelente'
                            : 'Selecciona una calificación'
                }
              </strong>

            </div>

            <label className="review-comment">

              <span>
                Comentario
              </span>

              <textarea
                maxLength={
                  500
                }
                value={
                  comment
                }
                onChange={(
                  event
                ) =>
                  setComment(
                    event
                      .target
                      .value
                  )
                }
                placeholder="¿Cómo fue tu experiencia con el especialista?"
              />

              <small>
                {comment.length}/500
              </small>

            </label>

            <div className="review-modal-actions">

              <button
                type="button"
                className="review-cancel"
                disabled={
                  savingReview
                }
                onClick={
                  closeReview
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="review-submit"
                disabled={
                  savingReview ||
                  rating === 0
                }
                onClick={
                  submitReview
                }
              >
                {savingReview
                  ? 'Publicando...'
                  : 'Publicar reseña'}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default MyRequests;