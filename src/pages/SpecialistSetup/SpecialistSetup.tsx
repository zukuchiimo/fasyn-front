import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { api } from '../../api/api';
import logo from '../../assets/logo.png';

import './SpecialistSetup.css';

interface Category {
  id: number;
  name: string;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface ServiceArea {
  stateCode: string;
  stateName: string;
  municipalityCode: string;
  municipalityName: string;
}

interface ReverseAddress {
  state?: string;
  municipality?: string;
  city_district?: string;
  borough?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  suburb?: string;
  neighbourhood?: string;
  quarter?: string;
  postcode?: string;
  road?: string;
  house_number?: string;
}

const DEFAULT_MAP_CENTER: [number, number] = [23.6345, -102.5528];

const MUNICIPALITIES_GEOJSON_BASE_URL =
  'https://raw.githubusercontent.com/MacWilliXD/INEGI-geojson/main/geojson_descargas';

const getMunicipalitiesGeoJsonUrl = (stateCode: string) =>
  `${MUNICIPALITIES_GEOJSON_BASE_URL}/AGEM_${stateCode}.geojson`;

const STATE_NAMES: Record<string, string> = {
  '01': 'Aguascalientes',
  '02': 'Baja California',
  '03': 'Baja California Sur',
  '04': 'Campeche',
  '05': 'Coahuila',
  '06': 'Colima',
  '07': 'Chiapas',
  '08': 'Chihuahua',
  '09': 'Ciudad de México',
  '10': 'Durango',
  '11': 'Guanajuato',
  '12': 'Guerrero',
  '13': 'Hidalgo',
  '14': 'Jalisco',
  '15': 'Estado de México',
  '16': 'Michoacán',
  '17': 'Morelos',
  '18': 'Nayarit',
  '19': 'Nuevo León',
  '20': 'Oaxaca',
  '21': 'Puebla',
  '22': 'Querétaro',
  '23': 'Quintana Roo',
  '24': 'San Luis Potosí',
  '25': 'Sinaloa',
  '26': 'Sonora',
  '27': 'Tabasco',
  '28': 'Tamaulipas',
  '29': 'Tlaxcala',
  '30': 'Veracruz',
  '31': 'Yucatán',
  '32': 'Zacatecas',
};

const normalizeStateName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const STATE_NAME_TO_CODE: Record<string, string> = Object.entries(
  STATE_NAMES
).reduce<Record<string, string>>((accumulator, [code, name]) => {
  accumulator[normalizeStateName(name)] = code;
  return accumulator;
}, {});

STATE_NAME_TO_CODE['mexico'] = '15';
STATE_NAME_TO_CODE['estado de mexico'] = '15';
STATE_NAME_TO_CODE['ciudad de mexico'] = '09';
STATE_NAME_TO_CODE['distrito federal'] = '09';
STATE_NAME_TO_CODE['coahuila de zaragoza'] = '05';
STATE_NAME_TO_CODE['michoacan de ocampo'] = '16';
STATE_NAME_TO_CODE['veracruz de ignacio de la llave'] = '30';

const getStateCodeFromName = (stateName?: string) => {
  if (!stateName) {
    return '';
  }

  return STATE_NAME_TO_CODE[normalizeStateName(stateName)] || '';
};

const AVAILABLE_AREA_STYLE = {
  color: '#3157d5',
  weight: 1.35,
  fillColor: '#5c7cff',
  fillOpacity: 0.34,
};

const SELECTED_AREA_STYLE = {
  color: '#15803d',
  weight: 2.25,
  fillColor: '#22c55e',
  fillOpacity: 0.62,
};

const getFeatureServiceArea = (feature: any): ServiceArea | null => {
  const properties = feature?.properties || {};

  const fullCode = String(
    properties.cvegeo ||
      properties.CVEGEO ||
      properties.CVE_GEO ||
      ''
  ).trim();

  const stateCodeRaw = String(
    properties.cve_agee ||
      properties.CVE_ENT ||
      properties.state_code ||
      (fullCode.length >= 5 ? fullCode.slice(0, 2) : '')
  ).trim();

  const municipalityCodeRaw = String(
    properties.cve_agem ||
      properties.CVE_MUN ||
      properties.mun_code ||
      (fullCode.length >= 5 ? fullCode.slice(2, 5) : '')
  ).trim();

  const stateCode = stateCodeRaw
    ? stateCodeRaw.padStart(2, '0')
    : '';

  const municipalityCode = municipalityCodeRaw
    ? municipalityCodeRaw.padStart(3, '0')
    : '';

  const municipalityName = String(
    properties.nom_agem ||
      properties.NOM_MUN ||
      properties.NOMGEO ||
      properties.mun_name ||
      properties.NAME_2 ||
      properties.municipality ||
      properties.name ||
      ''
  ).trim();

  const stateName = String(
    properties.nom_agee ||
      properties.NOM_ENT ||
      properties.state_name ||
      STATE_NAMES[stateCode] ||
      ''
  ).trim();

  if (
    !stateCode ||
    !municipalityCode ||
    !municipalityName ||
    !stateName
  ) {
    return null;
  }

  return {
    stateCode,
    stateName,
    municipalityCode,
    municipalityName,
  };
};

const reverseGeocode = async (latitude: number, longitude: number) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=es`
  );

  if (!response.ok) {
    throw new Error('No fue posible identificar la ubicación seleccionada.');
  }

  return response.json();
};

const getMunicipalityName = (address: ReverseAddress) =>
  address.municipality ||
  address.city_district ||
  address.borough ||
  address.city ||
  address.town ||
  address.village ||
  address.county ||
  '';

const FitCurrentStateMap = ({
  position,
  stateCode,
  geoJson,
}: {
  position: Coordinates | null;
  stateCode: string;
  geoJson: any | null;
}) => {
  const map = useMap();
  const fittedState = useRef<string>('');

  useEffect(() => {
    if (!stateCode || fittedState.current === stateCode) {
      return;
    }

    const stateFeatures = (geoJson?.features || []).filter(
      (feature: any) =>
        getFeatureServiceArea(feature)?.stateCode === stateCode
    );

    if (stateFeatures.length > 0) {
      const stateLayer = L.geoJSON({
        type: 'FeatureCollection',
        features: stateFeatures,
      } as any);

      const bounds = stateLayer.getBounds();

      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [22, 22],
          maxZoom: stateCode === '09' ? 11 : 10,
        });

        fittedState.current = stateCode;
        return;
      }
    }

    if (position) {
      map.setView(
        [position.latitude, position.longitude],
        stateCode === '09' ? 11 : 10
      );
      fittedState.current = stateCode;
    }
  }, [geoJson, map, position, stateCode]);

  return null;
};

const TOTAL_STEPS = 6;

const SpecialistSetup = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [currentStateCode, setCurrentStateCode] = useState('');
  const [locating, setLocating] = useState(false);
  const [municipalitiesGeoJson, setMunicipalitiesGeoJson] = useState<any | null>(null);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
  const [mapError, setMapError] = useState('');
  const [locationError, setLocationError] = useState('');

  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    phone: '',
    description: '',
    experience: '',
    state: '',
    municipality: '',
    neighborhood: '',
    postalCode: '',
    address: '',
  });

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);

        const response = await api.get('/categories');

        setCategories(response.data.categories || []);
      } catch (error) {
        console.error('ERROR CARGANDO CATEGORÍAS:', error);

        setError(
          'No fue posible cargar las especialidades disponibles.'
        );
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));

    setError('');
  };

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories((current) => {
      if (current.includes(categoryId)) {
        return current.filter((id) => id !== categoryId);
      }

      return [...current, categoryId];
    });

    setError('');
  };

  const getCurrentLocation = () => {
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError(
        'Tu navegador no permite obtener la ubicación actual.'
      );
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setCurrentLocation(coordinates);

        try {
          const result = await reverseGeocode(
            coordinates.latitude,
            coordinates.longitude
          );

          const address: ReverseAddress = result.address || {};
          const municipality = getMunicipalityName(address);
          const detectedStateCode = getStateCodeFromName(address.state);

          if (detectedStateCode) {
            setCurrentStateCode(detectedStateCode);
          }
          const fullAddress = [
            address.road,
            address.house_number,
          ]
            .filter(Boolean)
            .join(' ');

          setForm((current) => ({
            ...current,
            state: address.state || current.state,
            municipality: municipality || current.municipality,
            neighborhood:
              address.neighbourhood ||
              address.suburb ||
              address.quarter ||
              current.neighborhood,
            postalCode: address.postcode || current.postalCode,
            address: fullAddress || result.display_name || current.address,
          }));
        } catch (locationLookupError) {
          console.error(
            'ERROR IDENTIFICANDO UBICACIÓN ACTUAL:',
            locationLookupError
          );

          setLocationError(
            'Obtuvimos tus coordenadas, pero no pudimos identificar la dirección exacta.'
          );
        } finally {
          setLocating(false);
        }
      },
      (geolocationError) => {
        console.error('ERROR GEOLOCATION:', geolocationError);
        setLocating(false);

        if (geolocationError.code === geolocationError.PERMISSION_DENIED) {
          setLocationError(
            'Necesitamos permiso de ubicación para mostrar tu posición actual en el mapa.'
          );
          return;
        }

        setLocationError(
          'No fue posible obtener tu ubicación actual. Inténtalo nuevamente.'
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  };

  useEffect(() => {
    if (step === 2 && !currentLocation && !locating) {
      getCurrentLocation();
    }
    // Solo queremos solicitarla al entrar al paso 2 si todavía no existe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step !== 2) {
      return;
    }

    let cancelled = false;

    const loadStateMunicipalities = async (stateCode: string) => {
      const response = await fetch(
        getMunicipalitiesGeoJsonUrl(stateCode)
      );

      if (!response.ok) {
        throw new Error(
          `No fue posible cargar las zonas del estado ${stateCode}.`
        );
      }

      const data = await response.json();
      return Array.isArray(data?.features) ? data.features : [];
    };

    const loadMunicipalities = async () => {
      try {
        setLoadingMunicipalities(true);
        setMapError('');

        // Primero cargamos el estado actual para que el mapa sea utilizable
        // rápidamente y pueda hacer zoom sobre esa entidad.
        const initialStateCode = currentStateCode || '09';
        const initialFeatures = await loadStateMunicipalities(
          initialStateCode
        );

        if (cancelled) {
          return;
        }

        let accumulatedFeatures = [...initialFeatures];

        setMunicipalitiesGeoJson({
          type: 'FeatureCollection',
          features: [...accumulatedFeatures],
        });

        setLoadingMunicipalities(false);

        // Después cargamos el resto de México por bloques para no bloquear
        // la interacción del mapa mientras llega toda la información.
        const remainingStateCodes = Object.keys(STATE_NAMES).filter(
          (code) => code !== initialStateCode
        );

        const batchSize = 4;

        for (
          let index = 0;
          index < remainingStateCodes.length;
          index += batchSize
        ) {
          if (cancelled) {
            return;
          }

          const batch = remainingStateCodes.slice(
            index,
            index + batchSize
          );

          const results = await Promise.all(
            batch.map(async (stateCode) => {
              try {
                return await loadStateMunicipalities(stateCode);
              } catch (stateLoadError) {
                console.warn(
                  `No se pudieron cargar los municipios del estado ${stateCode}:`,
                  stateLoadError
                );
                return [];
              }
            })
          );

          accumulatedFeatures = [
            ...accumulatedFeatures,
            ...results.flat(),
          ];

          if (!cancelled) {
            setMunicipalitiesGeoJson({
              type: 'FeatureCollection',
              features: [...accumulatedFeatures],
            });
          }
        }
      } catch (mapLoadError) {
        console.error('ERROR CARGANDO MUNICIPIOS:', mapLoadError);

        if (!cancelled) {
          setLoadingMunicipalities(false);
          setMapError(
            'No fue posible cargar las zonas del mapa. Revisa tu conexión e inténtalo nuevamente.'
          );
        }
      }
    };

    void loadMunicipalities();

    return () => {
      cancelled = true;
    };
  }, [step, currentStateCode]);

  const isAreaSelected = (area: ServiceArea) =>
    serviceAreas.some(
      (item) =>
        item.stateCode === area.stateCode &&
        item.municipalityCode === area.municipalityCode
    );

  const removeServiceArea = (index: number) => {
    setServiceAreas((current) =>
      current.filter(
        (_, currentIndex) => currentIndex !== index
      )
    );

    setError('');
  };

  const validateStep = () => {
    setError('');

    if (step === 1) {
      if (!form.phone.trim()) {
        setError('Ingresa tu número de teléfono.');
        return false;
      }

      if (!form.description.trim()) {
        setError('Agrega una descripción de tu experiencia profesional.');
        return false;
      }

      if (!form.experience) {
        setError('Indica tus años de experiencia.');
        return false;
      }
    }

    if (step === 2) {
      if (!currentLocation) {
        setError(
          'Obtén tu ubicación actual antes de continuar.'
        );
        return false;
      }

      if (serviceAreas.length === 0) {
        setError(
          'Selecciona en el mapa al menos una zona donde prestas servicio.'
        );
        return false;
      }
    }

    if (step === 3 && !profilePhoto) {
      setError('Selecciona una fotografía de perfil.');
      return false;
    }

    if (step === 4 && (!idFront || !idBack)) {
      setError(
        'Selecciona el frente y reverso de tu identificación.'
      );
      return false;
    }

    if (step === 5 && selectedCategories.length === 0) {
      setError('Selecciona al menos una especialidad.');
      return false;
    }

    return true;
  };

  const nextStep = () => {
    if (!validateStep()) {
      return;
    }

    setStep((current) =>
      Math.min(current + 1, TOTAL_STEPS)
    );

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const previousStep = () => {
    setError('');

    setStep((current) =>
      Math.max(current - 1, 1)
    );

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const finishSetup = async () => {
    try {
      setSaving(true);
      setError('');

      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      // 1. Guardar datos del perfil profesional
      const profileResponse = await api.post(
        '/specialists/profile',
        form,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(
        'PERFIL GUARDADO:',
        profileResponse.data
      );

      // 2. Guardar especialidades seleccionadas
      const specialtiesResponse = await api.put(
        '/specialists/specialties',
        {
          categoryIds: selectedCategories,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(
        'ESPECIALIDADES GUARDADAS:',
        specialtiesResponse.data
      );

      // 3. Guardar zonas donde presta servicio
      for (const area of serviceAreas) {
        await api.post(
          '/specialists/me/service-areas',
          {
            stateCode: area.stateCode,
            stateName: area.stateName,
            municipalityCode: area.municipalityCode,
            municipalityName: area.municipalityName,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }

      console.log(
        'ZONAS DE SERVICIO GUARDADAS:',
        serviceAreas
      );

      // 4. Ir al panel del especialista
      navigate('/specialist');
    } catch (error: any) {
      console.error(
        'ERROR GUARDANDO PERFIL:',
        error.response?.data || error
      );

      setError(
        error.response?.data?.message ||
          'No fue posible guardar tu perfil. Inténtalo nuevamente.'
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedCategoryNames = categories
    .filter((category) =>
      selectedCategories.includes(category.id)
    )
    .map((category) => category.name);

  return (
    <div className="specialist-setup">

      <header className="setup-header">

        <Link to="/" className="setup-logo">
          <img src={logo} alt="FASYN" />
        </Link>

        <div className="setup-header-info">
          <span>PERFIL PROFESIONAL</span>
          <p>Configuración de especialista</p>
        </div>

      </header>

      <main className="setup-layout">

        <aside className="setup-sidebar">

          <div className="setup-sidebar-content">

            <span className="setup-sidebar-label">
              COMIENZA EN FASYN
            </span>

            <h2>
              Crea un perfil que genere confianza.
            </h2>

            <p>
              Completa tu información para que los clientes
              conozcan tu experiencia, ubicación y los servicios
              que puedes realizar.
            </p>

            <div className="setup-steps">

              <div className={step === 1 ? 'setup-step active' : step > 1 ? 'setup-step completed' : 'setup-step'}>
                <span>01</span>
                <div>
                  <strong>Información profesional</strong>
                  <p>Experiencia y contacto</p>
                </div>
              </div>

              <div className={step === 2 ? 'setup-step active' : step > 2 ? 'setup-step completed' : 'setup-step'}>
                <span>02</span>
                <div>
                  <strong>Zona de trabajo</strong>
                  <p>Ubicación y cobertura</p>
                </div>
              </div>

              <div className={step === 3 ? 'setup-step active' : step > 3 ? 'setup-step completed' : 'setup-step'}>
                <span>03</span>
                <div>
                  <strong>Fotografía</strong>
                  <p>Imagen de tu perfil</p>
                </div>
              </div>

              <div className={step === 4 ? 'setup-step active' : step > 4 ? 'setup-step completed' : 'setup-step'}>
                <span>04</span>
                <div>
                  <strong>Identidad</strong>
                  <p>Verificación del especialista</p>
                </div>
              </div>

              <div className={step === 5 ? 'setup-step active' : step > 5 ? 'setup-step completed' : 'setup-step'}>
                <span>05</span>
                <div>
                  <strong>Especialidades</strong>
                  <p>Servicios que puedes realizar</p>
                </div>
              </div>

              <div className={step === 6 ? 'setup-step active' : 'setup-step'}>
                <span>06</span>
                <div>
                  <strong>Confirmación</strong>
                  <p>Revisa tu información</p>
                </div>
              </div>

            </div>

          </div>

        </aside>

        <section className="setup-main">

          <div className="setup-main-content">

            <div className="setup-progress-header">

              <div>
                <span>
                  PASO {step} DE {TOTAL_STEPS}
                </span>

                <strong>
                  {Math.round((step / TOTAL_STEPS) * 100)}%
                </strong>
              </div>

              <div className="setup-progress">
                <div
                  className="setup-progress-value"
                  style={{
                    width: `${(step / TOTAL_STEPS) * 100}%`,
                  }}
                />
              </div>

            </div>

            {step === 1 && (
              <section className="setup-card">

                <div className="setup-title">
                  <span>INFORMACIÓN PROFESIONAL</span>

                  <h1>Cuéntanos sobre tu trabajo</h1>

                  <p>
                    Esta información será visible para los clientes
                    que visiten tu perfil.
                  </p>
                </div>

                <div className="setup-form">

                  <label>
                    <span>Teléfono</span>

                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      maxLength={10}
                      onChange={handleChange}
                      placeholder="55 1234 5678"
                    />
                  </label>

                  <label>
                    <span>Descripción profesional</span>

                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      placeholder="Ej. Carpintero con experiencia en fabricación, reparación e instalación de muebles..."
                    />

                    <small>
                      Describe tus habilidades y el tipo de trabajos
                      que realizas.
                    </small>
                  </label>

                  <label>
                    <span>Años de experiencia</span>

                    <input
                      type="number"
                      min="0"
                      name="experience"
                      value={form.experience}
                      onChange={handleChange}
                      placeholder="Ej. 5"
                    />
                  </label>

                </div>

              </section>
            )}

            {step === 2 && (
              <section className="setup-card">

                <div className="setup-title">
                  <span>UBICACIÓN Y COBERTURA</span>

                  <h1>Define dónde trabajas</h1>

                  <p>
                    Primero obtenemos tu ubicación actual. Después,
                    selecciona directamente en el mapa los municipios
                    o alcaldías donde estás disponible para trabajar.
                  </p>
                </div>

                <div className="current-location-card">
                  <div className="current-location-copy">
                    <span className="location-eyebrow">TU UBICACIÓN ACTUAL</span>

                    {currentLocation ? (
                      <>
                        <strong>
                          {form.municipality || 'Ubicación detectada'}
                          {form.state && `, ${form.state}`}
                        </strong>

                        <p>
                          {form.neighborhood && `${form.neighborhood} · `}
                          {form.postalCode && `C.P. ${form.postalCode}`}
                        </p>

                        {form.address && (
                          <small>{form.address}</small>
                        )}
                      </>
                    ) : (
                      <>
                        <strong>Aún no tenemos tu ubicación</strong>
                        <p>
                          Usa tu ubicación para centrar el mapa cerca de ti.
                        </p>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    className="location-button"
                    onClick={getCurrentLocation}
                    disabled={locating}
                  >
                    {locating
                      ? 'Obteniendo ubicación...'
                      : currentLocation
                        ? 'Actualizar ubicación'
                        : 'Usar mi ubicación actual'}
                  </button>
                </div>

                {locationError && (
                  <div className="location-warning">
                    {locationError}
                  </div>
                )}

                <div className="coverage-map-header">
                  <div>
                    <span>COBERTURA DE SERVICIO</span>
                    <h2>Selecciona tus zonas en el mapa</h2>
                    <p>
                      Las alcaldías y municipios disponibles aparecen en azul.
                      Toca una zona y cambiará inmediatamente a verde. El mapa
                      se centra automáticamente en el estado donde te encuentras.
                    </p>
                  </div>

                  {loadingMunicipalities && (
                    <span className="map-resolving">
                      Cargando zonas de México...
                    </span>
                  )}
                </div>

                {mapError && (
                  <div className="location-warning">
                    {mapError}
                  </div>
                )}

                <div className="coverage-map-shell">
                  <div className="coverage-map-instruction">
                    Toca un municipio o alcaldía para seleccionarlo
                  </div>

                  <MapContainer
                    center={
                      currentLocation
                        ? [currentLocation.latitude, currentLocation.longitude]
                        : DEFAULT_MAP_CENTER
                    }
                    zoom={currentLocation ? 11 : 5}
                    scrollWheelZoom
                    className="coverage-map"
                  >
                    <TileLayer
                      attribution='&copy; OpenStreetMap contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <FitCurrentStateMap
                      position={currentLocation}
                      stateCode={currentStateCode || '09'}
                      geoJson={municipalitiesGeoJson}
                    />

                    {currentLocation && (
                      <CircleMarker
                        center={[
                          currentLocation.latitude,
                          currentLocation.longitude,
                        ]}
                        radius={9}
                        pathOptions={{
                          color: '#ffffff',
                          weight: 3,
                          fillColor: '#171821',
                          fillOpacity: 1,
                        }}
                      >
                        <Popup>Tu ubicación actual</Popup>
                      </CircleMarker>
                    )}

                    {municipalitiesGeoJson && (
                      <GeoJSON
                        key={`municipalities-${serviceAreas
                          .map(
                            (area) =>
                              `${area.stateCode}-${area.municipalityCode}`
                          )
                          .sort()
                          .join('|')}`}
                        data={municipalitiesGeoJson}
                        style={(feature: any) => {
                          const area = getFeatureServiceArea(feature);
                          const selected = area ? isAreaSelected(area) : false;

                          return selected
                            ? SELECTED_AREA_STYLE
                            : AVAILABLE_AREA_STYLE;
                        }}
                        onEachFeature={(feature: any, layer: any) => {
                          const area = getFeatureServiceArea(feature);

                          if (!area) {
                            return;
                          }

                          layer.bindTooltip(
                            `${area.municipalityName}, ${area.stateName}`,
                            { sticky: true }
                          );

                          layer.on({
                            click: () => {
                              setServiceAreas((current) => {
                                const exists = current.some(
                                  (item) =>
                                    item.stateCode === area.stateCode &&
                                    item.municipalityCode ===
                                      area.municipalityCode
                                );

                                // El cambio se aplica directamente al polígono
                                // para que azul -> verde sea inmediato al tocar.
                                layer.setStyle(
                                  exists
                                    ? AVAILABLE_AREA_STYLE
                                    : SELECTED_AREA_STYLE
                                );

                                if (exists) {
                                  return current.filter(
                                    (item) =>
                                      !(
                                        item.stateCode === area.stateCode &&
                                        item.municipalityCode ===
                                          area.municipalityCode
                                      )
                                  );
                                }

                                return [...current, area];
                              });

                              setError('');
                            },
                            mouseover: () => {
                              layer.setStyle({
                                weight: 2.6,
                              });
                            },
                            mouseout: () => {
                              const isGreen =
                                layer.options.fillColor ===
                                SELECTED_AREA_STYLE.fillColor;

                              layer.setStyle({
                                weight: isGreen
                                  ? SELECTED_AREA_STYLE.weight
                                  : AVAILABLE_AREA_STYLE.weight,
                              });
                            },
                          });
                        }}
                      />
                    )}

                  </MapContainer>
                </div>

                <div className="coverage-map-legend">
                  <span className="coverage-map-legend-item">
                    <span className="coverage-map-legend-swatch available" />
                    <span>Disponible para seleccionar</span>
                  </span>

                  <span className="coverage-map-legend-item">
                    <span className="coverage-map-legend-swatch selected" />
                    <span>Zona seleccionada</span>
                  </span>
                </div>

                <div className="coverage-map-help">
                  Azul = disponible. Verde = seleccionado. Toca nuevamente una
                  zona verde para quitarla de tu cobertura.
                </div>

                {serviceAreas.length > 0 ? (
                  <div className="service-areas-list">
                    {serviceAreas.map((area, index) => (
                      <div
                        className="service-area-item"
                        key={`${area.stateCode}-${area.municipalityCode}`}
                      >
                        <div>
                          <strong>{area.municipalityName}</strong>
                          <span>{area.stateName}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeServiceArea(index)}
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="coverage-empty">
                    Todavía no has seleccionado zonas de servicio.
                  </div>
                )}

              </section>
            )}

            {step === 3 && (
              <section className="setup-card">

                <div className="setup-title">
                  <span>FOTOGRAFÍA</span>

                  <h1>Agrega una foto de perfil</h1>

                  <p>
                    Una fotografía clara ayuda a que los clientes
                    identifiquen al especialista que contratarán.
                  </p>
                </div>

                <label className="upload-box">

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      setProfilePhoto(
                        e.target.files?.[0] || null
                      );
                      setError('');
                    }}
                  />

                  <span className="upload-title">
                    Seleccionar fotografía
                  </span>

                  <span className="upload-description">
                    JPG, PNG o WEBP
                  </span>

                  {profilePhoto && (
                    <strong className="selected-file">
                      {profilePhoto.name}
                    </strong>
                  )}

                </label>

              </section>
            )}

            {step === 4 && (
              <section className="setup-card">

                <div className="setup-title">
                  <span>VERIFICACIÓN</span>

                  <h1>Verifica tu identidad</h1>

                  <p>
                    Utilizaremos tu identificación para validar
                    tu perfil profesional.
                  </p>
                </div>

                <div className="identification-grid">

                  <label className="upload-box">

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        setIdFront(
                          e.target.files?.[0] || null
                        );
                        setError('');
                      }}
                    />

                    <span className="upload-small-label">
                      IDENTIFICACIÓN
                    </span>

                    <span className="upload-title">
                      Frente
                    </span>

                    <span className="upload-description">
                      Selecciona una imagen legible
                    </span>

                    {idFront && (
                      <strong className="selected-file">
                        {idFront.name}
                      </strong>
                    )}

                  </label>

                  <label className="upload-box">

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        setIdBack(
                          e.target.files?.[0] || null
                        );
                        setError('');
                      }}
                    />

                    <span className="upload-small-label">
                      IDENTIFICACIÓN
                    </span>

                    <span className="upload-title">
                      Reverso
                    </span>

                    <span className="upload-description">
                      Selecciona una imagen legible
                    </span>

                    {idBack && (
                      <strong className="selected-file">
                        {idBack.name}
                      </strong>
                    )}

                  </label>

                </div>

                <div className="privacy-message">
                  <strong>Información privada</strong>

                  <p>
                    Tu identificación no será visible para otros
                    usuarios de FASYN.
                  </p>
                </div>

              </section>
            )}

            {step === 5 && (
              <section className="setup-card">

                <div className="setup-title">
                  <span>ESPECIALIDADES</span>

                  <h1>¿Qué tipo de trabajos realizas?</h1>

                  <p>
                    Puedes seleccionar más de una especialidad.
                    Después podrás crear servicios y precios específicos.
                  </p>
                </div>

                {loadingCategories ? (
                  <div className="categories-loading">
                    Cargando especialidades...
                  </div>
                ) : categories.length === 0 ? (
                  <div className="categories-empty">
                    No hay especialidades disponibles.
                  </div>
                ) : (
                  <div className="setup-options">

                    {categories.map((category) => {
                      const selected =
                        selectedCategories.includes(category.id);

                      return (
                        <button
                          key={category.id}
                          type="button"
                          className={
                            selected
                              ? 'specialty-option selected'
                              : 'specialty-option'
                          }
                          onClick={() =>
                            toggleCategory(category.id)
                          }
                        >
                          <span className="specialty-selector">
                            {selected ? '✓' : ''}
                          </span>

                          <span>{category.name}</span>
                        </button>
                      );
                    })}

                  </div>
                )}

              </section>
            )}

            {step === 6 && (
              <section className="setup-card">

                <div className="setup-title">
                  <span>CONFIRMACIÓN</span>

                  <h1>Tu perfil está casi listo</h1>

                  <p>
                    Revisa la información principal antes de
                    continuar a tu panel profesional.
                  </p>
                </div>

                <div className="setup-review">

                  <div className="review-row">
                    <span>Experiencia</span>

                    <strong>
                      {form.experience || '0'} años
                    </strong>
                  </div>

                  <div className="review-row">
                    <span>Zona</span>

                    <strong>
                      {form.municipality || 'Sin especificar'}
                      {form.state && `, ${form.state}`}
                    </strong>
                  </div>

                  <div className="review-row">
                    <span>Zonas de servicio</span>

                    <strong>
                      {serviceAreas.length > 0
                        ? serviceAreas
                            .map(
                              (area) =>
                                `${area.municipalityName}, ${area.stateName}`
                            )
                            .join(' · ')
                        : 'Sin zonas registradas'}
                    </strong>
                  </div>

                  <div className="review-row">
                    <span>Especialidades</span>

                    <strong>
                      {selectedCategoryNames.length > 0
                        ? selectedCategoryNames.join(', ')
                        : 'Sin seleccionar'}
                    </strong>
                  </div>

                </div>

                <div className="commission-card">

                  <div>
                    <span>COMISIÓN DE FASYN</span>

                    <strong>15%</strong>
                  </div>

                  <p>
                    La comisión se aplica únicamente sobre
                    servicios completados a través de la plataforma.
                  </p>

                </div>

                <div className="setup-next-info">
                  <span>SIGUIENTE ETAPA</span>

                  <p>
                    Al terminar podrás crear tus servicios,
                    establecer precios por hora, día o actividad
                    y administrar solicitudes de clientes.
                  </p>
                </div>

              </section>
            )}

            {error && (
              <div className="setup-error">
                {error}
              </div>
            )}

            <div className="setup-actions">

              {step > 1 ? (
                <button
                  type="button"
                  className="setup-back"
                  onClick={previousStep}
                  disabled={saving}
                >
                  Atrás
                </button>
              ) : (
                <div />
              )}

              {step < TOTAL_STEPS ? (
                <button
                  type="button"
                  className="setup-next"
                  onClick={nextStep}
                >
                  Continuar
                </button>
              ) : (
                <button
                  type="button"
                  className="setup-next"
                  onClick={finishSetup}
                  disabled={saving}
                >
                  {saving
                    ? 'Guardando perfil...'
                    : 'Finalizar perfil'}
                </button>
              )}

            </div>

          </div>

        </section>

      </main>

    </div>
  );
};

export default SpecialistSetup;