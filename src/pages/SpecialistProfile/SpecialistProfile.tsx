import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  MapContainer,
  Marker,
  TileLayer,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

type RequestStatus =
  | 'PENDING_ADMIN'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

type UserRole =
  | 'CLIENT'
  | 'SPECIALIST'
  | 'ADMIN';

type SessionUser = {
  id?: number;
  userId?: number;
  name?: string;
  email?: string;
  role?: UserRole;
};

type JwtPayload = {
  userId?: number;
  role?: UserRole;
};

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
  profilePhotoUrl?: string | null;

  available: boolean;
  profileCompleted: boolean;

  specialties: Category[];
  services: Service[];

  startingPrice?: number | null;
};

type ClientServiceRequest = {
  id: number;
  clientId?: number;
  serviceId: number;
  status: RequestStatus;
  message?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ClientAddress = {
  id: number;
  userId: number;
  label: string;
  state: string;
  municipality: string;
  neighborhood: string;
  postalCode: string;
  street: string;
  exteriorNumber: string;
  interiorNumber?: string | null;
  references?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type NewAddressForm = {
  label: string;
  state: string;
  municipality: string;
  neighborhood: string;
  postalCode: string;
  street: string;
  exteriorNumber: string;
  interiorNumber: string;
  references: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
};

const decodeJwtPayload = (
  token: string
): JwtPayload | null => {
  try {
    const payloadPart =
      token.split('.')[1];

    if (!payloadPart) {
      return null;
    }

    const normalized =
      payloadPart
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const padded =
      normalized.padEnd(
        normalized.length +
          ((4 -
            (normalized.length % 4)) %
            4),
        '='
      );

    return JSON.parse(
      atob(padded)
    ) as JwtPayload;
  } catch (error) {
    console.error(
      'ERROR LEYENDO TOKEN:',
      error
    );

    return null;
  }
};

const DEFAULT_MAP_POSITION: [number, number] = [
  19.4326,
  -99.1332,
];

const mapMarkerIcon = L.divIcon({
  className: 'service-map-marker-wrapper',
  html: '<div class="service-map-marker">📍</div>',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
});

type AddressMapPickerProps = {
  latitude: number | null;
  longitude: number | null;
  onChange: (
    latitude: number,
    longitude: number
  ) => void;
};

const AddressMapPicker = ({
  latitude,
  longitude,
  onChange,
}: AddressMapPickerProps) => {
  const position: [number, number] = [
    latitude ?? DEFAULT_MAP_POSITION[0],
    longitude ?? DEFAULT_MAP_POSITION[1],
  ];

  const MapClickHandler = () => {
    useMapEvents({
      click(event) {
        onChange(
          event.latlng.lat,
          event.latlng.lng
        );
      },
    });

    return null;
  };

  return (
    <MapContainer
      center={position}
      zoom={latitude !== null ? 16 : 11}
      className="service-address-map"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapClickHandler />

      {latitude !== null &&
        longitude !== null && (
        <Marker
          position={[latitude, longitude]}
          icon={mapMarkerIcon}
          draggable
          eventHandlers={{
            dragend(event) {
              const marker =
                event.target as L.Marker;
              const location =
                marker.getLatLng();

              onChange(
                location.lat,
                location.lng
              );
            },
          }}
        />
      )}
    </MapContainer>
  );
};

const SpecialistProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  /*
    =====================================
    SESIÓN

    Esta página sigue siendo pública.
    El token solamente se usa para saber
    si el visitante ya inició sesión.
    =====================================
  */

  const token =
    localStorage.getItem(
      'token'
    );

  const storedUser =
    localStorage.getItem(
      'user'
    );

  const currentUser =
    useMemo<SessionUser | null>(
      () => {
        if (storedUser) {
          try {
            const parsedUser =
              JSON.parse(
                storedUser
              ) as SessionUser;

            if (parsedUser) {
              return parsedUser;
            }
          } catch (storageError) {
            console.error(
              'ERROR LEYENDO USUARIO LOCAL:',
              storageError
            );
          }
        }

        /*
          Si existe token pero por alguna razón
          no existe localStorage.user, recuperamos
          el role desde el JWT solamente para UI.
          El backend sigue validando la autorización.
        */
        if (token) {
          const payload =
            decodeJwtPayload(
              token
            );

          if (payload) {
            return {
              userId:
                payload.userId,
              role:
                payload.role,
            };
          }
        }

        return null;
      },
      [
        storedUser,
        token,
      ]
    );

  const isLoggedIn =
    Boolean(token);

  const currentRole =
    currentUser?.role;

  const goToPanel = () => {
    switch (currentRole) {
      case 'CLIENT':
        navigate('/client');
        return;

      case 'SPECIALIST':
        navigate('/specialist');
        return;

      case 'ADMIN':
        navigate('/admin');
        return;

      default:
        /*
          Hay token pero no pudimos leer el rol.
          No obligamos al usuario a iniciar sesión
          nuevamente; lo dejamos en la página pública.
        */
        navigate('/');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(
      'token'
    );

    localStorage.removeItem(
      'user'
    );

    navigate('/');
  };

  const [
    specialist,
    setSpecialist,
  ] = useState<Specialist | null>(
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

  /*
    SOLICITUDES DEL CLIENTE
  */
  const [
    myRequests,
    setMyRequests,
  ] = useState<
    ClientServiceRequest[]
  >([]);

  const [
    requestingServiceId,
    setRequestingServiceId,
  ] = useState<number | null>(
    null
  );

  const [
    cancellingRequestId,
    setCancellingRequestId,
  ] = useState<number | null>(
    null
  );

  const [
    requestMessage,
    setRequestMessage,
  ] = useState('');

  const [
    requestError,
    setRequestError,
  ] = useState('');


  /*
    DIRECCIONES Y MODAL DE SOLICITUD
  */
  const [
    addresses,
    setAddresses,
  ] = useState<ClientAddress[]>([]);

  const [
    loadingAddresses,
    setLoadingAddresses,
  ] = useState(false);

  const [
    selectedAddressId,
    setSelectedAddressId,
  ] = useState<number | null>(null);

  const [
    requestModalOpen,
    setRequestModalOpen,
  ] = useState(false);

  const [
    selectedService,
    setSelectedService,
  ] = useState<Service | null>(null);

  const [
    serviceMessage,
    setServiceMessage,
  ] = useState('');

  const [
    showNewAddressForm,
    setShowNewAddressForm,
  ] = useState(false);

  const [
    savingAddress,
    setSavingAddress,
  ] = useState(false);

  const [
    newAddress,
    setNewAddress,
  ] = useState<NewAddressForm>({
    label: '',
    state: '',
    municipality: '',
    neighborhood: '',
    postalCode: '',
    street: '',
    exteriorNumber: '',
    interiorNumber: '',
    references: '',
    latitude: null,
    longitude: null,
    isDefault: false,
  });

  /*
    CARGAR ESPECIALISTA
  */
  const loadSpecialist =
    async () => {
      try {
        setLoading(true);
        setError('');

        const response =
          await api.get(
            '/specialists'
          );

        const specialists:
          Specialist[] =
            response.data
              ?.specialists ||
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
      } catch (
        requestError: any
      ) {
        console.error(
          'ERROR CARGANDO PERFIL:',
          requestError.response
            ?.data ||
            requestError
        );

        setError(
          requestError.response
            ?.data?.message ||
            'No fue posible cargar el perfil.'
        );
      } finally {
        setLoading(false);
      }
    };

  /*
    CARGAR SOLICITUDES
    DEL CLIENTE
  */
  const loadMyRequests =
    async () => {
      const token =
        localStorage.getItem(
          'token'
        );

      if (!token) {
        setMyRequests([]);
        return;
      }

      try {
        const response =
          await api.get(
            '/requests/my',
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        console.log(
          'MIS SOLICITUDES:',
          response.data
        );

        setMyRequests(
          response.data
            ?.requests ||
            []
        );
      } catch (
        requestError: any
      ) {
        /*
          Puede ocurrir si el usuario
          autenticado no es CLIENT.
        */
        if (
          requestError.response
            ?.status === 403
        ) {
          setMyRequests([]);
          return;
        }

        if (
          requestError.response
            ?.status === 401
        ) {
          setMyRequests([]);
          return;
        }

        console.error(
          'ERROR CARGANDO SOLICITUDES:',
          requestError.response
            ?.data ||
            requestError
        );
      }
    };

  /*
    CARGAR DIRECCIONES DEL CLIENTE
  */
  const loadAddresses =
    async () => {
      const token =
        localStorage.getItem(
          'token'
        );

      if (!token) {
        setAddresses([]);
        return [];
      }

      try {
        setLoadingAddresses(true);

        const response =
          await api.get(
            '/addresses',
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const loadedAddresses:
          ClientAddress[] =
            response.data
              ?.addresses ||
            [];

        setAddresses(
          loadedAddresses
        );

        const defaultAddress =
          loadedAddresses.find(
            (address) =>
              address.isDefault
          );

        if (defaultAddress) {
          setSelectedAddressId(
            defaultAddress.id
          );
        } else if (
          loadedAddresses.length > 0
        ) {
          setSelectedAddressId(
            loadedAddresses[0].id
          );
        } else {
          setSelectedAddressId(
            null
          );
        }

        return loadedAddresses;
      } catch (
        addressError: any
      ) {
        console.error(
          'ERROR CARGANDO DIRECCIONES:',
          addressError.response
            ?.data ||
            addressError
        );

        if (
          addressError.response
            ?.status === 401
        ) {
          localStorage.removeItem(
            'token'
          );
          localStorage.removeItem(
            'user'
          );
          navigate('/login');
          return [];
        }

        if (
          addressError.response
            ?.status === 403
        ) {
          setAddresses([]);
          setRequestError(
            'Debes ingresar con una cuenta de cliente para solicitar servicios.'
          );
          return [];
        }

        setRequestError(
          addressError.response
            ?.data?.message ||
            'No fue posible cargar tus direcciones.'
        );

        return [];
      } finally {
        setLoadingAddresses(false);
      }
    };

  const openRequestModal = async (
    service: Service
  ) => {
    const currentToken =
      localStorage.getItem(
        'token'
      );

    /*
      Sin sesión sí mandamos a login.
      Guardamos de dónde venía para poder
      regresar al perfil después.
    */
    if (!currentToken) {
      navigate(
        '/login',
        {
          state: {
            returnTo:
              `/specialists/${id}`,
          },
        }
      );

      return;
    }

    /*
      Si conocemos el rol y no es CLIENT,
      no mandamos a login porque YA existe
      una sesión. Solamente informamos que
      una cuenta de especialista/admin no
      puede contratar servicios.
    */
    if (
      currentRole &&
      currentRole !== 'CLIENT'
    ) {
      setRequestError(
        'Para solicitar un servicio debes ingresar con una cuenta de cliente.'
      );

      return;
    }

    setRequestMessage('');
    setRequestError('');
    setSelectedService(service);
    setServiceMessage('');
    setShowNewAddressForm(false);
    setSelectedAddressId(null);

    setNewAddress({
      label: '',
      state: '',
      municipality: '',
      neighborhood: '',
      postalCode: '',
      street: '',
      exteriorNumber: '',
      interiorNumber: '',
      references: '',
      latitude: null,
      longitude: null,
      isDefault: false,
    });

    setRequestModalOpen(true);

    /*
      Si por alguna razón no pudimos leer el rol
      desde localStorage/JWT, el backend decidirá.
      - CLIENT válido: devuelve direcciones.
      - Otro rol: devuelve 403.
      - Token vencido: devuelve 401.
    */
    await loadAddresses();
  };

  const closeRequestModal =
    () => {
      if (
        requestingServiceId !== null ||
        savingAddress
      ) {
        return;
      }

      setRequestModalOpen(false);
      setSelectedService(null);
      setSelectedAddressId(null);
      setServiceMessage('');
      setShowNewAddressForm(false);
      setRequestError('');
    };

  const handleNewAddressChange = (
    field: keyof NewAddressForm,
    value: string | boolean
  ) => {
    setNewAddress(
      (previous) => ({
        ...previous,
        [field]: value,
      })
    );
  };

  const handleSaveAddress =
    async () => {
      const token =
        localStorage.getItem(
          'token'
        );

      if (!token) {
        navigate('/login');
        return;
      }

      if (
        !newAddress.label.trim() ||
        !newAddress.state.trim() ||
        !newAddress.municipality.trim() ||
        !newAddress.neighborhood.trim() ||
        !newAddress.postalCode.trim() ||
        !newAddress.street.trim() ||
        !newAddress.exteriorNumber.trim()
      ) {
        setRequestError(
          'Completa todos los campos obligatorios de la dirección.'
        );
        return;
      }

      if (
        newAddress.latitude === null ||
        newAddress.longitude === null
      ) {
        setRequestError(
          'Selecciona la ubicación exacta en el mapa.'
        );
        return;
      }

      try {
        setSavingAddress(true);
        setRequestError('');

        const response =
          await api.post(
            '/addresses',
            {
              label:
                newAddress.label.trim(),
              state:
                newAddress.state.trim(),
              municipality:
                newAddress.municipality.trim(),
              neighborhood:
                newAddress.neighborhood.trim(),
              postalCode:
                newAddress.postalCode.trim(),
              street:
                newAddress.street.trim(),
              exteriorNumber:
                newAddress.exteriorNumber.trim(),
              interiorNumber:
                newAddress.interiorNumber.trim(),
              references:
                newAddress.references.trim(),
              latitude:
                newAddress.latitude,
              longitude:
                newAddress.longitude,
              isDefault:
                newAddress.isDefault,
            },
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const createdAddress:
          ClientAddress | undefined =
            response.data?.address;

        if (!createdAddress) {
          throw new Error(
            'No se recibió la dirección creada.'
          );
        }

        setAddresses(
          (previous) => {
            const normalized =
              createdAddress.isDefault
                ? previous.map(
                    (address) => ({
                      ...address,
                      isDefault: false,
                    })
                  )
                : previous;

            return [
              createdAddress,
              ...normalized,
            ];
          }
        );

        setSelectedAddressId(
          createdAddress.id
        );
        setShowNewAddressForm(false);
        setNewAddress({
          label: '',
          state: '',
          municipality: '',
          neighborhood: '',
          postalCode: '',
          street: '',
          exteriorNumber: '',
          interiorNumber: '',
          references: '',
          latitude: null,
          longitude: null,
          isDefault: false,
        });
      } catch (
        addressError: any
      ) {
        console.error(
          'ERROR GUARDANDO DIRECCIÓN:',
          addressError.response
            ?.data ||
            addressError
        );

        if (
          addressError.response
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

        setRequestError(
          addressError.response
            ?.data?.message ||
            'No fue posible guardar la dirección.'
        );
      } finally {
        setSavingAddress(false);
      }
    };

  useEffect(() => {
    loadSpecialist();
    loadMyRequests();
  }, [id]);

  /*
    INICIALES
  */
  const initials =
    useMemo(() => {
      if (
        !specialist?.name
      ) {
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

  /*
    FORMATO DE ESPECIALIDAD
  */
  const formatCategoryName = (
    value: string
  ) => {
    if (!value) {
      return 'Especialidad';
    }

    const formatted =
      value
        .replace(
          /([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g,
          '$1 $2'
        )
        .replace(
          /[_-]+/g,
          ' '
        )
        .replace(
          /\s+/g,
          ' '
        )
        .trim();

    if (!formatted) {
      return 'Especialidad';
    }

    return (
      formatted
        .charAt(0)
        .toLocaleUpperCase(
          'es-MX'
        ) +
      formatted.slice(1)
    );
  };

  /*
    TIPO DE PRECIO
  */
  const getPriceType = (
    type: PriceType
  ) => {
    switch (type) {
      case 'HOUR':
        return 'hora';

      case 'DAY':
        return 'día';

      case 'ACTIVITY':
        return 'servicio';

      default:
        return 'servicio';
    }
  };

  /*
    FORMATO PRECIO
  */
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

  /*
    UBICACIÓN
  */
  const location =
    useMemo(() => {
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

  /*
    SERVICIO MÁS ECONÓMICO
  */
  const lowestService =
    useMemo(() => {
      if (
        !specialist ||
        specialist.services
          .length === 0
      ) {
        return null;
      }

      return [
        ...specialist.services,
      ].sort(
        (a, b) =>
          Number(a.price) -
          Number(b.price)
      )[0];
    }, [specialist]);

  /*
    BUSCAR SOLICITUD ACTIVA
    DE UN SERVICIO
  */
  const getActiveRequest = (
    serviceId: number
  ) => {
    return myRequests.find(
      (request) =>
        Number(
          request.serviceId
        ) ===
          Number(serviceId) &&
        request.status !==
          'CANCELLED' &&
        request.status !==
          'REJECTED'
    );
  };

  /*
    SOLICITAR SERVICIO
  */
  const handleRequestService =
    async () => {
      if (!selectedService) {
        setRequestError(
          'Selecciona un servicio.'
        );
        return;
      }

      if (!selectedAddressId) {
        setRequestError(
          'Selecciona una dirección para realizar el servicio.'
        );
        return;
      }

      try {
        const token =
          localStorage.getItem(
            'token'
          );

        if (!token) {
          navigate('/login');
          return;
        }

        setRequestingServiceId(
          selectedService.id
        );

        setRequestMessage('');
        setRequestError('');

        const response =
          await api.post(
            '/requests',
            {
              serviceId:
                selectedService.id,
              addressId:
                selectedAddressId,
              message:
                serviceMessage.trim(),
            },
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        console.log(
          'SOLICITUD CREADA:',
          response.data
        );

        await loadMyRequests();

        setRequestMessage(
          response.data?.message ||
            'Tu solicitud fue enviada al administrador para revisión.'
        );

        setRequestModalOpen(false);
        setSelectedService(null);
        setSelectedAddressId(null);
        setServiceMessage('');
        setShowNewAddressForm(false);
      } catch (
        requestError: any
      ) {
        console.error(
          'ERROR SOLICITANDO SERVICIO:',
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

        setRequestError(
          requestError.response
            ?.data?.message ||
            'No fue posible enviar la solicitud.'
        );
      } finally {
        setRequestingServiceId(null);
      }
    };

  /*
    CANCELAR SOLICITUD
  */
  const handleCancelRequest =
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

        setCancellingRequestId(
          requestId
        );

        setRequestMessage('');
        setRequestError('');

        const response =
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

        console.log(
          'SOLICITUD CANCELADA:',
          response.data
        );

        /*
          Volvemos a consultar.
          Como ahora estará CANCELLED,
          volverá a aparecer Solicitar.
        */
        await loadMyRequests();

        setRequestMessage(
          response.data?.message ||
            'Solicitud cancelada correctamente.'
        );
      } catch (
        requestError: any
      ) {
        console.error(
          'ERROR CANCELANDO SOLICITUD:',
          requestError.response
            ?.data ||
            requestError
        );

        setRequestError(
          requestError.response
            ?.data?.message ||
            'No fue posible cancelar la solicitud.'
        );
      } finally {
        setCancellingRequestId(
          null
        );
      }
    };

  /*
    BOTÓN SEGÚN ESTADO
  */
  const renderRequestButton = (
    service: Service
  ) => {
    const existingRequest =
      getActiveRequest(
        service.id
      );

    /*
      TODAVÍA NO HAY SOLICITUD
    */
    if (!existingRequest) {
      return (
        <button
          type="button"
          disabled={
            requestingServiceId ===
            service.id
          }
          onClick={() =>
            openRequestModal(
              service
            )
          }
        >
          {requestingServiceId ===
          service.id
            ? 'Enviando...'
            : 'Solicitar'}

          <b>
            →
          </b>
        </button>
      );
    }

    /*
      PENDIENTE DE ADMIN
    */
    if (
      existingRequest.status ===
      'PENDING_ADMIN'
    ) {
      return (
        <button
          type="button"
          className="public-service-cancel"
          disabled={
            cancellingRequestId ===
            existingRequest.id
          }
          onClick={() =>
            handleCancelRequest(
              existingRequest.id
            )
          }
        >
          {cancellingRequestId ===
          existingRequest.id
            ? 'Cancelando...'
            : 'Cancelar'}

          <b>
            ×
          </b>
        </button>
      );
    }

    /*
      APROBADA
    */
    if (
      existingRequest.status ===
      'APPROVED'
    ) {
      return (
        <button
          type="button"
          disabled
          className="public-service-approved"
        >
          Solicitud aprobada

          <b>
            ✓
          </b>
        </button>
      );
    }

    /*
      EN PROCESO
    */
    if (
      existingRequest.status ===
      'IN_PROGRESS'
    ) {
      return (
        <button
          type="button"
          disabled
          className="public-service-approved"
        >
          En proceso

          <b>
            ✓
          </b>
        </button>
      );
    }

    /*
      COMPLETADA
    */
    if (
      existingRequest.status ===
      'COMPLETED'
    ) {
      return (
        <button
          type="button"
          disabled
          className="public-service-completed"
        >
          Completado

          <b>
            ✓
          </b>
        </button>
      );
    }

    /*
      CANCELADA / RECHAZADA
      permite volver a solicitar.
    */
    return (
      <button
        type="button"
        disabled={
          requestingServiceId ===
          service.id
        }
        onClick={() =>
          openRequestModal(
            service
          )
        }
      >
        {requestingServiceId ===
        service.id
          ? 'Enviando...'
          : 'Solicitar'}

        <b>
          →
        </b>
      </button>
    );
  };

  /*
    LOADING
  */
  if (loading) {
    return (
      <div className="public-profile-loading">

        <div className="public-profile-spinner" />

        <strong>
          Cargando especialista
        </strong>

        <span>
          Estamos preparando su
          perfil profesional.
        </span>

      </div>
    );
  }

  /*
    ERROR
  */
  if (
    !specialist ||
    error
  ) {
    return (
      <div className="public-profile-error-page">

        <div className="public-profile-error-icon">
          !
        </div>

        <h1>
          Especialista no
          encontrado
        </h1>

        <p>
          {error ||
            'El perfil que buscas no está disponible.'}
        </p>

        <button
          type="button"
          onClick={() =>
            navigate(
              '/specialists'
            )
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

            {isLoggedIn ? (
              <>
                <button
                  type="button"
                  onClick={
                    goToPanel
                  }
                >
                  Mi panel
                </button>

                <button
                  type="button"
                  className="public-profile-register"
                  onClick={
                    handleLogout
                  }
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      '/login',
                      {
                        state: {
                          returnTo:
                            `/specialists/${id}`,
                        },
                      }
                    )
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
              </>
            )}

          </nav>

        </div>

      </header>

      <main className="public-profile-container">

        {/* VOLVER */}

        <button
          type="button"
          className="public-profile-back"
          onClick={() =>
            navigate(
              '/specialists'
            )
          }
        >
          <span>
            ←
          </span>

          Volver a especialistas
        </button>

        {/* HERO */}

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
                    (
                      specialty
                    ) => (
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

                  {specialist
                    .specialties
                    .length === 0 && (
                    <span>
                      Especialista
                      FASYN
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
                    specialist
                      .services
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
                    PERFIL PROFESIONAL
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

              {specialist
                .specialties
                .length > 0 && (

                <div className="public-profile-tags">

                  {specialist.specialties.map(
                    (
                      specialty
                    ) => (
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

            <section
              id="specialist-services"
              className="public-profile-section"
            >

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
                    Selecciona el
                    trabajo que
                    necesitas.
                  </p>

                </div>

              </div>

              {/* MENSAJES */}

              {requestMessage && (

                <div className="public-request-success">

                  <div className="public-request-feedback-icon">
                    ✓
                  </div>

                  <div>

                    <strong>
                      Solicitud actualizada
                    </strong>

                    <p>
                      {requestMessage}
                    </p>

                  </div>

                </div>

              )}

              {requestError && (

                <div className="public-request-error">

                  <div className="public-request-feedback-icon">
                    !
                  </div>

                  <div>

                    <strong>
                      No se pudo realizar
                      la operación
                    </strong>

                    <p>
                      {requestError}
                    </p>

                  </div>

                </div>

              )}

              {specialist.services
                .length > 0 ? (

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

                          {renderRequestButton(
                            service
                          )}

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
                    Sin servicios
                    publicados
                  </h3>

                  <p>
                    Este especialista
                    aún no tiene
                    servicios
                    disponibles.
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
                    Las valoraciones
                    aparecerán después
                    de servicios
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
                    Cuando clientes
                    completen servicios
                    con este especialista
                    podrán dejar una
                    valoración.
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
              ¿Necesitas alguno de
              sus servicios?
            </h2>

            <p>
              Revisa sus servicios y
              envía una solicitud cuando
              encuentres el trabajo que
              necesitas.
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
                  definidos por el
                  especialista
                </small>

              </div>

            </div>

            <div className="public-hire-feature">

              <span>
                ✓
              </span>

              <div>

                <strong>
                  Solicitud sujeta a
                  aprobación
                </strong>

                <small>
                  FASYN revisará la
                  solicitud antes de
                  enviarla al especialista
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
                const element =
                  document.getElementById(
                    'specialist-services'
                  );

                element?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                });
              }}
            >

              Ver servicios disponibles

              <span>
                →
              </span>

            </button>

            <small className="public-hire-disclaimer">

              La solicitud primero será
              revisada por FASYN. No se
              realizará ningún cobro en
              este momento.

            </small>

          </aside>

        </div>

      </main>

      {/* MODAL SOLICITAR SERVICIO */}

      {requestModalOpen &&
        selectedService && (

        <div
          className="service-request-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeRequestModal();
            }
          }}
        >
          <div className="service-request-modal">

            <div className="service-request-modal-header">
              <div>
                <span className="service-request-modal-eyebrow">
                  SOLICITAR SERVICIO
                </span>

                <h2>
                  {selectedService.name}
                </h2>

                <p>
                  Selecciona dónde necesitas
                  que se realice el servicio.
                </p>
              </div>

              <button
                type="button"
                className="service-request-modal-close"
                onClick={
                  closeRequestModal
                }
                disabled={
                  requestingServiceId !==
                    null ||
                  savingAddress
                }
              >
                ×
              </button>
            </div>

            <div className="service-request-summary">
              <div>
                <small>
                  SERVICIO
                </small>

                <strong>
                  {selectedService.name}
                </strong>

                <span>
                  {formatCategoryName(
                    selectedService
                      .category.name
                  )}
                </span>
              </div>

              <div className="service-request-summary-price">
                <strong>
                  {formatPrice(
                    selectedService.price
                  )}
                </strong>

                <span>
                  por{' '}
                  {getPriceType(
                    selectedService.priceType
                  )}
                </span>
              </div>
            </div>

            {requestError && (
              <div className="service-request-modal-error">
                <span>
                  !
                </span>

                <p>
                  {requestError}
                </p>
              </div>
            )}

            {!showNewAddressForm && (
              <>
                <div className="service-request-section-title">
                  <div>
                    <span>
                      01
                    </span>

                    <div>
                      <strong>
                        Dirección del servicio
                      </strong>

                      <small>
                        El especialista acudirá
                        a esta dirección.
                      </small>
                    </div>
                  </div>
                </div>

                {loadingAddresses ? (
                  <div className="service-request-loading">
                    <div className="public-profile-spinner" />

                    <span>
                      Cargando tus direcciones...
                    </span>
                  </div>
                ) : (
                  <>
                    {addresses.length > 0 ? (
                      <div className="service-address-list">
                        {addresses.map(
                          (address) => {
                            const selected =
                              selectedAddressId ===
                              address.id;

                            return (
                              <button
                                key={
                                  address.id
                                }
                                type="button"
                                className={
                                  selected
                                    ? 'service-address-card selected'
                                    : 'service-address-card'
                                }
                                onClick={() => {
                                  setSelectedAddressId(
                                    address.id
                                  );
                                  setRequestError('');
                                }}
                              >
                                <div className="service-address-radio">
                                  <span>
                                    {selected
                                      ? '●'
                                      : '○'}
                                  </span>
                                </div>

                                <div className="service-address-content">
                                  <div className="service-address-title">
                                    <strong>
                                      {address.label}
                                    </strong>

                                    {address.isDefault && (
                                      <span>
                                        Principal
                                      </span>
                                    )}
                                  </div>

                                  <p>
                                    {address.street}{' '}
                                    #{address.exteriorNumber}
                                    {address.interiorNumber
                                      ? ` Int. ${address.interiorNumber}`
                                      : ''}
                                  </p>

                                  <small>
                                    {address.neighborhood},{' '}
                                    {address.municipality},{' '}
                                    {address.state}
                                  </small>

                                  <small>
                                    C.P.{' '}
                                    {address.postalCode}
                                  </small>

                                  {address.references && (
                                    <em>
                                      Referencias:{' '}
                                      {address.references}
                                    </em>
                                  )}
                                </div>
                              </button>
                            );
                          }
                        )}
                      </div>
                    ) : (
                      <div className="service-address-empty">
                        <div>
                          ⌂
                        </div>

                        <strong>
                          Aún no tienes direcciones
                        </strong>

                        <p>
                          Agrega la dirección donde
                          necesitas el servicio.
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      className="service-add-address-button"
                      onClick={() => {
                        setRequestError('');
                        setShowNewAddressForm(
                          true
                        );
                      }}
                    >
                      <span>
                        +
                      </span>

                      Agregar nueva dirección
                    </button>

                    <div className="service-request-message-field">
                      <label
                        htmlFor="serviceMessage"
                      >
                        Indicaciones para el especialista
                      </label>

                      <textarea
                        id="serviceMessage"
                        value={
                          serviceMessage
                        }
                        onChange={(
                          event
                        ) =>
                          setServiceMessage(
                            event.target
                              .value
                          )
                        }
                        placeholder="Ej. Tocar el timbre al llegar, preguntar por Juan..."
                        maxLength={500}
                      />

                      <small>
                        Opcional ·{' '}
                        {serviceMessage.length}
                        /500
                      </small>
                    </div>
                  </>
                )}
              </>
            )}

            {showNewAddressForm && (
              <div className="service-new-address">
                <div className="service-request-section-title">
                  <div>
                    <span>
                      01
                    </span>

                    <div>
                      <strong>
                        Nueva dirección
                      </strong>

                      <small>
                        Guarda una nueva dirección
                        para este y futuros servicios.
                      </small>
                    </div>
                  </div>
                </div>

                <div className="service-new-address-grid">
                  <div className="service-form-field">
                    <label>
                      Nombre de la dirección *
                    </label>

                    <input
                      type="text"
                      value={
                        newAddress.label
                      }
                      onChange={(
                        event
                      ) =>
                        handleNewAddressChange(
                          'label',
                          event.target.value
                        )
                      }
                      placeholder="Ej. Casa, Oficina"
                    />
                  </div>

                  <div className="service-form-field">
                    <label>
                      Código postal *
                    </label>

                    <input
                      type="text"
                      value={
                        newAddress.postalCode
                      }
                      onChange={(
                        event
                      ) =>
                        handleNewAddressChange(
                          'postalCode',
                          event.target.value
                        )
                      }
                      placeholder="53000"
                    />
                  </div>

                  <div className="service-form-field">
                    <label>
                      Estado *
                    </label>

                    <input
                      type="text"
                      value={
                        newAddress.state
                      }
                      onChange={(
                        event
                      ) =>
                        handleNewAddressChange(
                          'state',
                          event.target.value
                        )
                      }
                      placeholder="Estado de México"
                    />
                  </div>

                  <div className="service-form-field">
                    <label>
                      Municipio / Alcaldía *
                    </label>

                    <input
                      type="text"
                      value={
                        newAddress.municipality
                      }
                      onChange={(
                        event
                      ) =>
                        handleNewAddressChange(
                          'municipality',
                          event.target.value
                        )
                      }
                      placeholder="Naucalpan de Juárez"
                    />
                  </div>

                  <div className="service-form-field full">
                    <label>
                      Colonia *
                    </label>

                    <input
                      type="text"
                      value={
                        newAddress.neighborhood
                      }
                      onChange={(
                        event
                      ) =>
                        handleNewAddressChange(
                          'neighborhood',
                          event.target.value
                        )
                      }
                      placeholder="Colonia"
                    />
                  </div>

                  <div className="service-form-field full">
                    <label>
                      Calle *
                    </label>

                    <input
                      type="text"
                      value={
                        newAddress.street
                      }
                      onChange={(
                        event
                      ) =>
                        handleNewAddressChange(
                          'street',
                          event.target.value
                        )
                      }
                      placeholder="Nombre de la calle"
                    />
                  </div>

                  <div className="service-form-field">
                    <label>
                      Número exterior *
                    </label>

                    <input
                      type="text"
                      value={
                        newAddress.exteriorNumber
                      }
                      onChange={(
                        event
                      ) =>
                        handleNewAddressChange(
                          'exteriorNumber',
                          event.target.value
                        )
                      }
                      placeholder="123"
                    />
                  </div>

                  <div className="service-form-field">
                    <label>
                      Número interior
                    </label>

                    <input
                      type="text"
                      value={
                        newAddress.interiorNumber
                      }
                      onChange={(
                        event
                      ) =>
                        handleNewAddressChange(
                          'interiorNumber',
                          event.target.value
                        )
                      }
                      placeholder="Opcional"
                    />
                  </div>

                  <div className="service-form-field full">
                    <label>
                      Referencias
                    </label>

                    <textarea
                      value={
                        newAddress.references
                      }
                      onChange={(
                        event
                      ) =>
                        handleNewAddressChange(
                          'references',
                          event.target.value
                        )
                      }
                      placeholder="Ej. Portón negro, casa de dos pisos..."
                    />
                  </div>

                  <div className="service-form-field full service-map-field">
                    <label>
                      Ubicación exacta en el mapa *
                    </label>

                    <p className="service-map-help">
                      Haz clic en el mapa para colocar el pin. También puedes arrastrarlo hasta la ubicación exacta donde se realizará el servicio.
                    </p>

                    <AddressMapPicker
                      latitude={newAddress.latitude}
                      longitude={newAddress.longitude}
                      onChange={(
                        latitude,
                        longitude
                      ) => {
                        setNewAddress(
                          (previous) => ({
                            ...previous,
                            latitude,
                            longitude,
                          })
                        );
                        setRequestError('');
                      }}
                    />

                    <div className="service-map-coordinates">
                      <span>
                        Latitud:{' '}
                        <strong>
                          {newAddress.latitude !== null
                            ? newAddress.latitude.toFixed(6)
                            : 'Selecciona un punto'}
                        </strong>
                      </span>

                      <span>
                        Longitud:{' '}
                        <strong>
                          {newAddress.longitude !== null
                            ? newAddress.longitude.toFixed(6)
                            : 'Selecciona un punto'}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                <label className="service-default-address">
                  <input
                    type="checkbox"
                    checked={
                      newAddress.isDefault
                    }
                    onChange={(
                      event
                    ) =>
                      handleNewAddressChange(
                        'isDefault',
                        event.target.checked
                      )
                    }
                  />

                  <span>
                    <strong>
                      Usar como dirección principal
                    </strong>

                    <small>
                      Se seleccionará automáticamente
                      en futuras solicitudes.
                    </small>
                  </span>
                </label>

                <div className="service-new-address-actions">
                  <button
                    type="button"
                    className="secondary"
                    disabled={
                      savingAddress
                    }
                    onClick={() => {
                      setRequestError('');
                      setShowNewAddressForm(
                        false
                      );
                    }}
                  >
                    Volver
                  </button>

                  <button
                    type="button"
                    className="primary"
                    disabled={
                      savingAddress
                    }
                    onClick={
                      handleSaveAddress
                    }
                  >
                    {savingAddress
                      ? 'Guardando...'
                      : 'Guardar dirección'}
                  </button>
                </div>
              </div>
            )}

            {!showNewAddressForm && (
              <div className="service-request-modal-footer">
                <button
                  type="button"
                  className="secondary"
                  onClick={
                    closeRequestModal
                  }
                  disabled={
                    requestingServiceId !==
                    null
                  }
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="primary"
                  onClick={
                    handleRequestService
                  }
                  disabled={
                    loadingAddresses ||
                    !selectedAddressId ||
                    requestingServiceId !==
                      null
                  }
                >
                  {requestingServiceId !==
                  null
                    ? 'Enviando solicitud...'
                    : 'Enviar solicitud'}

                  <span>
                    →
                  </span>
                </button>
              </div>
            )}

          </div>
        </div>

      )}

    </div>
  );
};

export default SpecialistProfile;