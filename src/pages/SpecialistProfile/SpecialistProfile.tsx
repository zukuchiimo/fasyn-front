import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

import { api } from '../../api/api';
import logo from '../../assets/logo.png';

import './SpecialistProfile.css';

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

const SpecialistProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [specialist, setSpecialist] =
    useState<Specialist | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const loadSpecialist = async () => {
    try {
      setLoading(true);
      setError('');

      const response =
        await api.get('/specialists');

      const specialists:
        Specialist[] =
          response.data?.specialists ||
          [];

      const found =
        specialists.find(
          (item) =>
            String(item.id) ===
            String(id)
        );

      if (!found) {
        setSpecialist(null);

        setError(
          'No encontramos este especialista.'
        );

        return;
      }

      setSpecialist(found);
    } catch (requestError: any) {
      console.error(
        'ERROR CARGANDO PERFIL:',
        requestError.response?.data ||
          requestError
      );

      setError(
        requestError.response?.data
          ?.message ||
          'No fue posible cargar el perfil.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpecialist();
  }, [id]);

  const initials = useMemo(() => {
    if (!specialist?.name) {
      return 'ES';
    }

    return specialist.name
      .trim()
      .split(' ')
      .filter(Boolean)
      .map((word) =>
        word.charAt(0)
      )
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }, [specialist]);

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

    if (!formatted) {
      return 'Especialidad';
    }

    return (
      formatted
        .charAt(0)
        .toLocaleUpperCase('es-MX') +
      formatted.slice(1)
    );
  };

  const getPriceType = (
    type: PriceType
  ) => {
    switch (type) {
      case 'HOUR':
        return 'hora';

      case 'DAY':
        return 'día';

      default:
        return 'servicio';
    }
  };

  const formatPrice = (
    price: number
  ) => {
    return Number(
      price
    ).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const location = useMemo(() => {
    if (!specialist) {
      return '';
    }

    return [
      specialist.neighborhood,
      specialist.municipality,
      specialist.state,
    ]
      .filter(Boolean)
      .join(', ');
  }, [specialist]);

  const lowestService =
    useMemo(() => {
      if (
        !specialist ||
        specialist.services.length ===
          0
      ) {
        return null;
      }

      return [...specialist.services]
        .sort(
          (a, b) =>
            Number(a.price) -
            Number(b.price)
        )[0];
    }, [specialist]);

  if (loading) {
    return (
      <div className="public-profile-loading">

        <div className="public-profile-spinner" />

        <strong>
          Cargando especialista
        </strong>

        <span>
          Estamos preparando su perfil
          profesional.
        </span>

      </div>
    );
  }

  if (!specialist || error) {
    return (
      <div className="public-profile-error-page">

        <div className="public-profile-error-icon">
          !
        </div>

        <h1>
          Especialista no encontrado
        </h1>

        <p>
          {error ||
            'El perfil que buscas no está disponible.'}
        </p>

        <button
          type="button"
          onClick={() =>
            navigate('/specialists')
          }
        >
          Volver a especialistas
        </button>

      </div>
    );
  }

  return (
    <div className="public-profile-page">

      {/* NAVBAR */}

      <header className="public-profile-navbar">

        <div className="public-profile-navbar-inner">

          <button
            type="button"
            className="public-profile-brand"
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
              onClick={() =>
                navigate(
                  '/specialists'
                )
              }
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
              className="public-profile-register"
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

      <main className="public-profile-container">

        {/* BREADCRUMB */}

        <button
          type="button"
          className="public-profile-back"
          onClick={() =>
            navigate('/specialists')
          }
        >
          <span>←</span>

          Volver a especialistas
        </button>

        {/* HERO PERFIL */}

        <section className="public-profile-hero">

          <div className="public-profile-avatar">
            {initials}
          </div>

          <div className="public-profile-identity">

            <div className="public-profile-name-row">

              <div>

                <div className="public-profile-status-row">

                  <span className="public-profile-status">
                    <i />

                    {specialist.available
                      ? 'Disponible'
                      : 'No disponible'}
                  </span>

                  {specialist.profileCompleted && (
                    <span className="public-profile-verified">
                      ✓ Perfil completo
                    </span>
                  )}

                </div>

                <h1>
                  {specialist.name}
                </h1>

                <div className="public-profile-specialties">

                  {specialist.specialties.map(
                    (specialty) => (
                      <span
                        key={
                          specialty.id
                        }
                      >
                        {formatCategoryName(
                          specialty.name
                        )}
                      </span>
                    )
                  )}

                  {specialist.specialties
                    .length === 0 && (
                    <span>
                      Especialista FASYN
                    </span>
                  )}

                </div>

              </div>

              <button
                type="button"
                className="public-profile-favorite"
                title="Agregar a favoritos"
              >
                ♡
              </button>

            </div>

            <div className="public-profile-meta">

              <div>
                <span>
                  EXPERIENCIA
                </span>

                <strong>
                  {specialist.experience
                    ? `${specialist.experience} ${
                        specialist.experience ===
                        1
                          ? 'año'
                          : 'años'
                      }`
                    : 'No especificada'}
                </strong>
              </div>

              <div>
                <span>
                  UBICACIÓN
                </span>

                <strong>
                  {location ||
                    'No especificada'}
                </strong>
              </div>

              <div>
                <span>
                  SERVICIOS
                </span>

                <strong>
                  {
                    specialist.services
                      .length
                  }
                </strong>
              </div>

            </div>

          </div>

        </section>

        {/* CONTENIDO */}

        <div className="public-profile-layout">

          <div className="public-profile-left">

            {/* ACERCA */}

            <section className="public-profile-section">

              <div className="public-profile-section-heading">

                <span>
                  01
                </span>

                <div>
                  <small>
                    ss
                  </small>

                  <h2>
                    Acerca de mí
                  </h2>
                </div>

              </div>

              <p className="public-profile-description">
                {specialist.description ||
                  'Este especialista aún no ha agregado una descripción profesional.'}
              </p>

              {specialist.specialties.length >
                0 && (
                <div className="public-profile-tags">

                  {specialist.specialties.map(
                    (specialty) => (
                      <span
                        key={
                          specialty.id
                        }
                      >
                        {formatCategoryName(
                          specialty.name
                        )}
                      </span>
                    )
                  )}

                </div>
              )}

            </section>

            {/* SERVICIOS */}

            <section className="public-profile-section">

              <div className="public-profile-section-heading services">

                <span>
                  02
                </span>

                <div>
                  <small>
                    LO QUE OFRECE
                  </small>

                  <h2>
                    Servicios
                  </h2>

                  <p>
                    Selecciona el trabajo
                    que necesitas.
                  </p>
                </div>

              </div>

              {specialist.services.length >
              0 ? (

                <div className="public-services-list">

                  {specialist.services.map(
                    (service) => (
                      <article
                        className="public-service-card"
                        key={
                          service.id
                        }
                      >

                        <div className="public-service-content">

                          <span className="public-service-category">
                            {formatCategoryName(
                              service
                                .category
                                .name
                            )}
                          </span>

                          <h3>
                            {
                              service.name
                            }
                          </h3>

                          <p>
                            {service.description ||
                              'Servicio profesional disponible.'}
                          </p>

                        </div>

                        <div className="public-service-action">

                          <small>
                            Desde
                          </small>

                          <strong>
                            {formatPrice(
                              service.price
                            )}
                          </strong>

                          <span>
                            por{' '}
                            {getPriceType(
                              service.priceType
                            )}
                          </span>

                          <button
                            type="button"
                          >
                            Solicitar
                            <b>→</b>
                          </button>

                        </div>

                      </article>
                    )
                  )}

                </div>

              ) : (

                <div className="public-services-empty">

                  <div>
                    +
                  </div>

                  <h3>
                    Sin servicios publicados
                  </h3>

                  <p>
                    Este especialista aún no
                    tiene servicios disponibles.
                  </p>

                </div>

              )}

            </section>

            {/* OPINIONES */}

            <section className="public-profile-section">

              <div className="public-profile-section-heading">

                <span>
                  03
                </span>

                <div>
                  <small>
                    REPUTACIÓN
                  </small>

                  <h2>
                    Opiniones
                  </h2>

                  <p>
                    Las valoraciones aparecerán
                    después de servicios
                    completados.
                  </p>
                </div>

              </div>

              <div className="public-reviews-empty">

                <div className="public-reviews-symbol">
                  ★
                </div>

                <div>
                  <h3>
                    Aún sin opiniones
                  </h3>

                  <p>
                    Cuando clientes completen
                    servicios con este
                    especialista podrán dejar
                    una valoración.
                  </p>
                </div>

              </div>

            </section>

          </div>

          {/* CONTRATAR */}

          <aside className="public-hire-card">

            <span className="public-hire-eyebrow">
              CONTRATAR ESPECIALISTA
            </span>

            <h2>
              ¿Necesitas alguno de sus servicios?
            </h2>

            <p>
              Revisa sus servicios y envía
              una solicitud cuando encuentres
              el trabajo que necesitas.
            </p>

            {lowestService && (
              <div className="public-hire-price">

                <span>
                  Servicios desde
                </span>

                <strong>
                  {formatPrice(
                    lowestService.price
                  )}
                </strong>

                <small>
                  por{' '}
                  {getPriceType(
                    lowestService.priceType
                  )}
                </small>

              </div>
            )}

            <div className="public-hire-divider" />

            <div className="public-hire-feature">

              <span>
                ✓
              </span>

              <div>
                <strong>
                  Perfil en FASYN
                </strong>

                <small>
                  Información profesional
                  registrada
                </small>
              </div>

            </div>

            <div className="public-hire-feature">

              <span>
                ✓
              </span>

              <div>
                <strong>
                  Servicios publicados
                </strong>

                <small>
                  Precios y modalidades
                  definidos por el especialista
                </small>
              </div>

            </div>

            <div className="public-hire-feature">

              <span>
                ✓
              </span>

              <div>
                <strong>
                  Solicitud sin cobro
                </strong>

                <small>
                  Enviar una solicitud no
                  genera un pago inmediato
                </small>
              </div>

            </div>

            <button
              type="button"
              className="public-hire-button"
              disabled={
                specialist.services
                  .length === 0
              }
              onClick={() => {
                const servicesElement =
                  document.getElementById(
                    'specialist-services'
                  );

                servicesElement?.scrollIntoView({
                  behavior: 'smooth',
                });
              }}
            >
              Ver servicios disponibles
              <span>
                →
              </span>
            </button>

            <small className="public-hire-disclaimer">
              Podrás revisar los detalles antes
              de confirmar cualquier solicitud.
            </small>

          </aside>

        </div>

      </main>

    </div>
  );
};

export default SpecialistProfile;