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

import './SpecialistRequestDetail.css';

/* =========================================
   TIPOS
========================================= */

type PriceType =
  | 'HOUR'
  | 'DAY'
  | 'ACTIVITY';

type RequestStatus =
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'COMPLETED';

type ClientAddress = {
  id: number;

  label?: string | null;

  state?: string | null;
  municipality?: string | null;
  neighborhood?: string | null;
  postalCode?: string | null;

  street?: string | null;
  exteriorNumber?: string | null;
  interiorNumber?: string | null;

  references?: string | null;

  latitude?: number | string | null;
  longitude?: number | string | null;
};

type ClientData = {
  id: number;
  name: string;
  email: string;

  phone?: string | null;

  profilePhotoUrl?: string | null;
};

type Category = {
  id: number;
  name: string;
};

type Service = {
  id: number;
  name: string;

  description?: string | null;

  price: string | number;

  priceType: PriceType;

  category: Category;
};

type SpecialistRequestDetailData = {
  id: number;

  status: RequestStatus;

  message?: string | null;

  createdAt: string;
  updatedAt: string;

  reviewedAt?: string | null;

  /*
    SNAPSHOT DE DIRECCIÓN
  */

  addressLabel?: string | null;

  addressState?: string | null;

  addressMunicipality?: string | null;

  addressNeighborhood?: string | null;

  addressPostalCode?: string | null;

  addressStreet?: string | null;

  addressExteriorNumber?: string | null;

  addressInteriorNumber?: string | null;

  addressReferences?: string | null;

  /*
    Si posteriormente agregas estas
    columnas al ServiceRequest,
    también las soportamos.
  */

  addressLatitude?:
    | number
    | string
    | null;

  addressLongitude?:
    | number
    | string
    | null;

  /*
    RELACIONES
  */

  client: ClientData;

  service: Service;

  address?:
    | ClientAddress
    | null;
};

/* =========================================
   COMPONENTE
========================================= */

const SpecialistRequestDetail =
  () => {

    const navigate =
      useNavigate();

    const { id } =
      useParams();

    const [
      request,
      setRequest,
    ] =
      useState<
        SpecialistRequestDetailData | null
      >(null);

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

    /* =====================================
       URL DE ARCHIVOS
    ===================================== */

    const resolveStoredFileUrl =
      (
        fileUrl?:
          | string
          | null
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

        return `${apiOrigin}${normalizedPath}`;
      };

    /* =====================================
       CARGAR SOLICITUD
    ===================================== */

    const loadRequest =
      async () => {

        const token =
          localStorage.getItem(
            'token'
          );

        if (!token) {
          navigate(
            '/login'
          );

          return;
        }

        if (!id) {
          setError(
            'Solicitud inválida.'
          );

          setLoading(
            false
          );

          return;
        }

        try {

          setLoading(
            true
          );

          setError('');

          const response =
            await api.get(
              `/requests/specialist/${id}`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          console.log(
            'DETALLE SOLICITUD:',
            response.data
          );

          const requestData =
            response.data
              ?.request ||
            null;

          if (
            !requestData
          ) {
            setError(
              'No encontramos la solicitud.'
            );

            return;
          }

          setRequest(
            requestData
          );

        } catch (
          requestError: any
        ) {

          console.error(
            'ERROR CARGANDO DETALLE SOLICITUD:',
            requestError
              ?.response
              ?.data ||
            requestError
          );

          if (
            requestError
              ?.response
              ?.status ===
            401
          ) {

            localStorage.removeItem(
              'token'
            );

            localStorage.removeItem(
              'user'
            );

            navigate(
              '/login'
            );

            return;
          }

          if (
            requestError
              ?.response
              ?.status ===
            403
          ) {

            setError(
              'No tienes permiso para consultar esta solicitud.'
            );

            return;
          }

          if (
            requestError
              ?.response
              ?.status ===
            404
          ) {

            setError(
              'La solicitud no existe o no pertenece a tu cuenta.'
            );

            return;
          }

          setError(
            requestError
              ?.response
              ?.data
              ?.message ||
            'No fue posible cargar la solicitud.'
          );

        } finally {

          setLoading(
            false
          );
        }
      };

    useEffect(
      () => {

        loadRequest();

      },
      [id]
    );

    /* =====================================
       PRECIO
    ===================================== */

    const formatPrice =
      (
        price:
          | string
          | number
      ) => {

        return Number(
          price
        ).toLocaleString(
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
        );
      };

    const getPriceTypeLabel =
      (
        priceType:
          PriceType
      ) => {

        switch (
          priceType
        ) {

          case 'HOUR':
            return 'Por hora';

          case 'DAY':
            return 'Por día';

          case 'ACTIVITY':
          default:
            return 'Por servicio';
        }
      };

    /* =====================================
       ESTADO
    ===================================== */

    const getStatusInfo =
      (
        status:
          RequestStatus
      ) => {

        switch (
          status
        ) {

          case 'APPROVED':

            return {
              label:
                'Aprobada',

              description:
                'La solicitud fue aprobada y puedes contactar al cliente.',

              className:
                'approved',
            };

          case 'IN_PROGRESS':

            return {
              label:
                'En proceso',

              description:
                'El servicio se encuentra actualmente en proceso.',

              className:
                'progress',
            };

          case 'COMPLETED':

            return {
              label:
                'Completada',

              description:
                'El servicio fue marcado como terminado.',

              className:
                'completed',
            };

          default:

            return {
              label:
                status,

              description:
                '',

              className:
                '',
            };
        }
      };

    /* =====================================
       FECHA
    ===================================== */

    const formatDate =
      (
        value?:
          | string
          | null
      ) => {

        if (!value) {
          return 'No disponible';
        }

        const date =
          new Date(
            value
          );

        if (
          Number.isNaN(
            date.getTime()
          )
        ) {
          return value;
        }

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
            date
          );
      };

    /*
      FECHA COMPACTA PARA EL RESUMEN
      Ejemplo:
      22 sep 2026 · 10:31 p. m.
    */
    const formatCompactDate =
      (
        value?:
          | string
          | null
      ) => {

        if (!value) {
          return 'No disponible';
        }

        const date =
          new Date(
            value
          );

        if (
          Number.isNaN(
            date.getTime()
          )
        ) {
          return value;
        }

        const formatted =
          new Intl
            .DateTimeFormat(
              'es-MX',
              {
                day:
                  '2-digit',

                month:
                  'short',

                year:
                  'numeric',

                hour:
                  '2-digit',

                minute:
                  '2-digit',
              }
            )
            .format(
              date
            );

        return formatted
          .replace(
            ',',
            ' ·'
          )
          .replace(
            /\s+/g,
            ' '
          )
          .trim();
      };

    /* =====================================
       CONVERTIR COORDENADAS
    ===================================== */

    const toCoordinate =
      (
        value:
          | string
          | number
          | null
          | undefined
      ) => {

        if (
          value ===
            null ||
          value ===
            undefined ||
          value ===
            ''
        ) {
          return null;
        }

        const number =
          Number(
            value
          );

        if (
          !Number.isFinite(
            number
          )
        ) {
          return null;
        }

        return number;
      };

    /* =====================================
       DIRECCIÓN
    ===================================== */

    const fullAddress =
      useMemo(
        () => {

          if (!request) {
            return '';
          }

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

          const postalCode =
            request
              .addressPostalCode ||
            request
              .address
              ?.postalCode;

          const streetLine =
            [
              street,
              exterior
                ? `#${exterior}`
                : null,
            ]
              .filter(
                Boolean
              )
              .join(' ');

          return [
            streetLine,

            interior
              ? `Interior ${interior}`
              : null,

            neighborhood
              ? `Col. ${neighborhood}`
              : null,

            municipality,

            state,

            postalCode
              ? `C.P. ${postalCode}`
              : null,
          ]
            .filter(
              Boolean
            )
            .join(', ');
        },
        [request]
      );

    const references =
      request
        ?.addressReferences ||
      request
        ?.address
        ?.references ||
      '';

    const addressLabel =
      request
        ?.addressLabel ||
      request
        ?.address
        ?.label ||
      'Ubicación del servicio';

    /* =====================================
       COORDENADAS
    ===================================== */

    const latitude =
      useMemo(
        () => {

          if (!request) {
            return null;
          }

          return toCoordinate(
            request
              .addressLatitude ??
            request
              .address
              ?.latitude
          );
        },
        [request]
      );

    const longitude =
      useMemo(
        () => {

          if (!request) {
            return null;
          }

          return toCoordinate(
            request
              .addressLongitude ??
            request
              .address
              ?.longitude
          );
        },
        [request]
      );

    /*
      GOOGLE MAPS

      Este mapa usa directamente Google Maps
      mediante iframe. No requiere Leaflet ni
      OpenStreetMap y tampoco depende de una
      API key para esta vista.
    */
    const mapDestination =
      useMemo(
        () => {

          if (
            latitude !== null &&
            longitude !== null
          ) {
            return (
              `${latitude},${longitude}`
            );
          }

          return (
            fullAddress.trim()
          );
        },
        [
          latitude,
          longitude,
          fullAddress,
        ]
      );

    const googleMapsEmbedUrl =
      useMemo(
        () => {

          if (!mapDestination) {
            return '';
          }

          return (
            'https://maps.google.com/maps' +
            `?q=${encodeURIComponent(
              mapDestination
            )}` +
            '&z=17' +
            '&hl=es' +
            '&output=embed'
          );

        },
        [
          mapDestination,
        ]
      );

    /* =====================================
       GOOGLE MAPS
    ===================================== */

    const openDirections =
      () => {

        if (
          !mapDestination
        ) {
          return;
        }

        const url =
          'https://www.google.com/maps/dir/' +
          '?api=1' +
          '&travelmode=driving' +
          `&destination=${encodeURIComponent(
            mapDestination
          )}`;

        window.open(
          url,
          '_blank',
          'noopener,noreferrer'
        );
      };

    /* =====================================
       INICIALES CLIENTE
    ===================================== */

    const clientInitials =
      useMemo(
        () => {

          const name =
            request
              ?.client
              ?.name ||
            'Cliente';

          return (
            name
              .trim()
              .split(' ')
              .filter(
                Boolean
              )
              .map(
                (word) =>
                  word.charAt(
                    0
                  )
              )
              .join('')
              .substring(
                0,
                2
              )
              .toUpperCase() ||
            'CL'
          );

        },
        [request]
      );

    /* =====================================
       LOADING
    ===================================== */

    if (loading) {

      return (
        <div className="request-detail-loading-page">

          <div className="request-detail-loader" />

          <strong>
            Cargando solicitud
          </strong>

          <p>
            Estamos consultando
            los datos del servicio.
          </p>

        </div>
      );
    }

    /* =====================================
       ERROR
    ===================================== */

    if (
      error ||
      !request
    ) {

      return (
        <div className="request-detail-error-page">

          <div className="request-detail-error-card">

            <span>
              !
            </span>

            <h1>
              No pudimos cargar
              la solicitud
            </h1>

            <p>
              {error ||
                'La solicitud no está disponible.'}
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/specialist'
                )
              }
            >
              Volver al panel
            </button>

          </div>

        </div>
      );
    }

    const status =
      getStatusInfo(
        request.status
      );

    const photoUrl =
      resolveStoredFileUrl(
        request
          .client
          .profilePhotoUrl
      );

    /* =====================================
       UI
    ===================================== */

    return (
      <div className="request-detail-page">

        {/* =================================
            HEADER
        ================================= */}

        <header className="request-detail-header">

          <div className="request-detail-header-inner">

            <button
              type="button"
              className="request-detail-brand"
              onClick={() =>
                navigate(
                  '/specialist'
                )
              }
            >
              <img
                src={logo}
                alt="FEISIN"
              />
            </button>

            <button
              type="button"
              className="request-detail-back-header"
              onClick={() =>
                navigate(
                  '/specialist'
                )
              }
            >
              ← Volver al panel
            </button>

          </div>

        </header>

        {/* =================================
            CONTENIDO
        ================================= */}

        <main className="request-detail-main">

          {/* VOLVER */}

          <button
            type="button"
            className="request-detail-back"
            onClick={() =>
              navigate(
                '/specialist'
              )
            }
          >
            <span>
              ←
            </span>

            Volver a solicitudes
          </button>

          {/* =================================
              HERO
          ================================= */}

          <section className="request-detail-hero">

            <div>

              <div className="request-detail-meta">

                <span className="request-number-chip">
                  Solicitud #{request.id}
                </span>

                <span className="request-category-chip">
                  {
                    request
                      .service
                      .category
                      .name
                  }
                </span>

              </div>

              <h1>
                {
                  request
                    .service
                    .name
                }
              </h1>

              <p className="request-detail-hero-subtitle">
                Detalles del servicio solicitado
              </p>

            </div>

            <div
              className={
                `request-detail-status ${status.className}`
              }
            >
              <i />

              <div>

                <strong>
                  {
                    status.label
                  }
                </strong>

                <span>
                  {
                    status.description
                  }
                </span>

              </div>

            </div>

          </section>

          {/* =================================
              GRID
          ================================= */}

          <div className="request-detail-grid">

            {/* =============================
                COLUMNA PRINCIPAL
            ============================== */}

            <div className="request-detail-content">

              {/* CLIENTE */}

              <section className="request-detail-card">

                <div className="request-detail-card-heading">

                  <div>

                    <span className="request-detail-eyebrow">
                      CLIENTE
                    </span>

                    <h2>
                      Información
                      del cliente
                    </h2>

                  </div>

                </div>

                <div className="request-client-card">

                  <div className="request-client-avatar">

                    {photoUrl ? (

                      <img
                        src={
                          photoUrl
                        }
                        alt={
                          request
                            .client
                            .name
                        }
                      />

                    ) : (

                      <span>
                        {
                          clientInitials
                        }
                      </span>

                    )}

                  </div>

                  <div className="request-client-information">

                    <strong>
                      {
                        request
                          .client
                          .name
                      }
                    </strong>

                    <span>
                      {
                        request
                          .client
                          .email
                      }
                    </span>

                    {request
                      .client
                      .phone && (

                      <a
                        href={
                          `tel:${request.client.phone}`
                        }
                      >
                        {
                          request
                            .client
                            .phone
                        }
                      </a>

                    )}

                  </div>

                </div>

              </section>

              {/* DIRECCIÓN */}

              <section className="request-detail-card">

                <div className="request-detail-card-heading">

                  <div>

                    <span className="request-detail-eyebrow">
                      DIRECCIÓN DEL SERVICIO
                    </span>

                    <h2>
                      {
                        addressLabel
                      }
                    </h2>

                  </div>

                </div>

                <div className="request-address-content">

                  <div className="request-address-icon">
                    ⌖
                  </div>

                  <div>

                    <strong>
                      Dirección
                    </strong>

                    <p>
                      {fullAddress ||
                        'Dirección no disponible'}
                    </p>

                  </div>

                </div>

                {references && (

                  <div className="request-references">

                    <span>
                      REFERENCIAS
                    </span>

                    <p>
                      {
                        references
                      }
                    </p>

                  </div>

                )}

              </section>

              {/* MAPA */}

              <section className="request-detail-card request-map-section">

                <div className="google-map-title-row">

                  <div>

                    <span className="request-detail-eyebrow">
                      UBICACIÓN DEL SERVICIO
                    </span>

                    <h2>
                      Mapa y ruta
                    </h2>

                    <p>
                      Consulta la ubicación exacta
                      y abre la ruta en Google Maps.
                    </p>

                  </div>

                  <button
                    type="button"
                    className="google-maps-open-button"
                    disabled={
                      !mapDestination
                    }
                    onClick={
                      openDirections
                    }
                  >
                    <span className="google-maps-button-icon">
                      ↗
                    </span>

                    Abrir en Google Maps
                  </button>

                </div>

                {googleMapsEmbedUrl ? (

                  <div className="google-map-shell">

                    <iframe
                      className="request-google-map"
                      title={
                        `Google Maps - Solicitud ${
                          request.id
                        }`
                      }
                      src={
                        googleMapsEmbedUrl
                      }
                      loading="eager"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                    />

                    <div className="google-map-footer">

                      <div className="google-map-location-copy">

                        <span>
                          DESTINO
                        </span>

                        <strong>
                          {
                            fullAddress ||
                            mapDestination
                          }
                        </strong>

                      </div>

                      <button
                        type="button"
                        onClick={
                          openDirections
                        }
                      >
                        Cómo llegar
                        <span>
                          →
                        </span>
                      </button>

                    </div>

                  </div>

                ) : (

                  <div className="request-map-empty">

                    <div>
                      ⌖
                    </div>

                    <strong>
                      Ubicación no disponible
                    </strong>

                    <p>
                      Esta solicitud todavía
                      no tiene una dirección
                      o coordenadas válidas.
                    </p>

                  </div>

                )}

              </section>

              {/* INDICACIONES */}

              {request.message && (

                <section className="request-detail-card">

                  <span className="request-detail-eyebrow">
                    INDICACIONES DEL CLIENTE
                  </span>

                  <div className="request-message-box">

                    <span>
                      “
                    </span>

                    <p>
                      {
                        request
                          .message
                      }
                    </p>

                  </div>

                </section>

              )}

              {/* DESCRIPCIÓN SERVICIO */}

              {request
                .service
                .description && (

                <section className="request-detail-card">

                  <span className="request-detail-eyebrow">
                    SERVICIO
                  </span>

                  <h2>
                    Descripción
                    del servicio
                  </h2>

                  <p className="request-service-description">
                    {
                      request
                        .service
                        .description
                    }
                  </p>

                </section>

              )}

            </div>

            {/* =============================
                RESUMEN
            ============================== */}

            <aside className="request-detail-sidebar">

              <section className="specialist-request-summary-card">

                <span className="request-detail-eyebrow">
                  RESUMEN
                </span>

                <h2>
                  {
                    request
                      .service
                      .name
                  }
                </h2>

                <span className="specialist-request-summary-category">
                  {
                    request
                      .service
                      .category
                      .name
                  }
                </span>

                <div className="specialist-request-summary-price">

                  <small>
                    PRECIO
                  </small>

                  <strong>
                    {
                      formatPrice(
                        request
                          .service
                          .price
                      )
                    }
                  </strong>

                  <span>
                    {
                      getPriceTypeLabel(
                        request
                          .service
                          .priceType
                      )
                    }
                  </span>

                </div>

                <div className="specialist-request-summary-divider" />

                <div className="specialist-request-summary-information">

                  <div className="specialist-request-summary-row">

                    <span>
                      Solicitud
                    </span>

                    <strong className="specialist-request-summary-id">
                      #{request.id}
                    </strong>

                  </div>

                  <div>

                    <span>
                      Estado
                    </span>

                    <strong>
                      {
                        status.label
                      }
                    </strong>

                  </div>

                  <div>

                    <span>
                      Solicitada
                    </span>

                    <strong>
                      {
                        formatCompactDate(
                          request
                            .createdAt
                        )
                      }
                    </strong>

                  </div>

                  {request
                    .reviewedAt && (

                    <div>

                      <span>
                        Aprobada
                      </span>

                      <strong>
                        {
                          formatCompactDate(
                            request
                              .reviewedAt
                          )
                        }
                      </strong>

                    </div>

                  )}

                  <div>

                    <span>
                      Actualizada
                    </span>

                    <strong>
                      {
                        formatCompactDate(
                          request
                            .updatedAt
                        )
                      }
                    </strong>

                  </div>

                </div>

                <button
                  type="button"
                  className="specialist-request-summary-directions"
                  disabled={
                    !mapDestination
                  }
                  onClick={
                    openDirections
                  }
                >
                  <span>
                    ⌖
                  </span>

                  Cómo llegar
                </button>

              </section>

              {/* DATOS IMPORTANTES */}

              <section className="request-important-card">

                <span className="request-detail-eyebrow">
                  DATOS IMPORTANTES
                </span>

                <div>

                  <strong>
                    Cliente
                  </strong>

                  <span>
                    {
                      request
                        .client
                        .name
                    }
                  </span>

                </div>

                {request
                  .client
                  .phone && (

                  <div>

                    <strong>
                      Teléfono
                    </strong>

                    <a
                      href={
                        `tel:${request.client.phone}`
                      }
                    >
                      {
                        request
                          .client
                          .phone
                      }
                    </a>

                  </div>

                )}

                <div>

                  <strong>
                    Correo
                  </strong>

                  <a
                    href={
                      `mailto:${request.client.email}`
                    }
                  >
                    {
                      request
                        .client
                        .email
                    }
                  </a>

                </div>

                <div>

                  <strong>
                    Dirección
                  </strong>

                  <span>
                    {
                      fullAddress ||
                      'No disponible'
                    }
                  </span>

                </div>

              </section>

            </aside>

          </div>

        </main>

      </div>
    );
  };

export default SpecialistRequestDetail;