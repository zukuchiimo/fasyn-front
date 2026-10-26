import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  GoogleMap,
  MarkerF,
  useJsApiLoader,
} from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { api } from '../../api/api';
import './ClientProfile.css';
import './ClientProfileModern.css';
type ClientProfileData = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  hasWhatsApp?: boolean | null;
  whatsapp?: string | null;
  whatsappNumber?: string | null;
  profilePhotoUrl?: string | null;
  active: boolean;
  createdAt: string;
};
type ClientAddress = {
  id: number;
  userId?: number;
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
        1\. Intentamos con Google si está cargado.
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
        2\. Consultamos Nominatim.
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
        3\. Combinamos ambos.
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
  setLocating(false);
  if (error.code === 1) {
    setMapMessage(
      'No diste permiso para usar tu ubicación. Puedes buscar tu dirección o seleccionar el punto manualmente en el mapa.'
    );
    return;
  }
  if (error.code === 2) {
    setMapMessage(
      'No fue posible determinar tu ubicación. Intenta buscar tu dirección manualmente.'
    );
    return;
  }
  if (error.code === 3) {
    setMapMessage(
      'La ubicación tardó demasiado en responder. Puedes buscar tu dirección manualmente.'
    );
    return;
  }
  setMapMessage(
    'No fue posible obtener tu ubicación.'
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
const ClientProfile = () => {
  const navigate = useNavigate();
  const fileInputRef =
    useRef<HTMLInputElement | null>(null);
  const token =
    localStorage.getItem('token');
  const [profile, setProfile] =
    useState<ClientProfileData | null>(null);
  const [name, setName] =
    useState('');
  const [email, setEmail] =
    useState('');
  const [phone, setPhone] =
    useState('');
  const [hasWhatsApp, setHasWhatsApp] = useState<boolean | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [selectedPhoto, setSelectedPhoto] =
    useState<File | null>(null);
  const [previewPhoto, setPreviewPhoto] =
    useState('');
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [error, setError] =
    useState('');
  // Las alertas se cierran automáticamente a los 2 segundos.
  useEffect(() => {
    if (!error) return;
    const timeout = window.setTimeout(() => setError(''), 2000);
    return () => window.clearTimeout(timeout);
  }, [error]);
  const [success, setSuccess] =
    useState('');
  useEffect(() => {
    if (!success) return;
    const timeout = window.setTimeout(() => setSuccess(''), 2000);
    return () => window.clearTimeout(timeout);
  }, [success]);
  const [addresses, setAddresses] =
    useState<ClientAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] =
    useState(false);
  const [showAddressForm, setShowAddressForm] =
    useState(false);
  const [savingAddress, setSavingAddress] =
    useState(false);
  const [newAddress, setNewAddress] =
    useState<NewAddressForm>({
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
  const resolveStoredFileUrl = (fileUrl?: string | null) => {
    if (!fileUrl) return '';
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
    const base = String(api.defaults.baseURL || 'http://localhost:3000/api');
    const origin = base.replace(/\/api\/?$/, '').replace(/\/$/, '');
    const path = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
    return `${origin}${path}`;
  };
  const initials = useMemo(() => {
    return (
      name
        .trim()
        .split(' ')
        .filter(Boolean)
        .map((word) =>
          word.charAt(0)
        )
        .join('')
        .substring(0, 2)
        .toUpperCase() ||
      'CL'
    );
  }, [name]);
  useEffect(() => {
    if (!token) {
      setLoading(false);
      navigate('/login');
      return;
    }
    let mounted = true;
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError('');
        console.log(
          'CARGANDO PERFIL CLIENTE...'
        );
        const response =
          await api.get(
            '/clients/profile',
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
              /*
                Evita que la pantalla se quede
                cargando indefinidamente si el
                backend no responde.
              */
              timeout: 8000,
            }
          );
        if (!mounted) {
          return;
        }
        console.log(
          'PERFIL CLIENTE RESPONSE:',
          response.data
        );
        const data =
          response.data?.profile;
        if (!data) {
          throw new Error(
            'La API no devolvió el perfil del cliente'
          );
        }
        setProfile(data);
        setName(data.name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setHasWhatsApp(typeof data.hasWhatsApp === 'boolean' ? data.hasWhatsApp : (data.whatsapp || data.whatsappNumber ? true : null));
        setWhatsappNumber(data.whatsappNumber || data.whatsapp || '');
console.log('DATA PROFILE PHOTO -------:', data
);
        if (data.profilePhotoUrl) {
          setPreviewPhoto(
            resolveStoredFileUrl(
              data.profilePhotoUrl
            )
          );
        } else {
          setPreviewPhoto('');
        }
      } catch (requestError: any) {
        if (!mounted) {
          return;
        }
        console.error(
          'ERROR CARGANDO PERFIL CLIENTE:',
          requestError.response?.data ||
            requestError
        );
        if (
          requestError.response?.status ===
          401
        ) {
          localStorage.removeItem(
            'token'
          );
          localStorage.removeItem(
            'user'
          );
          setLoading(false);
          navigate('/login');
          return;
        }
        /*
          Como respaldo visual cargamos los datos
          que ya tenemos de la sesión para que la
          pantalla NO se quede atorada.
        */
        const storedUser =
          localStorage.getItem(
            'user'
          );
        if (storedUser) {
          try {
            const sessionUser =
              JSON.parse(
                storedUser
              );
            setName(
              sessionUser?.name ||
                'Cliente'
            );
            setEmail(
              sessionUser?.email ||
                ''
            );
          } catch (
            storageError
          ) {
            console.error(
              'ERROR LEYENDO USUARIO LOCAL:',
              storageError
            );
          }
        }
        if (
          requestError.code ===
          'ECONNABORTED'
        ) {
          setError(
            'El servidor tardó demasiado en responder. Revisa que el backend esté ejecutándose en el puerto 3000.'
          );
        } else {
          setError(
            requestError.response?.data
              ?.message ||
              requestError.message ||
              'No fue posible cargar tu perfil.'
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    loadProfile();
  void loadAddresses();
    return () => {
      mounted = false;
    };
  }, [navigate, token]);
  useEffect(() => {
    return () => {
      if (
        previewPhoto.startsWith(
          'blob:'
        )
      ) {
        URL.revokeObjectURL(
          previewPhoto
        );
      }
    };
  }, [previewPhoto]);
  const handlePhotoChange = (
    event:
      React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];
    if (!file) {
      return;
    }
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setError(
        'La foto debe ser JPG, PNG o WEBP.'
      );
      return;
    }
    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        'La foto no puede superar 5 MB.'
      );
      return;
    }
    if (
      previewPhoto.startsWith(
        'blob:'
      )
    ) {
      URL.revokeObjectURL(
        previewPhoto
      );
    }
    setSelectedPhoto(file);
    setPreviewPhoto(
      URL.createObjectURL(file)
    );
    setError('');
    setSuccess('');
  };
  const loadAddresses = async () => {
    if (!token) {
      setAddresses([]);
      return;
    }
    try {
      setLoadingAddresses(true);
      const response = await api.get(
        '/addresses',
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );
      setAddresses(
        response.data?.addresses || []
      );
    } catch (addressError: any) {
      console.error(
        'ERROR CARGANDO DIRECCIONES:',
        addressError.response?.data ||
          addressError
      );
      setError(
        addressError.response?.data
          ?.message ||
          'No fue posible cargar tus direcciones.'
      );
    } finally {
      setLoadingAddresses(false);
    }
  };
  const handleNewAddressChange = (
    field: keyof NewAddressForm,
    value: string | boolean
  ) => {
    setNewAddress((current) => ({
      ...current,
      [field]: value,
    }));
    setError('');
    setSuccess('');
  };
  const handleSaveAddress = async () => {
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
      setError(
        'Completa todos los campos obligatorios de la dirección.'
      );
      return;
    }
    if (
      newAddress.latitude === null ||
      newAddress.longitude === null
    ) {
      setError(
        'Selecciona la ubicación exacta en el mapa.'
      );
      return;
    }
    try {
      setSavingAddress(true);
      setError('');
      setSuccess('');
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
      setShowAddressForm(false);
      await loadAddresses();
      setSuccess(
        'Dirección guardada correctamente.'
      );
    } catch (addressError: any) {
      console.error(
        'ERROR GUARDANDO DIRECCIÓN:',
        addressError.response?.data ||
          addressError
      );
      setError(
        addressError.response?.data
          ?.message ||
          'No fue posible guardar la dirección.'
      );
    } finally {
      setSavingAddress(false);
    }
  };
  const handleSave = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();
    if (!token) {
      navigate('/login');
      return;
    }
    if (!name.trim()) {
      setError(
        'Ingresa tu nombre.'
      );
      return;
    }
    const normalizedName = name.trim().replace(/\s+/g, ' ');
    const emailAlias = email.trim().split('@')[0].toLowerCase();
    if (normalizedName.split(' ').length < 2 || normalizedName.toLowerCase() === emailAlias) {
      setError('Ingresa tu nombre y apellidos completos.');
      return;
    }
    if (hasWhatsApp === null) {
      setError('Indica si tu número tiene WhatsApp.');
      return;
    }
    if (hasWhatsApp && !whatsappNumber.trim() && !phone.trim()) {
      setError('Ingresa tu número de WhatsApp.');
      return;
    }
    if (!email.trim()) {
      setError(
        'Ingresa tu correo electrónico.'
      );
      return;
    }
  if (!phone.trim()) {
    setError(
      'Ingresa tu teléfono.'
    );
    return;
  }
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const response =
        await api.patch(
          '/clients/profile',
          {
            name:
              name.trim(),
            email:
              email
                .trim()
                .toLowerCase(),
            phone:
              phone.trim(),
            hasWhatsApp,
            whatsappNumber: hasWhatsApp ? (whatsappNumber.trim() || phone.trim()) : null,
          },
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );
      let updatedProfile =
        response.data?.profile;
      if (selectedPhoto) {
        const formData =
          new FormData();
        formData.append(
          'profilePhoto',
          selectedPhoto
        );
        const photoResponse =
          await api.post(
            '/clients/profile/photo',
            formData,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );
        updatedProfile = {
          ...updatedProfile,
          profilePhotoUrl:
            photoResponse.data
              ?.profilePhotoUrl ??
            updatedProfile
              ?.profilePhotoUrl,
        };
        setSelectedPhoto(null);
        if (
          updatedProfile
            ?.profilePhotoUrl
        ) {
          setPreviewPhoto(
            resolveStoredFileUrl(
              updatedProfile
                .profilePhotoUrl
            )
          );
        }
      }
      setProfile(
        updatedProfile
      );
      const storedUser =
        localStorage.getItem(
          'user'
        );
      if (storedUser) {
        try {
          const currentUser =
            JSON.parse(
              storedUser
            );
          localStorage.setItem(
            'user',
            JSON.stringify({
              ...currentUser,
              name:
                updatedProfile?.name ||
                name.trim(),
              email:
                updatedProfile?.email ||
                email
                  .trim()
                  .toLowerCase(),
            })
          );
        } catch (storageError) {
          console.error(
            'ERROR ACTUALIZANDO USUARIO LOCAL:',
            storageError
          );
        }
      }
      setSuccess(
        'Tu perfil se actualizó correctamente.'
      );
    } catch (requestError: any) {
      console.error(
        'ERROR ACTUALIZANDO PERFIL CLIENTE:',
        requestError.response?.data ||
          requestError
      );
      setError(
        requestError.response?.data
          ?.message ||
          'No fue posible actualizar tu perfil.'
      );
    } finally {
      setSaving(false);
    }
  };
const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.replace('/login');
};
  const handlePendingSection = (
    section: string
  ) => {
    alert(
      `${section} estará disponible próximamente.`
    );
  };
  if (loading) {
    return (
      <div className="client-profile-loading">
        <div className="client-profile-spinner" />
        <strong>
          Cargando tu perfil
        </strong>
        <span>
          Estamos consultando tu información.
        </span>
      </div>
    );
  }
  return (
    <div className="client-dashboard fasyn-profile-page">
      {/* SIDEBAR: MISMA ESTRUCTURA DEL DASHBOARD */}
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
            {previewPhoto ? (
              <img
                src={previewPhoto}
                alt={name}
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
              {name || 'Cliente'}
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
    navigate('/client/requests')
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
    navigate('/client/history')
  }
>
  <span>✓</span>
  Historial
</button>
          <button
            type="button"
            className="active"
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
      {/* CONTENIDO: MISMO CONTENEDOR DEL DASHBOARD */}
      <main className="client-main">
        <header className="client-header">
          <div>
            <span className="client-eyebrow">
              PANEL DEL CLIENTE
            </span>
            <h1>
              Mi perfil
            </h1>
            <p>
              Administra tu información personal
              y tu foto de perfil.
            </p>
          </div>
          <button
            type="button"
            className="find-specialist-button"
            onClick={() =>
              navigate('/client')
            }
          >
            <span>←</span>
            Volver al inicio
          </button>
        </header>
        {error && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="Aviso de FASYN"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              background: 'rgba(15, 23, 42, 0.35)',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 420,
                padding: '24px 28px',
                borderRadius: 16,
                background: '#ffffff',
                color: '#1e293b',
                boxShadow: '0 18px 55px rgba(15, 23, 42, 0.22)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 30, marginBottom: 10 }}>⚠️</div>
              <strong style={{ display: 'block', marginBottom: 8, fontSize: 18 }}>Revisa la información</strong>
              <p style={{ margin: 0, lineHeight: 1.5 }}>{error}</p>
            </div>
          </div>
        )}
        {success && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              background: 'rgba(15, 23, 42, 0.35)',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 420,
                padding: '24px 28px',
                borderRadius: 16,
                background: '#ffffff',
                color: '#1e293b',
                boxShadow: '0 18px 55px rgba(15, 23, 42, 0.22)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 30, marginBottom: 10 }}>✅</div>
              <strong style={{ display: 'block', marginBottom: 8, fontSize: 18 }}>¡Listo!</strong>
              <p style={{ margin: 0, lineHeight: 1.5 }}>{success}</p>
            </div>
          </div>
        )}
        <form
          className="client-profile-grid"
          onSubmit={
            handleSave
          }
        >
          {/* FOTO */}
          <section className="client-panel client-profile-photo-card">
            <div className="client-panel-header">
              <div>
                <span className="client-section-eyebrow">
                  PERFIL
                </span>
                <h2>
                  Foto de perfil
                </h2>
                <p>
                  Personaliza tu cuenta con
                  una fotografía.
                </p>
              </div>
            </div>
            <div className="client-profile-photo-body">
              <div className="client-profile-photo">
                {previewPhoto ? (
                  <img
                    src={previewPhoto}
                    alt={name}
                  />
                ) : (
                  initials
                )}
              </div>
              <h3>
                {name || 'Cliente'}
              </h3>
              <span className="client-profile-role">
                Cliente FASYN
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={
                  handlePhotoChange
                }
                hidden
              />
              <button
                type="button"
                className="client-profile-photo-button"
                onClick={() =>
                  fileInputRef.current
                    ?.click()
                }
              >
                {previewPhoto
                  ? 'Cambiar foto'
                  : 'Agregar foto'}
              </button>
              <small>
                JPG, PNG o WEBP. Máximo 5 MB.
              </small>
              <div className="client-profile-status">
                <span>
                  ESTADO DE CUENTA
                </span>
                <strong>
                  <i />
                  {profile?.active
                    ? 'Activa'
                    : 'Inactiva'}
                </strong>
              </div>
            </div>
          </section>
          {/* DATOS */}
          <section className="client-panel client-profile-data-card">
            <div className="client-panel-header">
              <div>
                <span className="client-section-eyebrow">
                  INFORMACIÓN
                </span>
                <h2>
                  Datos personales
                </h2>
                <p>
                  Mantén actualizados tus datos
                  de contacto.
                </p>
              </div>
            </div>
            <div className="client-profile-form">
              <label>
                <span>
                  Nombre completo
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  placeholder="Nombre completo"
                  required
                />
              </label>
              <label>
                <span>
                  Correo electrónico
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="correo@ejemplo.com"
                  required
                />
              </label>
              <label>
                <span>
                  Teléfono
                </span>
                <input
                  type="tel"
                  value={phone}
maxLength={10}
                  onChange={(event) =>
                    setPhone(
                      event.target.value
                    )
                  }
                  placeholder="55 1234 5678"
                />
              </label>
              <div className="client-profile-whatsapp" style={{ gridColumn: '1 / -1', display: 'grid', gap: 10, padding: 16, border: '1px solid #e2e8f0', borderRadius: 12 }}>
                <strong>¿Este teléfono tiene WhatsApp? *</strong>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="radio" name="hasWhatsApp" checked={hasWhatsApp === true} onChange={() => setHasWhatsApp(true)} /> Sí
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="radio" name="hasWhatsApp" checked={hasWhatsApp === false} onChange={() => { setHasWhatsApp(false); setWhatsappNumber(''); }} /> No
                  </label>
                </div>
                {hasWhatsApp && (
                  <label>
                    <span>Número de WhatsApp</span>
                    <input type="tel" inputMode="numeric" maxLength={10} value={whatsappNumber} onChange={(event) => setWhatsappNumber(event.target.value.replace(/\D/g, ''))} placeholder="Dejar vacío si es el mismo teléfono" />
                  </label>
                )}
              </div>
              <label>
                <span>
                  Tipo de cuenta
                </span>
                <input
                  type="text"
                  value="Cliente"
                  disabled
                />
              </label>
            </div>
            <div className="client-profile-info-row">
              <div>
                <span>
                  MIEMBRO DESDE
                </span>
                <strong>
                  {profile?.createdAt
                    ? new Date(
                        profile.createdAt
                      ).toLocaleDateString(
                        'es-MX',
                        {
                          year:
                            'numeric',
                          month:
                            'long',
                          day:
                            'numeric',
                        }
                      )
                    : 'No disponible'}
                </strong>
              </div>
              <div>
                <span>
                  CUENTA
                </span>
                <strong>
                  Cliente FASYN
                </strong>
              </div>
            </div>
            <div className="client-profile-actions">
              <button
                type="button"
                className="client-profile-cancel"
                disabled={saving}
                onClick={() =>
                  navigate('/client')
                }
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="client-profile-save"
                disabled={saving}
              >
                {saving
                  ? 'Guardando...'
                  : 'Guardar cambios'}
              </button>
            </div>
          </section>
        {/* DIRECCIONES DE SERVICIO */}
        <section className="client-panel client-profile-address-card">
          <div className="client-panel-header">
            <div>
              <span className="client-section-eyebrow">
                DIRECCIONES
              </span>
              <h2>
                Direcciones de servicio
              </h2>
              <p>
                Administra las ubicaciones donde solicitarás tus servicios.
              </p>
            </div>
            <button
              type="button"
              className="client-profile-save"
              onClick={() =>
                setShowAddressForm(
                  (current) => !current
                )
              }
            >
              {showAddressForm
                ? 'Cancelar'
                : '+ Agregar dirección'}
            </button>
          </div>
          {loadingAddresses ? (
            <div className="client-profile-message">
              Cargando direcciones...
            </div>
          ) : addresses.length > 0 ? (
            <div className="client-address-list">
              {addresses.map(
                (address) => (
                  <article
                    key={address.id}
                    className="client-address-card"
                  >
                    <div className="client-address-card-header">
                      <div className="fasyn-address-heading">
                        <span className="fasyn-address-icon" aria-hidden="true">⌂</span>
                        <div className="fasyn-address-heading-copy">
                          <strong>{address.label}</strong>
                          <span className="fasyn-address-subtitle">Dirección de servicio</span>
                        </div>
                      </div>
                      {address.isDefault && (
                        <span className="client-address-default">✓ Principal</span>
                      )}
                    </div>
                    <div className="fasyn-address-details">
                      <span className="fasyn-address-field-label">UBICACIÓN</span>
                      <p className="fasyn-address-street">
                        {address.street} {address.exteriorNumber}
                        {address.interiorNumber ? `, Int. ${address.interiorNumber}` : ''}
                      </p>
                      <p className="fasyn-address-location">
                        {[address.neighborhood, address.municipality, address.state]
                          .filter(Boolean).join(', ')}
                      </p>
                      <span className="fasyn-address-postal">C.P. {address.postalCode}</span>
                    </div>
                    {address.references && (
                      <div className="fasyn-address-references">
                        <span className="fasyn-address-field-label">REFERENCIAS</span>
                        <p>{address.references}</p>
                      </div>
                    )}
                  </article>
                )
              )}
            </div>
          ) : (
            <div className="client-profile-message">
              Aún no tienes direcciones de servicio.
              Agrega al menos una antes de solicitar un servicio.
            </div>
          )}
          {showAddressForm && (
            <div className="client-profile-address-form">
              <div className="client-profile-form">
                <label>
                  <span>
                    Nombre de la dirección *
                  </span>
                  <input
                    type="text"
                    value={newAddress.label}
                    onChange={(event) =>
                      handleNewAddressChange(
                        'label',
                        event.target.value
                      )
                    }
                    placeholder="Casa, trabajo..."
                  />
                </label>
                <label>
                  <span>
                    Estado *
                  </span>
                  <input
                    type="text"
                    value={newAddress.state}
                    onChange={(event) =>
                      handleNewAddressChange(
                        'state',
                        event.target.value
                      )
                    }
                    placeholder="Estado"
                  />
                </label>
                <label>
                  <span>
                    Municipio / Alcaldía *
                  </span>
                  <input
                    type="text"
                    value={
                      newAddress.municipality
                    }
                    onChange={(event) =>
                      handleNewAddressChange(
                        'municipality',
                        event.target.value
                      )
                    }
                    placeholder="Municipio o alcaldía"
                  />
                </label>
                <label>
                  <span>
                    Colonia *
                  </span>
                  <input
                    type="text"
                    value={
                      newAddress.neighborhood
                    }
                    onChange={(event) =>
                      handleNewAddressChange(
                        'neighborhood',
                        event.target.value
                      )
                    }
                    placeholder="Colonia"
                  />
                </label>
                <label>
                  <span>
                    Código postal *
                  </span>
                  <input
                    type="text"
                    value={
                      newAddress.postalCode
                    }
                    onChange={(event) =>
                      handleNewAddressChange(
                        'postalCode',
                        event.target.value
                      )
                    }
                    placeholder="C.P."
                  />
                </label>
                <label>
                  <span>
                    Calle *
                  </span>
                  <input
                    type="text"
                    value={newAddress.street}
                    onChange={(event) =>
                      handleNewAddressChange(
                        'street',
                        event.target.value
                      )
                    }
                    placeholder="Calle"
                  />
                </label>
                <label>
                  <span>
                    Número exterior *
                  </span>
                  <input
                    type="text"
                    value={
                      newAddress.exteriorNumber
                    }
                    onChange={(event) =>
                      handleNewAddressChange(
                        'exteriorNumber',
                        event.target.value
                      )
                    }
                    placeholder="Número exterior"
                  />
                </label>
                <label>
                  <span>
                    Número interior
                  </span>
                  <input
                    type="text"
                    value={
                      newAddress.interiorNumber
                    }
                    onChange={(event) =>
                      handleNewAddressChange(
                        'interiorNumber',
                        event.target.value
                      )
                    }
                    placeholder="Número interior"
                  />
                </label>
                <label>
                  <span>
                    Referencias
                  </span>
                  <input
                    type="text"
                    value={
                      newAddress.references
                    }
                    onChange={(event) =>
                      handleNewAddressChange(
                        'references',
                        event.target.value
                      )
                    }
                    placeholder="Entre calles, color de fachada..."
                  />
                </label>
              </div>
              <div className="client-address-map-section">
                <div className="client-address-map-heading">
                  <span className="client-section-eyebrow">
                    UBICACIÓN EXACTA
                  </span>
                  <h3>Selecciona la dirección en el mapa</h3>
                  <p>
                    Busca una dirección, usa tu ubicación o mueve el pin.
                    Los datos se completan automáticamente y después puedes
                    corregirlos manualmente antes de guardar.
                  </p>
                </div>
                <AddressMapPicker
                  latitude={newAddress.latitude}
                  longitude={newAddress.longitude}
                  onChange={(latitude, longitude) => {
                    setNewAddress((previous) => ({
                      ...previous,
                      latitude,
                      longitude,
                    }));
                    setError('');
                  }}
                  onAddressResolved={(resolved) => {
                    setNewAddress((previous) => ({
                      ...previous,
                      state:
                        resolved.state || previous.state,
                      municipality:
                        resolved.municipality || previous.municipality,
                      neighborhood:
                        resolved.neighborhood || previous.neighborhood,
                      postalCode:
                        resolved.postalCode || previous.postalCode,
                      street:
                        resolved.street || previous.street,
                      exteriorNumber:
                        resolved.exteriorNumber || previous.exteriorNumber,
                    }));
                  }}
                />
                <div className="client-address-coordinates">
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
              <label className="client-address-default-check">
                <input
                  type="checkbox"
                  checked={
                    newAddress.isDefault
                  }
                  onChange={(event) =>
                    handleNewAddressChange(
                      'isDefault',
                      event.target.checked
                    )
                  }
                />
                <span>
                  Usar como dirección predeterminada
                </span>
              </label>
              <div className="client-profile-actions">
                <button
                  type="button"
                  className="client-profile-cancel"
                  disabled={savingAddress}
                  onClick={() =>
                    setShowAddressForm(false)
                  }
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="client-profile-save"
                  disabled={savingAddress}
                  onClick={handleSaveAddress}
                >
                  {savingAddress
                    ? 'Guardando...'
                    : 'Guardar dirección'}
                </button>
              </div>
            </div>
          )}
        </section>
</form>
      </main>
    </div>
  );
};
export default ClientProfile;