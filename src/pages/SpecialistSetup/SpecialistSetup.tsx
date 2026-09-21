import { useEffect, useMemo, useRef, useState } from 'react';
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
  id?: number;
  stateCode: string;
  stateName: string;
  municipalityCode: string;
  municipalityName: string;
}

interface SpecialtyRelation {
  category?: {
    id: number;
    name: string;
  };
}

interface SpecialistProfileData {
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
  profilePhotoUrl?: string | null;
  idFrontUrl?: string | null;
  idBackUrl?: string | null;
  profileCompleted?: boolean;
  specialties?: SpecialtyRelation[];
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

const resolveStoredFileUrl = (fileUrl?: string | null) => {
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

  const normalizedPath = fileUrl.startsWith('/')
    ? fileUrl
    : `/${fileUrl}`;

  return `${apiOrigin}${normalizedPath}`;
};

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

  const [existingProfilePhotoUrl, setExistingProfilePhotoUrl] = useState('');
  const [existingIdFrontUrl, setExistingIdFrontUrl] = useState('');
  const [existingIdBackUrl, setExistingIdBackUrl] = useState('');
  const [loadingExistingData, setLoadingExistingData] = useState(true);

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

  const newProfilePhotoPreview = useMemo(() => {
    if (!profilePhoto) {
      return '';
    }

    return URL.createObjectURL(profilePhoto);
  }, [profilePhoto]);

  useEffect(() => {
    return () => {
      if (newProfilePhotoPreview) {
        URL.revokeObjectURL(newProfilePhotoPreview);
      }
    };
  }, [newProfilePhotoPreview]);

  const profilePhotoPreview =
    newProfilePhotoPreview || existingProfilePhotoUrl;

  useEffect(() => {
    const loadExistingData = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      try {
        setLoadingExistingData(true);

        const [profileResult, areasResult] = await Promise.allSettled([
          api.get('/specialists/profile', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          api.get('/specialists/me/service-areas', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (profileResult.status === 'fulfilled') {
          const profile: SpecialistProfileData =
            profileResult.value.data?.profile ??
            profileResult.value.data;

          if (profile?.profileCompleted === true) {
            navigate('/specialist', { replace: true });
            return;
          }

          if (profile) {
            setForm({
              phone: profile.phone || '',
              description: profile.description || '',
              experience:
                profile.experience !== null &&
                profile.experience !== undefined
                  ? String(profile.experience)
                  : '',
              state: profile.state || '',
              municipality: profile.municipality || '',
              neighborhood: profile.neighborhood || '',
              postalCode: profile.postalCode || '',
              address: profile.address || '',
            });

            const savedCategoryIds =
              (profile.specialties || [])
                .map((item) => item.category?.id)
                .filter((id): id is number => Number.isInteger(id));

            setSelectedCategories(savedCategoryIds);

            setExistingProfilePhotoUrl(
              resolveStoredFileUrl(profile.profilePhotoUrl)
            );
            setExistingIdFrontUrl(
              resolveStoredFileUrl(profile.idFrontUrl)
            );
            setExistingIdBackUrl(
              resolveStoredFileUrl(profile.idBackUrl)
            );

            const savedStateCode =
              getStateCodeFromName(profile.state || '');

            if (savedStateCode) {
              setCurrentStateCode(savedStateCode);
            }
          }
        } else {
          const status =
            (profileResult.reason as any)?.response?.status;

          if (status !== 404) {
            console.error(
              'ERROR CARGANDO PERFIL EXISTENTE:',
              profileResult.reason
            );
          }
        }

        if (areasResult.status === 'fulfilled') {
          const responseData = areasResult.value.data;
          const savedAreas =
            responseData?.serviceAreas ??
            responseData?.areas ??
            responseData?.data ??
            responseData ??
            [];

          if (Array.isArray(savedAreas)) {
            const normalizedAreas: ServiceArea[] = savedAreas
              .map((area: any) => ({
                id: area.id,
                stateCode: String(area.stateCode || '').padStart(2, '0'),
                stateName: String(area.stateName || ''),
                municipalityCode: String(
                  area.municipalityCode || ''
                ).padStart(3, '0'),
                municipalityName: String(
                  area.municipalityName || ''
                ),
              }))
              .filter(
                (area: ServiceArea) =>
                  area.stateCode &&
                  area.stateName &&
                  area.municipalityCode &&
                  area.municipalityName
              );

            setServiceAreas(normalizedAreas);

            if (normalizedAreas.length > 0) {
              setCurrentStateCode((current) =>
                current || normalizedAreas[0].stateCode
              );
            }
          }
        } else {
          const status =
            (areasResult.reason as any)?.response?.status;

          if (status !== 404) {
            console.error(
              'ERROR CARGANDO ZONAS EXISTENTES:',
              areasResult.reason
            );
          }
        }
      } catch (loadError) {
        console.error(
          'ERROR CARGANDO CONFIGURACIÓN EXISTENTE:',
          loadError
        );
      } finally {
        setLoadingExistingData(false);
      }
    };

    void loadExistingData();
  }, [navigate]);

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

  useEffect(() => {
    const stateCode = getStateCodeFromName(form.state);

    if (stateCode) {
      setCurrentStateCode(stateCode);
    }
  }, [form.state]);

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
    if (
      step === 2 &&
      serviceAreas.length === 0 &&
      !currentLocation &&
      !locating
    ) {
      getCurrentLocation();
    }
    // Si ya existen zonas guardadas, no volvemos a exigir geolocalización.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, serviceAreas.length]);

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
      if (!form.state.trim()) {
        setError('Indica el estado donde vives.');
        return false;
      }

      if (!form.municipality.trim()) {
        setError('Indica el municipio o alcaldía donde vives.');
        return false;
      }

      if (!form.neighborhood.trim()) {
        setError('Indica la colonia donde vives.');
        return false;
      }

      if (!/^\d{5}$/.test(form.postalCode.trim())) {
        setError('Ingresa un código postal válido de 5 dígitos.');
        return false;
      }

      if (serviceAreas.length === 0) {
        setError(
          'Selecciona en el mapa al menos una zona donde prestas servicio.'
        );
        return false;
      }
    }

    if (
      step === 3 &&
      !profilePhoto &&
      !existingProfilePhotoUrl
    ) {
      setError('Selecciona una fotografía de perfil.');
      return false;
    }

    if (
      step === 4 &&
      ((!idFront && !existingIdFrontUrl) ||
        (!idBack && !existingIdBackUrl))
    ) {
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

      // Validación final antes de persistir todo el registro.
      if (!profilePhoto && !existingProfilePhotoUrl) {
        setError('Selecciona una fotografía de perfil.');
        setStep(3);
        return;
      }

      if (
        (!idFront && !existingIdFrontUrl) ||
        (!idBack && !existingIdBackUrl)
      ) {
        setError(
          'Selecciona el frente y reverso de tu identificación.'
        );
        setStep(4);
        return;
      }

      if (selectedCategories.length === 0) {
        setError('Selecciona al menos una especialidad.');
        setStep(5);
        return;
      }

      if (serviceAreas.length === 0) {
        setError(
          'Selecciona al menos una zona donde prestas servicio.'
        );
        setStep(2);
        return;
      }

      // 1. Guardar datos del perfil profesional.
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

      // 2. Guardar especialidades seleccionadas.
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

      // 3. Guardar zonas donde presta servicio.
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

      // 4. Subir únicamente los archivos nuevos.
      // Si ya existen en backend, no obligamos al usuario a volverlos a elegir.
      if (profilePhoto || idFront || idBack) {
        const filesFormData = new FormData();

        if (profilePhoto) {
          filesFormData.append(
            'profilePhoto',
            profilePhoto
          );
        }

        if (idFront) {
          filesFormData.append(
            'idFront',
            idFront
          );
        }

        if (idBack) {
          filesFormData.append(
            'idBack',
            idBack
          );
        }

        const filesResponse = await api.post(
          '/specialists/profile/files',
          filesFormData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log(
          'ARCHIVOS DEL ESPECIALISTA GUARDADOS:',
          filesResponse.data
        );
      } else {
        console.log(
          'ARCHIVOS YA EXISTENTES: no se vuelven a subir'
        );
      }

      // 5. Marcar el perfil como completo únicamente después
      // de guardar datos, especialidades, zonas y archivos.
      const completeResponse = await api.put(
        '/specialists/profile/complete',
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(
        'PERFIL COMPLETADO:',
        completeResponse.data
      );

      // Mantener sincronizada la sesión local. La fuente real
      // de verdad sigue siendo PostgreSQL.
      const storedUser = localStorage.getItem('user');

      if (storedUser) {
        try {
          const currentUser = JSON.parse(storedUser);

          localStorage.setItem(
            'user',
            JSON.stringify({
              ...currentUser,
              profileCompleted: true,
            })
          );
        } catch (storageError) {
          console.warn(
            'NO SE PUDO ACTUALIZAR EL USUARIO LOCAL:',
            storageError
          );
        }
      }

      // 6. Entrar al panel del especialista.
      navigate('/specialist');
    } catch (error: any) {
      console.error(
        'ERROR GUARDANDO PERFIL:',
        error.response?.data || error
      );

      const missingFields =
        error.response?.data?.missingFields;

      if (
        Array.isArray(missingFields) &&
        missingFields.length > 0
      ) {
        setError(
          `Falta completar: ${missingFields.join(', ')}.`
        );
        return;
      }

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

                  <h1>Indica dónde vives y dónde trabajas</h1>

                  <p>
                    Usa tu ubicación actual para llenar automáticamente los
                    datos de tu domicilio. Después selecciona en el mapa las
                    zonas donde estás disponible para prestar servicio.
                  </p>
                </div>

                <div className="current-location-card">
                  <div className="current-location-copy">
                    <span className="location-eyebrow">DOMICILIO DEL ESPECIALISTA</span>

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
                          Usa tu ubicación para llenar automáticamente tu
                          estado, municipio, colonia, código postal y dirección.
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

                <div className="setup-title" style={{ marginTop: '28px' }}>
                  <span>DOMICILIO DEL ESPECIALISTA</span>
                  <h2>¿Dónde vives?</h2>
                  <p>
                    Estos datos corresponden a tu domicilio. Son independientes
                    de las zonas donde decides prestar servicio.
                  </p>
                </div>

                <div className="setup-form">
                  <label>
                    <span>Estado</span>
                    <input
                      type="text"
                      name="state"
                      value={form.state}
                      onChange={handleChange}
                      placeholder="Ej. Estado de México"
                    />
                  </label>

                  <label>
                    <span>Municipio / Alcaldía</span>
                    <input
                      type="text"
                      name="municipality"
                      value={form.municipality}
                      onChange={handleChange}
                      placeholder="Ej. Naucalpan de Juárez"
                    />
                  </label>

                  <label>
                    <span>Colonia</span>
                    <input
                      type="text"
                      name="neighborhood"
                      value={form.neighborhood}
                      onChange={handleChange}
                      placeholder="Ej. Ciudad Satélite"
                    />
                  </label>

                  <label>
                    <span>Código postal</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      name="postalCode"
                      value={form.postalCode}
                      maxLength={5}
                      onChange={handleChange}
                      placeholder="Ej. 53100"
                    />
                  </label>

                  <label>
                    <span>Dirección</span>
                    <input
                      type="text"
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Calle y número"
                    />
                  </label>
                </div>

                <div className="coverage-map-header">
                  <div>
                    <span>ZONAS DE ATENCIÓN</span>
                    <h2>Selecciona dónde prestas servicio</h2>
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

                  {profilePhotoPreview && (
                    <img
                      src={profilePhotoPreview}
                      alt="Foto de perfil del especialista"
                      style={{
                        width: '120px',
                        height: '120px',
                        marginTop: '14px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                  )}

                  {profilePhoto ? (
                    <strong className="selected-file">
                      Nueva foto: {profilePhoto.name}
                    </strong>
                  ) : existingProfilePhotoUrl ? (
                    <strong className="selected-file">
                      ✓ Foto de perfil ya guardada. Puedes seleccionarla de nuevo para reemplazarla.
                    </strong>
                  ) : null}

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

                    {idFront ? (
                      <strong className="selected-file">
                        Nuevo frente: {idFront.name}
                      </strong>
                    ) : existingIdFrontUrl ? (
                      <strong className="selected-file">
                        ✓ Frente de identificación ya guardado
                      </strong>
                    ) : null}

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

                    {idBack ? (
                      <strong className="selected-file">
                        Nuevo reverso: {idBack.name}
                      </strong>
                    ) : existingIdBackUrl ? (
                      <strong className="selected-file">
                        ✓ Reverso de identificación ya guardado
                      </strong>
                    ) : null}

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
                  disabled={loadingExistingData}
                >
                  {loadingExistingData
                    ? 'Cargando información...'
                    : 'Continuar'}
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