import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  GoogleMap,
  MarkerF,
  useJsApiLoader,
} from '@react-google-maps/api';

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
  | 'PENDING_PAYMENT'
  | 'PENDING_ADMIN'
  | 'APPROVED'
  | 'ACKNOWLEDGED'
  | 'ON_THE_WAY'
  | 'ARRIVED'
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
  durationMinutes: number;
  category: Category;
};

type BusySlot = {
  start: string;
  end: string;
};

type ScheduleOption = {
  time: string;
  available: boolean;
  reason?: 'PAST' | 'BUSY';
};

const TRAVEL_BUFFER_MINUTES = 60;
const SCHEDULE_STEP_MINUTES = 15;

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

type ClientPaymentStatus =
  | 'PENDING'
  | 'IN_PROCESS'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'CHARGED_BACK';

type ClientPayment = {
  id: number;
  amount: string | number;
  currency: string;
  status: ClientPaymentStatus;
  approvedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ClientServiceRequest = {
  id: number;
  clientId?: number;
  serviceId: number;
  quantity?: number;
  status: RequestStatus;
  message?: string | null;
  scheduledAt?: string | null;
  scheduledTimeZone?: string | null;
  payment?: ClientPayment | null;
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

const DEFAULT_MAP_POSITION = {
  lat: 19.4326,
  lng: -99.1332,
};

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

type AddressLookup = {
  state?: string;
  municipality?: string;
  neighborhood?: string;
  postalCode?: string;
  street?: string;
  exteriorNumber?: string;
};

type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type GooglePlaceResult = {
  formatted_address: string;
  geometry: {
    location: google.maps.LatLng;
  };
  address_components?: GoogleAddressComponent[];
};

const getGoogleAddressComponent = (
  components: GoogleAddressComponent[] | undefined,
  types: string[]
) => {
  if (!components) {
    return '';
  }

  for (const type of types) {
    const component = components.find((item) =>
      item.types.includes(type)
    );

    if (component) {
      return component.long_name;
    }
  }

  return '';
};

const normalizeGoogleAddress = (
  components?: GoogleAddressComponent[]
): AddressLookup => {
  return {
    state: getGoogleAddressComponent(
      components,
      ['administrative_area_level_1']
    ),
    municipality: getGoogleAddressComponent(
      components,
      [
        'locality',
        'administrative_area_level_2',
        'sublocality_level_1',
      ]
    ),
    neighborhood: getGoogleAddressComponent(
      components,
      [
        'neighborhood',
        'sublocality_level_1',
        'sublocality',
      ]
    ),
    postalCode: getGoogleAddressComponent(
      components,
      ['postal_code']
    ),
    street: getGoogleAddressComponent(
      components,
      ['route']
    ),
    exteriorNumber: getGoogleAddressComponent(
      components,
      ['street_number']
    ),
  };
};

type NominatimAddress = {
  state?: string;
  municipality?: string;
  city_district?: string;
  borough?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  postcode?: string;
  road?: string;
  pedestrian?: string;
  residential?: string;
  house_number?: string;
};

type NominatimReverseResult = {
  display_name?: string;
  address?: NominatimAddress;
};

const reverseGeocodeNominatim = async (
  latitude: number,
  longitude: number
): Promise<{
  formattedAddress: string;
  address: AddressLookup;
}> => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=es`
  );

  if (!response.ok) {
    throw new Error(
      'No fue posible identificar la ubicación.'
    );
  }

  const data:
    NominatimReverseResult =
      await response.json();

  const address =
    data.address || {};

  const municipality =
    address.municipality ||
    address.city_district ||
    address.borough ||
    address.city ||
    address.town ||
    address.village ||
    address.county ||
    '';

  return {
    formattedAddress:
      data.display_name || '',

    address: {
      state:
        address.state || '',

      municipality,

      neighborhood:
        address.neighbourhood ||
        address.suburb ||
        address.quarter ||
        '',

      postalCode:
        address.postcode || '',

      street:
        address.road ||
        address.pedestrian ||
        address.residential ||
        '',

      exteriorNumber:
        address.house_number ||
        '',
    },
  };
};

const getTodayInputValue = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, '0');
  const day = String(
    now.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

type AddressMapPickerProps = {
  latitude: number | null;
  longitude: number | null;
  onChange: (
    latitude: number,
    longitude: number
  ) => void;
  onAddressResolved: (
    address: AddressLookup
  ) => void;
};

const AddressMapPicker = ({
  latitude,
  longitude,
  onChange,
  onAddressResolved,
}: AddressMapPickerProps) => {
  const [searchText, setSearchText] =
    useState('');

  const [searchResults, setSearchResults] =
    useState<GooglePlaceResult[]>([]);

  const [searching, setSearching] =
    useState(false);

  const [locating, setLocating] =
    useState(false);

  const [resolvingAddress, setResolvingAddress] =
    useState(false);

  const [mapMessage, setMapMessage] =
    useState('');

  const [resolvedAddress, setResolvedAddress] =
    useState('');


  const [map, setMap] =
    useState<google.maps.Map | null>(null);

  const { isLoaded, loadError } =
    useJsApiLoader({
      id: 'fasyn-google-maps-script',
      googleMapsApiKey:
        GOOGLE_MAPS_API_KEY,
      language: 'es',
      region: 'MX',
    });

  const position = {
    lat:
      latitude ??
      DEFAULT_MAP_POSITION.lat,
    lng:
      longitude ??
      DEFAULT_MAP_POSITION.lng,
  };

  useEffect(() => {
    if (
      !map ||
      latitude === null ||
      longitude === null
    ) {
      return;
    }

    map.panTo({
      lat: latitude,
      lng: longitude,
    });

    map.setZoom(17);
  }, [
    map,
    latitude,
    longitude,
  ]);

  const reverseGeocode = async (
    currentLatitude: number,
    currentLongitude: number
  ) => {
    try {
      setResolvingAddress(true);
      setMapMessage('');

      let googleResolved:
        AddressLookup = {};

      let googleFormattedAddress = '';

      /*
        1. Intentamos con Google si está cargado.
      */
      if (isLoaded) {
        try {
          const geocoder =
            new google.maps.Geocoder();

          const response =
            await geocoder.geocode({
              location: {
                lat: currentLatitude,
                lng: currentLongitude,
              },
              region: 'MX',
            });

          const result =
            response.results[0];

          if (result) {
            googleFormattedAddress =
              result.formatted_address ||
              '';

            googleResolved =
              normalizeGoogleAddress(
                result.address_components
              );
          }
        } catch (googleError) {
          console.warn(
            'GOOGLE REVERSE GEOCODING FALLÓ:',
            googleError
          );
        }
      }

      /*
        2. Consultamos Nominatim.
        Este suele regresar mejor colonia,
        municipio/alcaldía y código postal.
      */
      let nominatimResolved:
        AddressLookup = {};

      let nominatimFormattedAddress =
        '';

      try {
        const nominatim =
          await reverseGeocodeNominatim(
            currentLatitude,
            currentLongitude
          );

        nominatimResolved =
          nominatim.address;

        nominatimFormattedAddress =
          nominatim.formattedAddress;
      } catch (nominatimError) {
        console.warn(
          'NOMINATIM REVERSE GEOCODING FALLÓ:',
          nominatimError
        );
      }

      /*
        3. Combinamos ambos.
        Nominatim tiene prioridad en los
        campos donde Google suele fallar.
      */
      const resolved:
        AddressLookup = {
        state:
          nominatimResolved.state ||
          googleResolved.state ||
          '',

        municipality:
          nominatimResolved.municipality ||
          googleResolved.municipality ||
          '',

        neighborhood:
          nominatimResolved.neighborhood ||
          googleResolved.neighborhood ||
          '',

        postalCode:
          nominatimResolved.postalCode ||
          googleResolved.postalCode ||
          '',

        street:
          nominatimResolved.street ||
          googleResolved.street ||
          '',

        exteriorNumber:
          googleResolved.exteriorNumber ||
          nominatimResolved.exteriorNumber ||
          '',
      };

      const formattedAddress =
        googleFormattedAddress ||
        nominatimFormattedAddress;

      console.log(
        'UBICACIÓN RESUELTA:',
        {
          latitude:
            currentLatitude,
          longitude:
            currentLongitude,
          googleResolved,
          nominatimResolved,
          resolved,
        }
      );

      if (formattedAddress) {
        setResolvedAddress(
          formattedAddress
        );

        setSearchText(
          formattedAddress
        );
      }

      onAddressResolved(
        resolved
      );

      const hasAddress =
        Boolean(
          resolved.state ||
          resolved.municipality ||
          resolved.neighborhood ||
          resolved.postalCode ||
          resolved.street
        );

      if (!hasAddress) {
        setMapMessage(
          'Se obtuvo tu ubicación, pero no fue posible identificar el domicilio. Completa los campos manualmente.'
        );
      }

    } catch (error) {
      console.error(
        'REVERSE GEOCODING ERROR:',
        error
      );

      setMapMessage(
        'Se obtuvo tu ubicación, pero no fue posible identificar el domicilio.'
      );

    } finally {
      setResolvingAddress(false);
    }
  };

  const selectCoordinates = async (
    currentLatitude: number,
    currentLongitude: number
  ) => {
    onChange(
      currentLatitude,
      currentLongitude
    );

    setSearchResults([]);

    await reverseGeocode(
      currentLatitude,
      currentLongitude
    );
  };

  const handleSearch = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const query = searchText.trim();

    if (query.length < 3) {
      setMapMessage(
        'Escribe al menos 3 caracteres para buscar.'
      );
      return;
    }

    if (!isLoaded) {
      setMapMessage(
        'Google Maps todavía está cargando.'
      );
      return;
    }

    try {
      setSearching(true);
      setMapMessage('');

      const geocoder =
        new google.maps.Geocoder();

      const response =
        await geocoder.geocode({
          address: query,
          componentRestrictions: {
            country: 'MX',
          },
          region: 'MX',
        });

      const results =
        response.results as GooglePlaceResult[];

      setSearchResults(
        results.slice(0, 6)
      );

      if (results.length === 0) {
        setMapMessage(
          'No encontramos esa ubicación. Intenta con calle, colonia y municipio.'
        );
      }
    } catch (error) {
      console.error(
        'GOOGLE MAP SEARCH ERROR:',
        error
      );

      setSearchResults([]);
      setMapMessage(
        'No fue posible buscar la ubicación. Puedes colocar el pin manualmente.'
      );
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = async (
    result: GooglePlaceResult
  ) => {
    const selectedLatitude =
      result.geometry.location.lat();

    const selectedLongitude =
      result.geometry.location.lng();

    onChange(
      selectedLatitude,
      selectedLongitude
    );

    setResolvedAddress(
      result.formatted_address
    );

    setSearchText(
      result.formatted_address
    );

    setSearchResults([]);

    onAddressResolved(
      normalizeGoogleAddress(
        result.address_components
      )
    );

    if (map) {
      map.panTo({
        lat: selectedLatitude,
        lng: selectedLongitude,
      });
      map.setZoom(17);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setMapMessage(
        'Tu navegador no permite obtener la ubicación.'
      );
      return;
    }

    setLocating(true);
    setMapMessage('');

    navigator.geolocation.getCurrentPosition(
      async (positionResult) => {
        try {
          await selectCoordinates(
            positionResult.coords.latitude,
            positionResult.coords.longitude
          );
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        console.error(
          'GEOLOCATION ERROR:',
          error
        );

        setLocating(false);
        setMapMessage(
          'No fue posible obtener tu ubicación. Revisa el permiso del navegador.'
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  };

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="service-map-message">
        Falta configurar VITE_GOOGLE_MAPS_API_KEY.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="service-map-message">
        No fue posible cargar Google Maps. Revisa la API key y sus restricciones.
      </div>
    );
  }

  return (
    <div className="service-map-picker">
      <div className="service-map-toolbar">
        <form
          className="service-map-search"
          onSubmit={handleSearch}
        >
          <span className="service-map-search-icon">
            ⌕
          </span>

          <input
            type="text"
            value={searchText}
            onChange={(event) => {
              setSearchText(
                event.target.value
              );

              if (
                searchResults.length > 0
              ) {
                setSearchResults([]);
              }
            }}
            placeholder="Buscar calle, colonia o lugar"
            autoComplete="off"
          />

          <button
            type="submit"
            disabled={
              searching || !isLoaded
            }
          >
            {searching
              ? 'Buscando...'
              : 'Buscar'}
          </button>
        </form>

        <button
          type="button"
          className="service-map-location-button"
          onClick={handleUseMyLocation}
          disabled={locating}
        >
          <span>◎</span>

          {locating
            ? 'Ubicando...'
            : 'Usar mi ubicación'}
        </button>
      </div>

      {searchResults.length > 0 && (
        <div className="service-map-results">
          {searchResults.map(
            (result, index) => (
              <button
                key={`${result.formatted_address}-${index}`}
                type="button"
                onClick={() =>
                  void handleSelectSearchResult(
                    result
                  )
                }
              >
                <span>📍</span>
                <p>
                  {result.formatted_address}
                </p>
              </button>
            )
          )}
        </div>
      )}

      <div className="service-map-canvas">
        {!isLoaded ? (
          <div className="service-map-status">
            Cargando Google Maps...
          </div>
        ) : (
          <GoogleMap
            center={position}
            zoom={
              latitude !== null
                ? 17
                : 11
            }
            mapContainerClassName="service-address-map"
            onLoad={(loadedMap) =>
              setMap(loadedMap)
            }
            onUnmount={() =>
              setMap(null)
            }
            onClick={(event) => {
              const clickedLatitude =
                event.latLng?.lat();
              const clickedLongitude =
                event.latLng?.lng();

              if (
                clickedLatitude === undefined ||
                clickedLongitude === undefined
              ) {
                return;
              }

              void selectCoordinates(
                clickedLatitude,
                clickedLongitude
              );
            }}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: true,
              clickableIcons: false,
            }}
          >
            {latitude !== null &&
              longitude !== null && (
                <MarkerF
                  position={{
                    lat: latitude,
                    lng: longitude,
                  }}
                  draggable
                  onDragEnd={(event) => {
                    const markerLatitude =
                      event.latLng?.lat();
                    const markerLongitude =
                      event.latLng?.lng();

                    if (
                      markerLatitude === undefined ||
                      markerLongitude === undefined
                    ) {
                      return;
                    }

                    void selectCoordinates(
                      markerLatitude,
                      markerLongitude
                    );
                  }}
                />
              )}
          </GoogleMap>
        )}

        <div className="service-map-tip">
          <span>📍</span>
          <p>
            Haz clic en el mapa o arrastra el pin hasta la entrada exacta.
          </p>
        </div>
      </div>

      {resolvingAddress && (
        <div className="service-map-status">
          Obteniendo dirección...
        </div>
      )}

      {resolvedAddress && (
        <div className="service-map-resolved">
          <span>✓</span>
          <div>
            <small>
              UBICACIÓN SELECCIONADA
            </small>
            <strong>
              {resolvedAddress}
            </strong>
          </div>
        </div>
      )}

      {mapMessage && (
        <div className="service-map-message">
          {mapMessage}
        </div>
      )}
    </div>
  );
};

const SpecialistProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams();
const [
  paymentCoverageError,
  setPaymentCoverageError,
] = useState<{
  requestId: number;
  code?: string;
  message: string;
  municipality?: string;
  state?: string;
} | null>(null);

const [
  requestCoverageError,
  setRequestCoverageError,
] = useState<{
  code?: string;
  message: string;
  municipality?: string;
  state?: string;
} | null>(null);
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
  localStorage.removeItem('token');
  localStorage.removeItem('user');

  window.location.replace('/login');
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
    creatingPaymentId,
    setCreatingPaymentId,
  ] = useState<number | null>(
    null
  );
const [
  createdRequestId,
  setCreatedRequestId,
] = useState<number | null>(null);
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
    serviceDate,
    setServiceDate,
  ] = useState('');

  const [
    serviceTime,
    setServiceTime,
  ] = useState('');

  /*
    CANTIDAD CONTRATADA

    HOUR     -> número de horas
    DAY      -> por ahora 1 día
    ACTIVITY -> 1 servicio
  */
  const [
    serviceQuantity,
    setServiceQuantity,
  ] = useState(1);

  const [
    busySlots,
    setBusySlots,
  ] = useState<BusySlot[]>([]);

  const [
    loadingAvailability,
    setLoadingAvailability,
  ] = useState(false);

  const [
    availabilityError,
    setAvailabilityError,
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

/*
  DISPONIBILIDAD DEL ESPECIALISTA

  El backend debe regresar busySlots con intervalos ISO:
  { start: string, end: string }

  La validación definitiva de conflictos sigue siendo
  responsabilidad del backend al crear la solicitud.
*/
const loadAvailability = async (
  date: string,
  service: Service | null = selectedService
) => {
  if (
    !specialist ||
    !service ||
    !date
  ) {
    setBusySlots([]);
    setAvailabilityError('');
    return;
  }

  try {
    setLoadingAvailability(true);
    setAvailabilityError('');

    const response =
      await api.get(
        `/specialists/${specialist.id}/availability`,
        {
          params: {
            date,
            serviceId: service.id,
          },
        }
      );

    setBusySlots(
      Array.isArray(
        response.data?.busySlots
      )
        ? response.data.busySlots
        : []
    );
  } catch (availabilityRequestError: any) {
    console.error(
      'ERROR CARGANDO DISPONIBILIDAD:',
      availabilityRequestError.response?.data ||
        availabilityRequestError
    );

    setBusySlots([]);

    setAvailabilityError(
      availabilityRequestError.response
        ?.data?.message ||
        'No fue posible consultar los horarios disponibles.'
    );
  } finally {
    setLoadingAvailability(false);
  }
};

const scheduleOptions =
  useMemo<ScheduleOption[]>(() => {
    if (
      !serviceDate ||
      !selectedService
    ) {
      return [];
    }

    const result: ScheduleOption[] = [];

    const durationMinutes =
      selectedService.priceType === 'HOUR'
        ? serviceQuantity * 60
        : Number(
            selectedService.durationMinutes
          ) || 60;

    for (
      let minuteOfDay = 0;
      minuteOfDay < 24 * 60;
      minuteOfDay += SCHEDULE_STEP_MINUTES
    ) {
      const hour = Math.floor(
        minuteOfDay / 60
      );

      const minute =
        minuteOfDay % 60;

      const time =
        `${String(hour).padStart(2, '0')}:${String(
          minute
        ).padStart(2, '0')}`;

      const proposedStart =
        new Date(
          `${serviceDate}T${time}:00`
        );

      if (
        Number.isNaN(
          proposedStart.getTime()
        )
      ) {
        continue;
      }

      if (
        proposedStart.getTime() <=
        Date.now()
      ) {
        result.push({
          time,
          available: false,
          reason: 'PAST',
        });

        continue;
      }

      const proposedEnd =
        new Date(
          proposedStart.getTime() +
            (
              durationMinutes +
              TRAVEL_BUFFER_MINUTES
            ) *
              60_000
        );

      const hasConflict =
        busySlots.some((slot) => {
          const busyStart =
            new Date(slot.start);

          const busyEnd =
            new Date(slot.end);

          if (
            Number.isNaN(
              busyStart.getTime()
            ) ||
            Number.isNaN(
              busyEnd.getTime()
            )
          ) {
            return false;
          }

          return (
            proposedStart < busyEnd &&
            proposedEnd > busyStart
          );
        });

      result.push({
        time,
        available: !hasConflict,
        reason: hasConflict
          ? 'BUSY'
          : undefined,
      });
    }

    return result;
  }, [
    serviceDate,
    selectedService,
    busySlots,
    serviceQuantity,
  ]);

const openRequestModal = async (
  service: Service
) => {
  const currentToken =
    localStorage.getItem('token');

  if (!currentToken) {
    navigate('/login', {
      state: {
        returnTo: `/specialists/${id}`,
        action: 'request-service',
        serviceId: service.id,
      },
    });

    return;
  }

if (
  currentRole !== 'CLIENT'
) {
  navigate('/login', {
    state: {
      returnTo: `/specialists/${id}`,
      action: 'request-service',
      serviceId: service.id,
    },
  });

  return;
}

setRequestMessage('');
setRequestError('');
setRequestCoverageError(null);
setCreatedRequestId(null);

setSelectedService(service);
  setServiceMessage('');
  setServiceDate('');
  setServiceTime('');
  setServiceQuantity(1);
  setBusySlots([]);
  setAvailabilityError('');
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
      setServiceDate('');
      setServiceTime('');
      setServiceQuantity(1);
      setBusySlots([]);
      setAvailabilityError('');
      setShowNewAddressForm(false);
      setRequestError('');
      setRequestCoverageError(null);
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
    RESUMEN DE CONTRATACIÓN

    El frontend solo muestra una estimación.
    El backend sigue siendo la fuente de verdad
    para calcular el monto que se cobrará.
  */
  const contractedQuantity =
    selectedService?.priceType === 'HOUR'
      ? serviceQuantity
      : 1;

  const contractedDurationMinutes =
    selectedService
      ? selectedService.priceType === 'HOUR'
        ? serviceQuantity * 60
        : Number(
            selectedService.durationMinutes
          ) || 60
      : 0;

  const baseSubtotal =
    selectedService
      ? Number(
          selectedService.price
        ) * contractedQuantity
      : 0;

  const estimatedClientTotal =
    baseSubtotal * 1.15;

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
      Number(request.serviceId) ===
        Number(serviceId) &&
      request.status !== 'CANCELLED' &&
      request.status !== 'REJECTED' &&
      request.status !== 'COMPLETED'
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

      if (
        selectedService.priceType === 'HOUR' &&
        (
          !Number.isInteger(
            serviceQuantity
          ) ||
          serviceQuantity < 1 ||
          serviceQuantity > 24
        )
      ) {
        setRequestError(
          'Selecciona una cantidad de horas válida.'
        );
        return;
      }

      if (
        !serviceDate ||
        !serviceTime
      ) {
        setRequestError(
          'Selecciona la fecha y hora del servicio.'
        );
        return;
      }

      /*
        El input date/time representa la hora local
        seleccionada por el usuario.

        Al crear Date sin Z, el navegador interpreta
        esa hora en la zona local del dispositivo.
      */
      const localScheduledDate =
        new Date(
          `${serviceDate}T${serviceTime}:00`
        );

      if (
        Number.isNaN(
          localScheduledDate.getTime()
        )
      ) {
        setRequestError(
          'La fecha y hora seleccionadas no son válidas.'
        );
        return;
      }

      if (
        localScheduledDate.getTime() <=
        Date.now()
      ) {
        setRequestError(
          'Selecciona una fecha y hora futura.'
        );
        return;
      }

      const scheduledAt =
        localScheduledDate.toISOString();

      const scheduledTimeZone =
        Intl
          .DateTimeFormat()
          .resolvedOptions()
          .timeZone ||
        'America/Mexico_City';

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

              quantity:
                selectedService.priceType === 'HOUR'
                  ? serviceQuantity
                  : 1,

              scheduledAt,

              scheduledTimeZone,

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

const createdRequest =
  response.data?.request;

if (!createdRequest?.id) {
  throw new Error(
    'No se recibió la solicitud creada.'
  );
}

setCreatedRequestId(
  createdRequest.id
);

await loadMyRequests();

setRequestMessage(
  'Solicitud creada correctamente. Continúa con el pago.'
);
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

        const data =
          requestError.response?.data;

        if (
          data?.code ===
          'SCHEDULE_CONFLICT'
        ) {
          setServiceTime('');

          setRequestError(
            data?.message ||
              'Ese horario acaba de ser ocupado. Selecciona otra hora disponible.'
          );

          if (serviceDate) {
            await loadAvailability(
              serviceDate,
              selectedService
            );
          }

          return;
        }

        const isOutsideServiceArea =
          data?.code ===
            'OUTSIDE_SERVICE_AREA' ||
          (
            requestError.response
              ?.status === 409 &&
            /no presta servicio|fuera de cobertura|fuera de la zona/i.test(
              String(
                data?.message || ''
              )
            )
          );

        if (
          isOutsideServiceArea
        ) {
          setRequestCoverageError({
            code:
              data?.code ||
              'OUTSIDE_SERVICE_AREA',

            message:
              data?.message ||
              'El especialista no presta servicio en la ubicación seleccionada.',

            municipality:
              data?.location?.municipality,

            state:
              data?.location?.state,
          });

          setRequestError('');

          return;
        }

        setRequestError(
          data?.message ||
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
    CONTINUAR AL PAGO

    Solo se ejecuta cuando la solicitud ya fue
    aprobada por FASYN. El importe nunca sale
    del frontend: el backend lo obtiene del
    servicio asociado a la solicitud.
  */
  const handleContinueToPayment =
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

        setCreatingPaymentId(
          requestId
        );

        setRequestError('');
        setRequestMessage('');

        const response =
          await api.post(
            `/payments/request/${requestId}`,
            {},
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        console.log(
          'PAGO MERCADO PAGO:',
          response.data
        );

        /*
          Si el webhook ya confirmó el pago,
          no volvemos a enviar al usuario al
          checkout.
        */
        if (
          response.data?.alreadyPaid
        ) {
          setRequestMessage(
            'Este servicio ya se encuentra pagado.'
          );

          await loadMyRequests();
          return;
        }

        const checkoutUrl =
          response.data?.checkoutUrl;

        if (!checkoutUrl) {
          throw new Error(
            'Mercado Pago no devolvió la URL de pago.'
          );
        }

        /*
          Checkout Pro.

          Usamos location.assign porque queremos
          continuar el flujo en la página segura
          de Mercado Pago.
        */
        window.location.assign(
          checkoutUrl
        );
   } catch (
  paymentError: any
) {
  console.error(
    'ERROR CREANDO PAGO:',
    paymentError.response?.data ||
      paymentError
  );

  const data =
    paymentError.response?.data;

if (
  data?.code ===
  'OUTSIDE_SERVICE_AREA'
) {
  setPaymentCoverageError({
    requestId,

    code:
      data.code,

    message:
      data.message ||
      'La ubicación está fuera de cobertura.',

    municipality:
      data.location?.municipality,

    state:
      data.location?.state,
  });

  setRequestError('');

  return;
}

  setRequestError(
    data?.message ||
      paymentError.message ||
      'No fue posible iniciar el pago.'
  );
}
      finally {
        setCreatingPaymentId(
          null
        );
      }
    };

  /*
    BOTÓN SEGÚN ESTADO
  */
 const [
  selectedRequestDetail,
  setSelectedRequestDetail,
] = useState<ClientServiceRequest | null>(
  null
);

const handleChangeCoverageAddress =
  async () => {
    if (!paymentCoverageError) {
      return;
    }

    const requestId =
      paymentCoverageError.requestId;

    const currentRequest =
      myRequests.find(
        (request) =>
          request.id === requestId
      );

    if (!currentRequest) {
      setPaymentCoverageError(null);
      return;
    }

    const service =
      specialist?.services.find(
        (item) =>
          item.id ===
          currentRequest.serviceId
      );

    if (!service) {
      setPaymentCoverageError(null);
      return;
    }

    try {
      const token =
        localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

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

      await loadMyRequests();

      setPaymentCoverageError(null);

      await openRequestModal(
        service
      );

    } catch (error: any) {
      console.error(
        'ERROR CAMBIANDO DIRECCIÓN:',
        error.response?.data ||
          error
      );

      setPaymentCoverageError(null);

      setRequestError(
        error.response?.data?.message ||
          'No fue posible cambiar la dirección.'
      );
    }
  };
const renderRequestButton = (
  service: Service
) => {
  const existingRequest =
    getActiveRequest(service.id);

  // NO EXISTE SOLICITUD
  if (!existingRequest) {
    return (
      <button
        type="button"
        disabled={
          requestingServiceId === service.id
        }
        onClick={() =>
          openRequestModal(service)
        }
      >
        {requestingServiceId === service.id
          ? 'Enviando...'
          : 'Solicitar'}

        <b>→</b>
      </button>
    );
  }

  const paymentStatus =
    existingRequest.payment?.status;

  /*
    PAGO YA CONFIRMADO +
    SOLICITUD ESPERANDO PROCESARSE
  */
 
/*
  SOLICITUD CREADA PERO NO PAGADA
*/
if (
  existingRequest.status ===
  'PENDING_PAYMENT'
) {
  return (
    <button
      type="button"
      className="public-service-payment"
      disabled={
        creatingPaymentId ===
        existingRequest.id
      }
      onClick={() =>
        handleContinueToPayment(
          existingRequest.id
        )
      }
    >
      {creatingPaymentId ===
      existingRequest.id
        ? 'Preparando pago...'
        : 'Continuar al pago'}

      <b>→</b>
    </button>
  );
}

  /*
    SOLICITUD CREADA PERO NO PAGADA
  */
  if (
    existingRequest.status ===
      'PENDING_ADMIN' &&
    paymentStatus !== 'APPROVED'
  ) {
    return (
      <button
        type="button"
        className="public-service-payment"
        disabled={
          creatingPaymentId ===
          existingRequest.id
        }
        onClick={() =>
          handleContinueToPayment(
            existingRequest.id
          )
        }
      >
        {creatingPaymentId ===
        existingRequest.id
          ? 'Preparando pago...'
          : 'Continuar al pago'}

        <b>→</b>
      </button>
    );
  }

  /*
    ADMIN YA APROBÓ
  */
  if (
  existingRequest.status ===
  'APPROVED'
) {
  return (
    <button
      type="button"
      className="public-service-details"
      onClick={() =>
        setSelectedRequestDetail(
          existingRequest
        )
      }
    >
      Ver detalles

      <b>→</b>
    </button>
  );
}

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
        <b>✓</b>
      </button>
    );
  }

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
        <b>✓</b>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() =>
        openRequestModal(service)
      }
    >
      Solicitar
      <b>→</b>
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
      {requestCoverageError && (
  <div
    className="coverage-modal-overlay"
    role="dialog"
    aria-modal="true"
  >
    <div className="coverage-modal">

      <button
        type="button"
        className="coverage-modal-close"
        onClick={() =>
          setRequestCoverageError(null)
        }
      >
        ×
      </button>

      <div className="coverage-modal-icon">
        📍
      </div>

      <span className="coverage-modal-eyebrow">
        COBERTURA NO DISPONIBLE
      </span>

      <h2>
        Esta dirección está fuera
        de la zona de atención
      </h2>

      <p className="coverage-modal-description">
        {requestCoverageError.message}
      </p>

      {(requestCoverageError.municipality ||
        requestCoverageError.state) && (
        <div className="coverage-modal-location">
          <small>
            UBICACIÓN SELECCIONADA
          </small>

          <strong>
            {[
              requestCoverageError.municipality,
              requestCoverageError.state,
            ]
              .filter(Boolean)
              .join(', ')}
          </strong>
        </div>
      )}

      <p className="coverage-modal-help">
        Selecciona otra dirección para
        continuar con la solicitud.
      </p>

      <div className="coverage-modal-actions">
        <button
          type="button"
          className="coverage-modal-secondary"
          onClick={() =>
            setRequestCoverageError(null)
          }
        >
          Cerrar
        </button>

        <button
          type="button"
          className="coverage-modal-primary"
          onClick={() => {
            setRequestCoverageError(null);
            setSelectedAddressId(null);
            setServiceTime('');
            setRequestError('');
          }}
        >
          Cambiar dirección
          <span>→</span>
        </button>
      </div>
    </div>
  </div>
)}

{paymentCoverageError && (
  <div
    className="coverage-modal-overlay"
    role="dialog"
    aria-modal="true"
  >
    <div className="coverage-modal">

      <button
        type="button"
        className="coverage-modal-close"
        onClick={() =>
          setPaymentCoverageError(null)
        }
      >
        ×
      </button>

      <div className="coverage-modal-icon">
        📍
      </div>

      <span className="coverage-modal-eyebrow">
        COBERTURA NO DISPONIBLE
      </span>

      <h2>
        Esta dirección está fuera
        de la zona de atención
      </h2>

      <p className="coverage-modal-description">
        El especialista no presta servicios
        actualmente en esta ubicación.
      </p>

      {(paymentCoverageError.municipality ||
        paymentCoverageError.state) && (
        <div className="coverage-modal-location">

          <small>
            UBICACIÓN DETECTADA
          </small>

          <strong>
            {[
              paymentCoverageError.municipality,
              paymentCoverageError.state,
            ]
              .filter(Boolean)
              .join(', ')}
          </strong>

        </div>
      )}

      <p className="coverage-modal-help">
        Selecciona otra dirección para
        continuar con el pago.
      </p>

      <div className="coverage-modal-actions">

        <button
          type="button"
          className="coverage-modal-secondary"
          onClick={() =>
            setPaymentCoverageError(null)
          }
        >
          Cerrar
        </button>

        <button
          type="button"
          className="coverage-modal-primary"
          onClick={() =>
            void handleChangeCoverageAddress()
          }
        >
          Cambiar dirección
          <span>→</span>
        </button>

      </div>

    </div>
  </div>
)} 

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
                        Dirección del servicio. ss
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

                    <div className="service-request-schedule">

                      <div className="service-request-section-title compact">
                        <div>
                          <span>
                            02
                          </span>

                          <div>
                            <strong>
                              Fecha y hora
                            </strong>

                            <small>
                              Indica cuándo necesitas
                              que se realice el servicio.
                            </small>
                          </div>
                        </div>
                      </div>

                      {selectedService.priceType === 'HOUR' && (
                        <div className="service-time-block">
                          <div className="service-time-block-header">
                            <div>
                              <label>
                                ¿Cuántas horas necesitas? *
                              </label>

                              <small>
                                El precio se calcula por las horas
                                seleccionadas.
                              </small>
                            </div>

                            <strong>
                              {serviceQuantity}{' '}
                              {serviceQuantity === 1
                                ? 'hora'
                                : 'horas'}
                            </strong>
                          </div>

                          <div className="service-quantity-options">
                            {Array.from(
                              {
                                length: 8,
                              },
                              (
                                _,
                                index
                              ) =>
                                index + 1
                            ).map(
                              (hours) => (
                                <button
                                  key={hours}
                                  type="button"
                                  className={
                                    serviceQuantity ===
                                    hours
                                      ? 'service-quantity-option active'
                                      : 'service-quantity-option'
                                  }
                                  onClick={() => {
                                    setServiceQuantity(
                                      hours
                                    );

                                    setServiceTime(
                                      ''
                                    );

                                    setRequestError(
                                      ''
                                    );
                                  }}
                                >
                                  {hours}h
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      <div className="service-schedule-grid">

                        <div className="service-form-field">
                          <label
                            htmlFor="serviceDate"
                          >
                            Fecha *
                          </label>

                          <input
                            id="serviceDate"
                            className="service-date-input"
                            type="date"
                            value={
                              serviceDate
                            }
                            min={
                              getTodayInputValue()
                            }
                            onClick={(event) => {
                              try {
                                event.currentTarget
                                  .showPicker?.();
                              } catch {
                                // Algunos navegadores abren
                                // el selector de forma nativa.
                              }
                            }}
                            onChange={(
                              event
                            ) => {
                              const value =
                                event.target
                                  .value;

                              setServiceDate(
                                value
                              );

                              setServiceTime(
                                ''
                              );

                              setBusySlots(
                                []
                              );

                              setRequestError(
                                ''
                              );

                              setAvailabilityError(
                                ''
                              );

                              if (value) {
                                void loadAvailability(
                                  value,
                                  selectedService
                                );
                              }
                            }}
                          />
                        </div>

                        <div className="service-form-field">
                          <label
                            htmlFor="serviceTime"
                          >
                            Hora *
                          </label>

                          <div
                            className={
                              !serviceDate ||
                              loadingAvailability ||
                              Boolean(availabilityError)
                                ? 'service-time-options disabled'
                                : 'service-time-options'
                            }
                          >
                            {!serviceDate && (
                              <div className="service-time-empty">
                                Selecciona primero una fecha.
                              </div>
                            )}

                            {serviceDate &&
                              loadingAvailability && (
                                <div className="service-time-empty">
                                  Consultando horarios...
                                </div>
                              )}

                            {serviceDate &&
                              !loadingAvailability &&
                              !availabilityError &&
                              scheduleOptions.map(
                                (slot) => (
                                  <button
                                    key={slot.time}
                                    type="button"
                                    disabled={!slot.available}
                                    className={[
                                      'service-time-option',
                                      serviceTime === slot.time
                                        ? 'active'
                                        : '',
                                      !slot.available
                                        ? 'unavailable'
                                        : '',
                                    ]
                                      .filter(Boolean)
                                      .join(' ')}
                                    onClick={() => {
                                      setServiceTime(
                                        slot.time
                                      );

                                      setRequestError(
                                        ''
                                      );
                                    }}
                                  >
                                    <span>
                                      {slot.time}
                                    </span>

                                    {!slot.available && (
                                      <small>
                                        {slot.reason ===
                                        'PAST'
                                          ? 'Pasó'
                                          : 'Ocupado'}
                                      </small>
                                    )}
                                  </button>
                                )
                              )}
                          </div>

                          {availabilityError && (
                            <small
                              className="service-schedule-error"
                            >
                              {availabilityError}
                            </small>
                          )}
                        </div>

                      </div>

                      <small className="service-schedule-timezone">
                        La hora se enviará usando tu zona horaria actual.
                        El horario considera{' '}
                        {Math.max(
                          1,
                          Math.ceil(
                            contractedDurationMinutes /
                              60
                          )
                        )}{' '}
                        hora(s) de servicio y 1 hora adicional
                        de traslado.
                      </small>

                      <div className="service-request-summary">
                        <div>
                          <small>
                            RESUMEN
                          </small>

                          <strong>
                            {selectedService.priceType === 'HOUR'
                              ? `${serviceQuantity} ${
                                  serviceQuantity === 1
                                    ? 'hora'
                                    : 'horas'
                                }`
                              : selectedService.priceType === 'DAY'
                                ? '1 día'
                                : '1 servicio'}
                          </strong>

                          <span>
                            Base:{' '}
                            {formatPrice(
                              baseSubtotal
                            )}
                          </span>
                        </div>

                        <div className="service-request-summary-price">
                          <strong>
                            {formatPrice(
                              estimatedClientTotal
                            )}
                          </strong>

                          <span>
                            total estimado
                          </span>
                        </div>
                      </div>

                    </div>

                    <div className="service-request-message-field">

                      <div className="service-request-section-title compact">
                        <div>
                          <span>
                            03
                          </span>

                          <div>
                            <strong>
                              Indicaciones
                            </strong>

                            <small>
                              Información adicional para
                              que el especialista pueda llegar.
                            </small>
                          </div>
                        </div>
                      </div>

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
                      latitude={
                        newAddress.latitude
                      }
                      longitude={
                        newAddress.longitude
                      }
                      onChange={(
                        latitude,
                        longitude
                      ) => {
                        setNewAddress(
                          (
                            previous
                          ) => ({
                            ...previous,
                            latitude,
                            longitude,
                          })
                        );

                        setRequestError(
                          ''
                        );
                      }}
                      onAddressResolved={(
                        resolved
                      ) => {
                        setNewAddress(
                          (
                            previous
                          ) => ({
                            ...previous,

                            state:
                              resolved.state ||
                              previous.state,

                            municipality:
                              resolved.municipality ||
                              previous.municipality,

                            neighborhood:
                              resolved.neighborhood ||
                              previous.neighborhood,

                            postalCode:
                              resolved.postalCode ||
                              previous.postalCode,

                            street:
                              resolved.street ||
                              previous.street,

                            exteriorNumber:
                              resolved.exteriorNumber ||
                              previous.exteriorNumber,
                          })
                        );
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
{createdRequestId === null ? (
  <button
    type="button"
    className="primary"
    onClick={
      handleRequestService
    }
    disabled={
      loadingAddresses ||
      !selectedAddressId ||
      !serviceDate ||
      !serviceTime ||
      loadingAvailability ||
      Boolean(availabilityError) ||
      requestingServiceId !==
        null
    }
  >
    {requestingServiceId !==
    null
      ? 'Enviando solicitud...'
      : 'Enviar solccicitud'}

    <span>
      →
    </span>
  </button>
) : (
  <button
    type="button"
    className="primary"
    onClick={() =>
      handleContinueToPayment(
        createdRequestId
      )
    }
    disabled={
      creatingPaymentId ===
      createdRequestId
    }
  >
    {creatingPaymentId ===
    createdRequestId
      ? 'Preparando pago...'
      : 'Continuar al pago'}

    <span>
      →
    </span>
  </button>
)}
              </div>
            )}

          </div>
        </div>

      )}
 {selectedRequestDetail && (
  <div
    className="service-detail-overlay"
    onMouseDown={(event) => {
      if (
        event.target ===
        event.currentTarget
      ) {
        setSelectedRequestDetail(
          null
        );
      }
    }}
  >
    <div className="service-detail-modal">

      <button
        type="button"
        className="service-detail-close"
        onClick={() =>
          setSelectedRequestDetail(
            null
          )
        }
        aria-label="Cerrar"
      >
        ×
      </button>

      <div className="service-detail-top">

        <div className="service-detail-success-icon">
          ✓
        </div>

        <span className="service-detail-eyebrow">
          SERVICIO CONFIRMADO
        </span>

        <h2>
          Tu servicio está solicitado
        </h2>

        <p>
          El pago fue confirmado y tu
          solicitud ya está registrada.
        </p>

      </div>

      <div className="service-detail-service-card">

        <div className="service-detail-service-copy">

          <small>
            SOLICITUD
          </small>

          <strong>
            Solicitud #
            {selectedRequestDetail.id}
          </strong>

          {selectedRequestDetail
            .scheduledAt && (
            <span>
              {new Date(
                selectedRequestDetail
                  .scheduledAt
              ).toLocaleDateString(
                'es-MX',
                {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }
              )}
            </span>
          )}

        </div>

        <div className="service-detail-payment-chip">
          <span>
            ✓
          </span>

          Pagado
        </div>

      </div>

      <div className="service-detail-info-grid">

        <div className="service-detail-info">

          <div className="service-detail-info-icon">
            $
          </div>

          <div>
            <small>
              TOTAL PAGADO
            </small>

            <strong>
              {selectedRequestDetail
                .payment?.amount
                ? Number(
                    selectedRequestDetail
                      .payment.amount
                  ).toLocaleString(
                    'es-MX',
                    {
                      style:
                        'currency',
                      currency:
                        'MXN',
                    }
                  )
                : 'No disponible'}
            </strong>
          </div>

        </div>

        <div className="service-detail-info">

          <div className="service-detail-info-icon">
            ◷
          </div>

          <div>
            <small>
              HORARIO
            </small>

            <strong>
              {selectedRequestDetail
                .scheduledAt
                ? new Date(
                    selectedRequestDetail
                      .scheduledAt
                  ).toLocaleTimeString(
                    'es-MX',
                    {
                      hour:
                        '2-digit',
                      minute:
                        '2-digit',
                    }
                  )
                : 'Por definir'}
            </strong>
          </div>

        </div>

      </div>

      <div className="service-detail-progress">

        <div className="service-detail-progress-line">

          <div className="service-detail-step completed">
            <span>
              ✓
            </span>

            <small>
              Solicitud
            </small>
          </div>

          <div className="service-detail-progress-bar completed" />

          <div className="service-detail-step completed">
            <span>
              ✓
            </span>

            <small>
              Pago
            </small>
          </div>

          <div className="service-detail-progress-bar" />

          <div className="service-detail-step">
            <span>
              3
            </span>

            <small>
              Servicio
            </small>
          </div>

        </div>

      </div>

      {selectedRequestDetail
        .message && (
        <div className="service-detail-notes">

          <small>
            INDICACIONES DEL SERVICIO
          </small>

          <p>
            {selectedRequestDetail
              .message}
          </p>

        </div>
      )}

      <div className="service-detail-footer">

        <button
          type="button"
          className="service-detail-secondary"
          onClick={() =>
            setSelectedRequestDetail(
              null
            )
          }
        >
          Cerrar
        </button>

        <button
          type="button"
          className="service-detail-primary"
          onClick={() =>
            navigate(
              '/client/requests'
            )
          }
        >
          Ir a mis solicitudes

          <span>
            →
          </span>
        </button>

      </div>

    </div>
  </div>
)}
    </div>
  );
};

export default SpecialistProfile;