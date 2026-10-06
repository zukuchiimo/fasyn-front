import {

  type ChangeEvent,

  useEffect,

  useMemo,

  useRef,

  useState,

} from 'react';



import { useNavigate } from 'react-router-dom';

import ServiceAreaGoogleMap

  from '../../components/ServiceAreaGoogleMap/ServiceAreaGoogleMap';

import { api } from '../../api/api';

import logo from '../../assets/logo.png';



import './MyProfile.css';



type Category = {

  id: number;

  name: string;

};



type SpecialtyRelation = {

  category: Category;

};

type Coordinates = {

  latitude: number;

  longitude: number;

};



type ServiceArea = {

  id?: number;

  stateCode: string;

  stateName: string;

  municipalityCode: string;

  municipalityName: string;

};



type ReverseAddress = {

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

  profilePhotoUrl?: string | null;

  idFrontUrl?: string | null;

  idBackUrl?: string | null;

  available?: boolean;

  profileCompleted?: boolean;

  specialties?: SpecialtyRelation[];

};



type ProfileForm = {

  phone: string;

  description: string;

  experience: string;

  state: string;

  municipality: string;

  neighborhood: string;

  postalCode: string;

  address: string;

};

const MUNICIPALITIES_GEOJSON_BASE_URL =

  'https://raw.githubusercontent.com/MacWilliXD/INEGI-geojson/main/geojson_descargas';



const getMunicipalitiesGeoJsonUrl = (

  stateCode: string

) =>

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



const SERVICE_AREA_NEIGHBOR_STATES:

  Record<string, string[]> = {

  '01': ['14', '32'],

  '02': ['03', '26'],

  '03': ['02'],

  '04': ['07', '23', '27', '31'],

  '05': ['08', '10', '19', '24', '32'],

  '06': ['14', '16'],

  '07': ['20', '27', '30'],

  '08': ['05', '10', '25', '26'],

  '09': ['15', '17'],

  '10': ['05', '08', '14', '18', '25', '32'],

  '11': ['14', '16', '22', '24', '32'],

  '12': ['15', '16', '17', '20', '21'],

  '13': ['15', '21', '22', '24', '30'],

  '14': ['01', '06', '10', '11', '16', '18', '32'],

  '15': ['09', '12', '13', '16', '17', '21', '22', '29'],

  '16': ['06', '11', '12', '14', '15', '22'],

  '17': ['09', '12', '15', '21'],

  '18': ['10', '14', '25', '32'],

  '19': ['05', '24', '28', '32'],

  '20': ['07', '12', '21', '30'],

  '21': ['12', '13', '15', '17', '20', '29', '30'],

  '22': ['11', '13', '15', '16', '24'],

  '23': ['04', '31'],

  '24': ['05', '11', '13', '19', '22', '28', '30', '32'],

  '25': ['08', '10', '18', '26'],

  '26': ['02', '08', '25'],

  '27': ['04', '07', '30'],

  '28': ['19', '24', '30'],

  '29': ['15', '21'],

  '30': ['07', '13', '20', '21', '24', '27', '28'],

  '31': ['04', '23'],

  '32': ['01', '05', '10', '11', '14', '18', '19', '24'],

};



const getServiceAreaStateCodes = (

  stateCode: string

) => {

  const initialStateCode =

    stateCode || '09';



  return Array.from(

    new Set([

      initialStateCode,

      ...(SERVICE_AREA_NEIGHBOR_STATES[

        initialStateCode

      ] || []),

    ])

  );

};



const normalizeStateName = (

  value: string

) =>

  value

    .normalize('NFD')

    .replace(

      /[\u0300-\u036f]/g,

      ''

    )

    .toLowerCase()

    .trim();



const STATE_NAME_TO_CODE:

  Record<string, string> =

  Object.entries(

    STATE_NAMES

  ).reduce<Record<string, string>>(

    (accumulator, [code, name]) => {

      accumulator[

        normalizeStateName(name)

      ] = code;



      return accumulator;

    },

    {}

  );



STATE_NAME_TO_CODE['mexico'] = '15';

STATE_NAME_TO_CODE[

  'estado de mexico'

] = '15';

STATE_NAME_TO_CODE[

  'ciudad de mexico'

] = '09';

STATE_NAME_TO_CODE[

  'distrito federal'

] = '09';



const getStateCodeFromName = (

  stateName?: string

) => {

  if (!stateName) {

    return '';

  }



  return (

    STATE_NAME_TO_CODE[

      normalizeStateName(stateName)

    ] || ''

  );

};



const reverseGeocode = async (

  latitude: number,

  longitude: number

) => {

  const response = await fetch(

    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=es`

  );



  if (!response.ok) {

    throw new Error(

      'No fue posible identificar la ubicación seleccionada.'

    );

  }



  return response.json();

};



const getMunicipalityName = (

  address: ReverseAddress

) =>

  address.municipality ||

  address.city_district ||

  address.borough ||

  address.city ||

  address.town ||

  address.village ||

  address.county ||

  '';


const geocodeRegisteredProfileLocation = async (
  profile: Pick<
    SpecialistProfileData,
    | 'state'
    | 'municipality'
    | 'neighborhood'
    | 'postalCode'
    | 'address'
  >
): Promise<Coordinates | null> => {
  /*
    Intentamos de lo más específico a lo más general.

    Esto evita que una calle/colonia escrita de forma
    distinta haga fallar por completo la ubicación.

    El municipio + estado es el fallback más importante,
    porque para el radio de cobertura no necesitamos
    necesariamente el número exacto de la vivienda.
  */
  const candidates = [
    [
      profile.address,
      profile.neighborhood,
      profile.municipality,
      profile.state,
      profile.postalCode,
      'México',
    ],
    [
      profile.neighborhood,
      profile.municipality,
      profile.state,
      'México',
    ],
    [
      profile.municipality,
      profile.state,
      'México',
    ],
    [
      profile.postalCode,
      profile.state,
      'México',
    ],
    [
      profile.state,
      'México',
    ],
  ]
    .map((parts) =>
      parts
        .filter(
          (value): value is string =>
            Boolean(
              value &&
              String(value).trim()
            )
        )
        .map((value) =>
          String(value).trim()
        )
        .join(', ')
    )
    .filter(Boolean);

  const uniqueCandidates =
    Array.from(
      new Set(candidates)
    );

  for (
    const query of
    uniqueCandidates
  ) {
    try {
      console.log(
        '📍 BUSCANDO UBICACIÓN:',
        query
      );

      const response =
        await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=mx&accept-language=es&q=${encodeURIComponent(
            query
          )}`
        );

      if (!response.ok) {
        continue;
      }

      const results =
        await response.json();

      if (
        !Array.isArray(results) ||
        results.length === 0
      ) {
        continue;
      }

      const latitude =
        Number(
          results[0]?.lat
        );

      const longitude =
        Number(
          results[0]?.lon
        );

      if (
        !Number.isFinite(
          latitude
        ) ||
        !Number.isFinite(
          longitude
        )
      ) {
        continue;
      }

      console.log(
        '✅ UBICACIÓN REGISTRADA RESUELTA:',
        {
          query,
          latitude,
          longitude,
        }
      );

      return {
        latitude,
        longitude,
      };
    } catch (
      geocodeError
    ) {
      console.warn(
        'No se pudo resolver:',
        query,
        geocodeError
      );
    }
  }

  return null;
};



const resolveUploadUrl = (

  value?: string | null

) => {

  if (!value) {

    return '';

  }



  if (

    value.startsWith('http://') ||

    value.startsWith('https://')

  ) {

    return value;

  }



  const apiBaseUrl =

    api.defaults.baseURL ||

    'http://localhost:3000/api';



  const apiOrigin =

    apiBaseUrl.replace(/\/api\/?$/, '');



  return `${apiOrigin}${

    value.startsWith('/') ? '' : '/'

  }${value}`;

};



const MyProfile = () => {

  const navigate = useNavigate();



const [

  serviceAreas,

  setServiceAreas,

] = useState<ServiceArea[]>([]);



const [

  originalServiceAreas,

  setOriginalServiceAreas,

] = useState<ServiceArea[]>([]);



const [

  currentLocation,

  setCurrentLocation,

] = useState<Coordinates | null>(

  null

);



const [

  currentStateCode,

  setCurrentStateCode,

] = useState('');



const [

  municipalitiesGeoJson,

  setMunicipalitiesGeoJson,

] = useState<any | null>(null);



const [

  loadingMunicipalities,

  setLoadingMunicipalities,

] = useState(false);



const [

  mapError,

  setMapError,

] = useState('');



const [

  locating,

  setLocating,

] = useState(false);



const [

  locationError,

  setLocationError,

] = useState('');

const [
  resolvingRegisteredLocation,
  setResolvingRegisteredLocation,
] = useState(false);

const locationSourceRef =
  useRef<'browser' | 'profile' | null>(
    null
  );







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



  const [form, setForm] =

    useState<ProfileForm>({

      phone: '',

      description: '',

      experience: '',

      state: '',

      municipality: '',

      neighborhood: '',

      postalCode: '',

      address: '',

    });



  const [profile, setProfile] =

    useState<SpecialistProfileData | null>(

      null

    );



  const [categories, setCategories] =

    useState<Category[]>([]);



  const [

    selectedCategories,

    setSelectedCategories,

  ] = useState<number[]>([]);



  const [loading, setLoading] =

    useState(true);



  const [saving, setSaving] =

    useState(false);



  const [error, setError] =

    useState('');



  const [success, setSuccess] =

    useState('');



  const [

    profilePhotoPreview,

    setProfilePhotoPreview,

  ] = useState('');



  const [

    uploadingPhoto,

    setUploadingPhoto,

  ] = useState(false);



  const profilePhotoInputRef =

    useRef<HTMLInputElement | null>(null);



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



  const firstName =

    user.name

      ?.trim()

      .split(' ')[0] ||

    'Especialista';



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



  const applyRegisteredLocation =
    async (
      profileData:
        SpecialistProfileData
    ) => {
      try {
        setResolvingRegisteredLocation(
          true
        );

        const coordinates =
          await geocodeRegisteredProfileLocation(
            profileData
          );

        if (!coordinates) {
          setLocationError(
            'No pudimos ubicar automáticamente tu domicilio registrado. Revisa estado, municipio y dirección, o usa tu ubicación actual.'
          );
          return false;
        }

        /*
          Si el usuario ya eligió explícitamente
          la ubicación del navegador, no la
          sobrescribimos con el domicilio.
        */
        if (
          locationSourceRef.current ===
          'browser'
        ) {
          return true;
        }

        setCurrentLocation(
          coordinates
        );

        locationSourceRef.current =
          'profile';

        const savedStateCode =
          getStateCodeFromName(
            profileData.state || ''
          );

        if (savedStateCode) {
          setCurrentStateCode(
            savedStateCode
          );
        }

        setLocationError('');

        console.log(
          '📍 UBICACIÓN DEL PERFIL:',
          coordinates
        );

        return true;
      } catch (registeredError) {
        console.warn(
          'NO SE PUDO LOCALIZAR EL DOMICILIO REGISTRADO:',
          registeredError
        );

        setLocationError(
          'No pudimos ubicar automáticamente tu domicilio registrado. Puedes usar tu ubicación actual.'
        );

        return false;
      } finally {
        setResolvingRegisteredLocation(
          false
        );
      }
    };

  const loadProfile = async () => {

    try {

      setLoading(true);

      setError('');



      const token =

        localStorage.getItem('token');



      if (!token) {

        navigate('/login');

        return;

      }



const [

  profileResponse,

  categoriesResponse,

  serviceAreasResponse,

] = await Promise.all([

  api.get(

    '/specialists/profile',

    {

      headers: {

        Authorization:

          `Bearer ${token}`,

      },

    }

  ),



  api.get('/categories'),



  api.get(

    '/specialists/me/service-areas',

    {

      headers: {

        Authorization:

          `Bearer ${token}`,

      },

    }

  ),

]);



      const profileData:

        SpecialistProfileData =

          profileResponse.data.profile;



      setProfile(profileData);

const savedStateCode =

  getStateCodeFromName(

    profileData?.state || ''

  );



if (savedStateCode) {

  setCurrentStateCode(

    savedStateCode

  );

}



const responseData =

  serviceAreasResponse.data;



const savedAreas =

  responseData?.serviceAreas ??

  responseData?.areas ??

  responseData?.data ??

  responseData ??

  [];



const normalizedAreas:

  ServiceArea[] =

  Array.isArray(savedAreas)

    ? savedAreas

        .map(

          (area: any) => ({

            id: area.id,



            stateCode:

              String(

                area.stateCode || ''

              ).padStart(

                2,

                '0'

              ),



            stateName:

              String(

                area.stateName || ''

              ),



            municipalityCode:

              String(

                area.municipalityCode ||

                  ''

              ).padStart(

                3,

                '0'

              ),



            municipalityName:

              String(

                area.municipalityName ||

                  ''

              ),

          })

        )

        .filter(

          (area) =>

            area.stateCode &&

            area.stateName &&

            area.municipalityCode &&

            area.municipalityName

        )

    : [];



setServiceAreas(

  normalizedAreas

);



setOriginalServiceAreas(

  normalizedAreas

);

      setProfilePhotoPreview(

        resolveUploadUrl(

          profileData?.profilePhotoUrl

        )

      );



      setForm({

        phone:

          profileData?.phone || '',



        description:

          profileData?.description || '',



        experience:

          profileData?.experience !==

            null &&

          profileData?.experience !==

            undefined

            ? String(

                profileData.experience

              )

            : '',



        state:

          profileData?.state || '',



        municipality:

          profileData?.municipality ||

          '',



        neighborhood:

          profileData?.neighborhood ||

          '',



        postalCode:

          profileData?.postalCode || '',



        address:

          profileData?.address || '',

      });


      /*
        Usamos el domicilio ya registrado como
        centro del radio de 80 km.

        Así el mapa funciona incluso si el usuario
        negó el permiso de geolocalización.
      */
      if (
        locationSourceRef.current !==
        'browser'
      ) {
        void applyRegisteredLocation(
          profileData
        );
      }



      const specialties =

        profileData?.specialties || [];



      setSelectedCategories(

        specialties

          .map(

            (item) =>

              item.category?.id

          )

          .filter(Boolean)

      );



      const allCategories:

        Category[] =

          categoriesResponse.data

            ?.categories || [];



      setCategories(

        [...allCategories].sort(

          (a, b) =>

            formatCategoryName(

              a.name

            ).localeCompare(

              formatCategoryName(

                b.name

              ),

              'es'

            )

        )

      );

    } catch (requestError: any) {

      console.error(

        'ERROR CARGANDO PERFIL:',

        requestError.response?.data ||

          requestError

      );



      setError(

        requestError.response?.data

          ?.message ||

          'No fue posible cargar tu perfil.'

      );

    } finally {

      setLoading(false);

    }

  };



  useEffect(() => {

    void loadProfile();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

useEffect(() => {

  const stateCode =

    getStateCodeFromName(

      form.state

    );



  if (stateCode) {

    setCurrentStateCode(

      stateCode

    );

  }

}, [form.state]);

useEffect(() => {
  let cancelled = false;

  const loadMunicipalities =
    async () => {
      try {
        setLoadingMunicipalities(true);
        setMapError('');

        /*
          Estado base:
          1) estado actual del perfil
          2) primer estado ya guardado
          3) CDMX como fallback
        */
        const baseStateCode =
          currentStateCode ||
          getStateCodeFromName(
            form.state
          ) ||
          serviceAreas[0]
            ?.stateCode ||
          '09';

        /*
          Cargamos el estado base y vecinos.
        */
        const nearbyStates =
          getServiceAreaStateCodes(
            baseStateCode
          );

        /*
          También cargamos cualquier estado donde
          ya existan zonas guardadas del especialista.
        */
        const savedAreaStates =
          serviceAreas
            .map(
              (area) =>
                String(
                  area.stateCode
                ).padStart(
                  2,
                  '0'
                )
            )
            .filter(Boolean);

        const stateCodes =
          Array.from(
            new Set([
              ...nearbyStates,
              ...savedAreaStates,
            ])
          );

        console.log(
          '🗺 ESTADOS A CARGAR:',
          stateCodes
        );

        console.log(
          '🟢 ZONAS GUARDADAS:',
          serviceAreas
        );

        const results =
          await Promise.all(
            stateCodes.map(
              async (
                stateCode
              ) => {
                try {
                  const response =
                    await fetch(
                      getMunicipalitiesGeoJsonUrl(
                        stateCode
                      )
                    );

                  if (
                    !response.ok
                  ) {
                    throw new Error(
                      `No fue posible cargar ${stateCode}`
                    );
                  }

                  const data =
                    await response.json();

                  const features =
                    Array.isArray(
                      data?.features
                    )
                      ? data.features
                      : [];

                  console.log(
                    `🗺 Estado ${stateCode}:`,
                    features.length,
                    'zonas'
                  );

                  return features;
                } catch (
                  stateError
                ) {
                  console.warn(
                    `No se pudieron cargar municipios de ${stateCode}:`,
                    stateError
                  );

                  return [];
                }
              }
            )
          );

        if (cancelled) {
          return;
        }

        const features =
          results.flat();

        console.log(
          '🗺 TOTAL POLÍGONOS:',
          features.length
        );

        setMunicipalitiesGeoJson({
          type:
            'FeatureCollection',
          features,
        });
      } catch (
        municipalityError
      ) {
        console.error(
          'ERROR CARGANDO MUNICIPIOS:',
          municipalityError
        );

        if (!cancelled) {
          setMapError(
            'No fue posible cargar las zonas del mapa.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingMunicipalities(
            false
          );
        }
      }
    };

  void loadMunicipalities();

  return () => {
    cancelled = true;
  };
}, [
  currentStateCode,
  form.state,

  /*
    Las zonas guardadas se hidratan al cargar
    el perfil. No recargamos todo el GeoJSON
    en cada clic azul/verde.
  */
  originalServiceAreas
    .map(
      (area) =>
        area.stateCode
    )
    .sort()
    .join('|'),
]);

  const handleChange = (

    field: keyof ProfileForm,

    value: string

  ) => {

    setForm((current) => ({

      ...current,

      [field]: value,

    }));



    setError('');

    setSuccess('');

  };



  const toggleCategory = (

    categoryId: number

  ) => {

    setSelectedCategories(

      (current) => {

        if (

          current.includes(categoryId)

        ) {

          return current.filter(

            (id) =>

              id !== categoryId

          );

        }



        return [

          ...current,

          categoryId,

        ];

      }

    );



    setError('');

    setSuccess('');

  };

const useRegisteredLocation =
  async () => {
    if (!profile) {
      setLocationError(
        'Todavía no se ha cargado tu perfil.'
      );
      return;
    }

    locationSourceRef.current =
      null;

    await applyRegisteredLocation(
      profile
    );
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

      const coordinates: Coordinates = {

        latitude:

          position.coords.latitude,

        longitude:

          position.coords.longitude,

      };



      setCurrentLocation(coordinates);

      locationSourceRef.current =
        'browser';

      setLocationError('');



      try {

        const result =

          await reverseGeocode(

            coordinates.latitude,

            coordinates.longitude

          );



        const address: ReverseAddress =

          result.address || {};



        const municipality =

          getMunicipalityName(address);



        const detectedStateCode =

          getStateCodeFromName(

            address.state

          );



        if (detectedStateCode) {

          setCurrentStateCode(

            detectedStateCode

          );

        }



        const fullAddress = [

          address.road,

          address.house_number,

        ]

          .filter(Boolean)

          .join(' ');



        setForm((current) => ({

          ...current,



          state:

            address.state ||

            current.state,



          municipality:

            municipality ||

            current.municipality,



          neighborhood:

            address.neighbourhood ||

            address.suburb ||

            address.quarter ||

            current.neighborhood,



          postalCode:

            address.postcode ||

            current.postalCode,



          address:

            fullAddress ||

            result.display_name ||

            current.address,

        }));

      } catch (locationError) {

        console.error(

          'ERROR IDENTIFICANDO UBICACIÓN:',

          locationError

        );



        setLocationError(

          'Obtuvimos tu ubicación, pero no pudimos identificar la dirección.'

        );

      } finally {

        setLocating(false);

      }

    },



(geolocationError) => {

  setLocating(false);



  switch (geolocationError.code) {

    case 1:

      console.warn(

        'El usuario no permitió acceder a su ubicación.'

      );



      setLocationError(

        'No diste permiso para usar tu ubicación. Puedes seleccionar tu zona manualmente en el mapa.'

      );

      return;



    case 2:

      console.warn(

        'Ubicación no disponible.'

      );



      setLocationError(

        'No fue posible determinar tu ubicación. Puedes seleccionar tu zona manualmente.'

      );

      return;



    case 3:

      console.warn(

        'Tiempo de espera agotado al obtener ubicación.'

      );



      setLocationError(

        'La ubicación tardó demasiado en responder. Intenta nuevamente o selecciona tu zona manualmente.'

      );

      return;



    default:

      console.warn(

        'No fue posible obtener ubicación:',

        geolocationError

      );



      setLocationError(

        'No fue posible obtener tu ubicación actual.'

      );

  }

},



    {

      enableHighAccuracy: true,

      timeout: 12000,

      maximumAge: 30000,

    }

  );

};



const handleProfilePhotoChange = async (

  event: ChangeEvent<HTMLInputElement>

) => {

  const file =

    event.target.files?.[0];



  console.log(

    '📸 FOTO SELECCIONADA:',

    file

  );



  if (!file) {

    return;

  }



  const allowedTypes = [

    'image/jpeg',

    'image/png',

    'image/webp',

  ];



  if (

    !allowedTypes.includes(file.type)

  ) {

    setError(

      'La foto debe ser JPG, PNG o WEBP.'

    );



    event.target.value = '';

    return;

  }



  const maxSize =

    5 * 1024 * 1024;



  if (file.size > maxSize) {

    setError(

      'La foto no puede pesar más de 5 MB.'

    );



    event.target.value = '';

    return;

  }



  const token =

    localStorage.getItem('token');



  if (!token) {

    navigate('/login');

    return;

  }



  const previousPhoto =

    resolveUploadUrl(

      profile?.profilePhotoUrl

    );



  const localPreview =

    URL.createObjectURL(file);



  try {

    setUploadingPhoto(true);

    setError('');

    setSuccess('');



    setProfilePhotoPreview(

      localPreview

    );



    const formData =

      new FormData();



    formData.append(

      'profilePhoto',

      file

    );



    console.log(

      '📤 SUBIENDO FOTO...',

      {

        name: file.name,

        type: file.type,

        size: file.size,

      }

    );



    const response =

      await api.post(

        '/specialists/profile/files',

        formData,

        {

          headers: {

            Authorization:

              `Bearer ${token}`,

          },

        }

      );



    console.log(

      '✅ RESPUESTA FOTO:',

      response.data

    );



    const savedPhotoUrl =

      response.data?.files

        ?.profilePhotoUrl;



    if (savedPhotoUrl) {

      setProfile((current) =>

        current

          ? {

              ...current,

              profilePhotoUrl:

                savedPhotoUrl,

            }

          : current

      );



      setProfilePhotoPreview(

        resolveUploadUrl(

          savedPhotoUrl

        )

      );

    } else {

      await loadProfile();

    }



    setSuccess(

      'Tu foto de perfil se actualizó correctamente.'

    );

  } catch (requestError: any) {

    console.error(

      'ERROR ACTUALIZANDO FOTO:',

      requestError.response?.data ||

        requestError

    );



    setProfilePhotoPreview(

      previousPhoto

    );



    setError(

      requestError.response?.data

        ?.message ||

        'No fue posible actualizar tu foto de perfil.'

    );

  } finally {

    URL.revokeObjectURL(

      localPreview

    );



    setUploadingPhoto(false);



    event.target.value = '';

  }

};

  const completionPercentage =

    useMemo(() => {

      let completed = 0;



      const total = 8;



      if (form.phone.trim()) {

        completed++;

      }



      if (

        form.description.trim()

      ) {

        completed++;

      }



      if (

        form.experience.trim()

      ) {

        completed++;

      }



      if (form.state.trim()) {

        completed++;

      }



      if (

        form.municipality.trim()

      ) {

        completed++;

      }



      if (

        form.neighborhood.trim()

      ) {

        completed++;

      }



      if (

        form.postalCode.trim()

      ) {

        completed++;

      }



      if (

        selectedCategories.length >

        0

      ) {

        completed++;

      }



      return Math.round(

        (completed / total) * 100

      );

    }, [

      form,

      selectedCategories,

    ]);

const getServiceAreaKey = (

  area: ServiceArea

) =>

  `${area.stateCode}-${area.municipalityCode}`;



const saveServiceAreas = async (

  token: string

) => {

  const originalMap = new Map(

    originalServiceAreas.map(

      (area) => [

        getServiceAreaKey(area),

        area,

      ]

    )

  );



  const currentMap = new Map(

    serviceAreas.map(

      (area) => [

        getServiceAreaKey(area),

        area,

      ]

    )

  );



  const areasToCreate =

    serviceAreas.filter(

      (area) =>

        !originalMap.has(

          getServiceAreaKey(area)

        )

    );



  const areasToDelete =

    originalServiceAreas.filter(

      (area) =>

        !currentMap.has(

          getServiceAreaKey(area)

        )

    );



  for (const area of areasToDelete) {

    if (!area.id) {

      continue;

    }



    await api.delete(

      `/specialists/me/service-areas/${area.id}`,

      {

        headers: {

          Authorization:

            `Bearer ${token}`,

        },

      }

    );

  }



  for (const area of areasToCreate) {

    await api.post(

      '/specialists/me/service-areas',

      {

        stateCode:

          area.stateCode,



        stateName:

          area.stateName,



        municipalityCode:

          area.municipalityCode,



        municipalityName:

          area.municipalityName,

      },

      {

        headers: {

          Authorization:

            `Bearer ${token}`,

        },

      }

    );

  }

};

  const handleSave = async () => {

    try {

      console.log('💾 GUARDANDO PERFIL:', {

        form,

        selectedCategories,

      });

      const token =

        localStorage.getItem('token');

      if (!token) {

        navigate('/login');

        return;

      }

      console.log('💾 GUARDANDO xssssPERFIL:' );



      if (!form.phone.trim()) {

        setError(

          'Ingresa tu número de teléfono.'

        );

        return;

      }

      console.log('💾 GUARDANDO xsssssqqssssssPERFIL:' );



      if (

        !form.description.trim()

      ) {

        setError(

          'Agrega una descripción profesional.'

        );

        return;

      }



      if (

        selectedCategories.length ===

        0

      ) {

        setError(

          'Selecciona al menos una especialidad.'

        );

        return;

      }



      if (

        form.experience &&

        Number(form.experience) < 0

      ) {

        setError(

          'Los años de experiencia no pueden ser negativos.'

        );

        return;

      }



      setSaving(true);

      setError('');

      setSuccess('');



      await api.post(

        '/specialists/profile',

        {

          phone:

            form.phone.trim(),



          description:

            form.description.trim(),



          experience:

            form.experience

              ? Number(

                  form.experience

                )

              : null,



          state:

            form.state.trim(),



          municipality:

            form.municipality.trim(),



          neighborhood:

            form.neighborhood.trim(),



          postalCode:

            form.postalCode.trim(),



          address:

            form.address.trim(),

        },

        {

          headers: {

            Authorization:

              `Bearer ${token}`,

          },

        }

      );



      await api.put(

        '/specialists/specialties',

        {

          categoryIds:

            selectedCategories,

        },

        {

          headers: {

            Authorization:

              `Bearer ${token}`,

          },

        }

      );

if (serviceAreas.length === 0) {

  setError(

    'Selecciona al menos una zona donde prestas servicio.'

  );



  return;

}



await saveServiceAreas(token);

      setSuccess(

        'Tu perfil se actualizó correctamente.'

      );



      await loadProfile();

    } catch (requestError: any) {

      console.error(

        'ERROR GUARDANDO PERFIL:',

        requestError.response?.data ||

          requestError

      );



      setError(

        requestError.response?.data

          ?.message ||

          'No fue posible guardar los cambios.'

      );

    } finally {

      setSaving(false);

    }

  };



  if (loading) {

    return (

      <div className="my-profile-loading">

        <div className="my-profile-spinner" />



        <strong>

          Cargando tu perfil

        </strong>



        <span>

          Estamos preparando tu

          información profesional.

        </span>

      </div>

    );

  }



  return (

    <div className="my-profile-page">



      <header className="my-profile-header">

        <div className="my-profile-header-inner">



          <button

            type="button"

            className="my-profile-brand"

            onClick={() =>

              navigate('/')

            }

          >

            <img

              src={logo}

              alt="FASYN"

            />

          </button>



          <div className="my-profile-header-actions">



            <div className="my-profile-header-user">

              <span

                style={{

                  overflow: 'hidden',

                }}

              >

                {profilePhotoPreview ? (

                  <img

                    src={profilePhotoPreview}

                    alt={`Foto de ${user.name}`}

                    style={{

                      width: '100%',

                      height: '100%',

                      display: 'block',

                      objectFit: 'cover',

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

            </div>



            <button

              type="button"

              className="my-profile-back"

              onClick={() =>

                navigate(

                  '/specialist'

                )

              }

            >

              ← Volver al panel

            </button>



          </div>



        </div>

      </header>



      <main className="my-profile-main">



        <section className="my-profile-hero">



          <div>

            <span className="my-profile-eyebrow">

              MI PERFIL

            </span>



            <h1>

              Mi perfil profesional

            </h1>



            <p>

              Mantén actualizada tu

              información para que los

              clientes conozcan tu

              experiencia, especialidades

              y zona de trabajo.

            </p>

          </div>



          <div className="my-profile-progress-card">



            <div className="my-profile-progress-header">

              <span>

                PERFIL COMPLETADO

              </span>



              <strong>

                {completionPercentage}%

              </strong>

            </div>



            <div className="my-profile-progress-track">

              <div

                className="my-profile-progress-bar"

                style={{

                  width:

                    `${completionPercentage}%`,

                }}

              />

            </div>



            <small>

              Completa tu información

              para mejorar tu perfil.

            </small>



          </div>



        </section>



        {error && (

          <div className="my-profile-alert error">

            <span>!</span>



            <div>

              <strong>

                Revisa tu información

              </strong>



              <p>{error}</p>

            </div>

          </div>

        )}



        {success && (

          <div className="my-profile-alert success">

            <span>✓</span>



            <div>

              <strong>

                Cambios guardados

              </strong>



              <p>{success}</p>

            </div>

          </div>

        )}



        <div className="my-profile-layout">



          <aside className="my-profile-sidebar">



            <div

              className="my-profile-avatar"

              style={{

                overflow: 'hidden',

              }}

            >

              {profilePhotoPreview ? (

                <img

                  src={profilePhotoPreview}

                  alt={`Foto de ${user.name}`}

                  style={{

                    width: '100%',

                    height: '100%',

                    display: 'block',

                    objectFit: 'cover',

                  }}

                />

              ) : (

                initials

              )}

            </div>



            <h2>

              {user.name}

            </h2>



            <p className="my-profile-email">

              {user.email}

            </p>



            <span className="my-profile-role">

              ESPECIALISTA FASYN

            </span>



            <div className="my-profile-sidebar-divider" />



            <div className="my-profile-status">

              <span />



              {profile?.available !== false

                ? 'Disponible'

                : 'No disponible'}

            </div>



            <div className="my-profile-sidebar-info">



              <div>

                <span>

                  Especialidades

                </span>



                <strong>

                  {

                    selectedCategories.length

                  }

                </strong>

              </div>



              <div>

                <span>

                  Experiencia

                </span>



                <strong>

                  {form.experience

                    ? `${form.experience} ${

                        Number(

                          form.experience

                        ) === 1

                          ? 'año'

                          : 'años'

                      }`

                    : 'Sin definir'}

                </strong>

              </div>



            </div>



            <div className="my-profile-photo-card">



              <div

                className="my-profile-photo-icon"

                style={{

                  overflow: 'hidden',

                }}

              >

                {profilePhotoPreview ? (

                  <img

                    src={profilePhotoPreview}

                    alt="Foto profesional"

                    style={{

                      width: '100%',

                      height: '100%',

                      display: 'block',

                      objectFit: 'cover',

                    }}

                  />

                ) : (

                  '+'

                )}

              </div>



              <div>

                <strong>

                  Foto profesional

                </strong>



                <p>

                  {uploadingPhoto

                    ? 'Subiendo tu nueva foto...'

                    : profilePhotoPreview

                      ? 'Tu foto está guardada. Puedes cambiarla cuando quieras.'

                      : 'Agrega una fotografía profesional a tu perfil.'}

                </p>



                <input

                  ref={

                    profilePhotoInputRef

                  }

                  type="file"

                  accept="image/jpeg,image/png,image/webp"

                  style={{

                    display: 'none',

                  }}

                  onChange={

                    handleProfilePhotoChange

                  }

                />



                <button

                  type="button"

                  disabled={

                    uploadingPhoto

                  }

                  onClick={() =>

                    profilePhotoInputRef.current?.click()

                  }

                  style={{

                    marginTop: '10px',

                    border: 'none',

                    borderRadius: '8px',

                    padding:

                      '9px 14px',

                    cursor:

                      uploadingPhoto

                        ? 'not-allowed'

                        : 'pointer',

                    fontWeight: 700,

                  }}

                >

                  {uploadingPhoto

                    ? 'Subiendo...'

                    : profilePhotoPreview

                      ? 'Cambiar foto'

                      : 'Agregar foto'}

                </button>

              </div>



            </div>



          </aside>



          <section className="my-profile-form-card">



            <section className="my-profile-section">



              <div className="my-profile-section-title">



                <span>01</span>



                <div>

                  <h2>

                    Información profesional

                  </h2>



                  <p>

                    Estos datos ayudarán a

                    los clientes a conocerte

                    mejor.

                  </p>

                </div>



              </div>



              <div className="my-profile-grid">



                <div className="my-profile-field">



                  <label>

                    Nombre completo

                  </label>



                  <input

                    type="text"

                    value={user.name}

                    disabled

                  />



                  <small>

                    El nombre corresponde

                    a tu cuenta.

                  </small>



                </div>



                <div className="my-profile-field">



                  <label>

                    Correo electrónico

                  </label>



                  <input

                    type="email"

                    value={user.email}

                    disabled

                  />



                  <small>

                    El correo corresponde

                    a tu cuenta.

                  </small>



                </div>



                <div className="my-profile-field">



                  <label>

                    Teléfono

                  </label>



                  <input

                    type="tel"

                    placeholder="Ej. 5512345678"

                    value={form.phone}

                    onChange={(event) =>

                      handleChange(

                        'phone',

                        event.target.value

                      )

                    }

                  />



                </div>



                <div className="my-profile-field">



                  <label>

                    Años de experiencia

                  </label>



                  <input

                    type="number"

                    min="0"

                    max="80"

                    placeholder="Ej. 5"

                    value={

                      form.experience

                    }

                    onChange={(event) =>

                      handleChange(

                        'experience',

                        event.target.value

                      )

                    }

                  />



                </div>



              </div>



              <div className="my-profile-field full">



                <div className="my-profile-label-row">



                  <label>

                    Descripción profesional

                  </label>



                  <span>

                    {

                      form.description

                        .length

                    }

                    /500

                  </span>



                </div>



                <textarea

                  maxLength={500}

                  placeholder="Ej. Tengo más de 8 años de experiencia realizando trabajos de carpintería residencial, fabricación de muebles y reparaciones..."

                  value={

                    form.description

                  }

                  onChange={(event) =>

                    handleChange(

                      'description',

                      event.target.value

                    )

                  }

                />



                <small>

                  Describe tu experiencia,

                  fortalezas y los trabajos

                  que realizas.

                </small>



              </div>



            </section>



            <div className="my-profile-divider" />



            <section className="my-profile-section">



              <div className="my-profile-section-title">



                <span>02</span>



                <div>

                  <h2>

                    Especialidades

                  </h2>



                  <p>

                    Selecciona todas las

                    áreas en las que puedes

                    trabajar.

                  </p>

                </div>



              </div>



              {categories.length > 0 ? (

                <div className="my-profile-specialties">



                  {categories.map(

                    (category) => {

                      const selected =

                        selectedCategories.includes(

                          category.id

                        );



                      return (

                        <button

                          key={

                            category.id

                          }

                          type="button"

                          className={

                            selected

                              ? 'my-profile-specialty selected'

                              : 'my-profile-specialty'

                          }

                          onClick={() =>

                            toggleCategory(

                              category.id

                            )

                          }

                        >

                          <span>

                            {selected

                              ? '✓'

                              : '+'}

                          </span>



                          {formatCategoryName(

                            category.name

                          )}

                        </button>

                      );

                    }

                  )}



                </div>

              ) : (

                <div className="my-profile-empty">

                  No hay especialidades

                  registradas.

                </div>

              )}



              <div className="my-profile-selected-info">

                <span>

                  {

                    selectedCategories.length

                  }

                </span>



                {selectedCategories.length ===

                1

                  ? ' especialidad seleccionada'

                  : ' especialidades seleccionadas'}

              </div>



            </section>



            <div className="my-profile-divider" />



            <section className="my-profile-section">



              <div className="my-profile-section-title">



                <span>03</span>



                <div>

                  <h2>

                    Ubicación

                  </h2>



                  <p>

                    Indica la zona desde

                    donde ofreces tus

                    servicios.

                  </p>

                </div>



              </div>



              <div className="my-profile-grid">



                <div className="my-profile-field">



                  <label>

                    Estado

                  </label>



                  <input

                    type="text"

                    placeholder="Ej. Ciudad de México"

                    value={form.state}

                    onChange={(event) =>

                      handleChange(

                        'state',

                        event.target.value

                      )

                    }

                  />



                </div>



                <div className="my-profile-field">



                  <label>

                    Municipio / Alcaldía

                  </label>



                  <input

                    type="text"

                    placeholder="Ej. Miguel Hidalgo"

                    value={

                      form.municipality

                    }

                    onChange={(event) =>

                      handleChange(

                        'municipality',

                        event.target.value

                      )

                    }

                  />



                </div>



                <div className="my-profile-field">



                  <label>

                    Colonia

                  </label>



                  <input

                    type="text"

                    placeholder="Ej. Anáhuac"

                    value={

                      form.neighborhood

                    }

                    onChange={(event) =>

                      handleChange(

                        'neighborhood',

                        event.target.value

                      )

                    }

                  />



                </div>



                <div className="my-profile-field">



                  <label>

                    Código postal

                  </label>



                  <input

                    type="text"

                    inputMode="numeric"

                    maxLength={5}

                    placeholder="Ej. 11320"

                    value={

                      form.postalCode

                    }

                    onChange={(event) =>

                      handleChange(

                        'postalCode',

                        event.target.value.replace(

                          /\D/g,

                          ''

                        )

                      )

                    }

                  />



                </div>



              </div>



              <div className="my-profile-field full">



                <label>

                  Dirección

                </label>



                <input

                  type="text"

                  placeholder="Calle, número y referencias"

                  value={

                    form.address

                  }

                  onChange={(event) =>

                    handleChange(

                      'address',

                      event.target.value

                    )

                  }

                />



                <small>

                  Esta información puede

                  utilizarse para definir

                  mejor tu zona de trabajo.

                </small>



              </div>



            </section>

<div className="my-profile-divider" />



<section className="my-profile-section">



  <div className="my-profile-section-title">



    <span>04</span>



    <div>

      <h2>

        Zonas de servicio

      </h2>



      <p>

        Selecciona las zonas donde

        estás disponible para realizar

        trabajos.

      </p>

    </div>



  </div>



 <div className="coverage-control-card">
  <div className="coverage-control-info">
    <div className="coverage-control-icon">
      📍
    </div>

    <div>
      <span className="coverage-control-label">
        COBERTURA DE SERVICIO
      </span>

      <h3>
        Define desde dónde trabajas
      </h3>

      <p>
        Mostraremos únicamente los municipios
        disponibles dentro de un radio de 80 km
        desde tu ubicación.
      </p>
    </div>
  </div>

  <div className="coverage-location-actions">
    <button
      type="button"
      className="coverage-location-btn primary"
      disabled={
        locating ||
        resolvingRegisteredLocation
      }
      onClick={
        getCurrentLocation
      }
    >
      <span className="coverage-btn-icon">
        ◎
      </span>

      <span className="coverage-btn-content">
        <strong>
          {locating
            ? 'Obteniendo ubicación...'
            : 'Mi ubicación actual'}
        </strong>

        <small>
          Usar la ubicación de este dispositivo
        </small>
      </span>
    </button>

    <button
      type="button"
      className="coverage-location-btn secondary"
      disabled={
        resolvingRegisteredLocation ||
        locating
      }
      onClick={() => {
        void useRegisteredLocation();
      }}
    >
      <span className="coverage-btn-icon">
        ⌂
      </span>

      <span className="coverage-btn-content">
        <strong>
          {resolvingRegisteredLocation
            ? 'Localizando domicilio...'
            : 'Domicilio registrado'}
        </strong>

        <small>
          Usar la dirección guardada en tu perfil
        </small>
      </span>
    </button>
  </div>

  {currentLocation && (
    <div className="coverage-location-status">
      <span className="coverage-status-dot" />

      <span>
        Ubicación establecida. Mostrando zonas
        dentro de <strong>80 km</strong>.
      </span>
    </div>
  )}
</div>


  {locationError && (

    <div className="my-profile-alert error">

      <span>!</span>



      <div>

        <strong>

          Ubicación

        </strong>



        <p>

          {locationError}

        </p>

      </div>

    </div>

  )}



  <ServiceAreaGoogleMap

    currentLocation={

      currentLocation

    }

    geoJson={

      municipalitiesGeoJson

    }

    serviceAreas={

      serviceAreas

    }

    loading={

      loadingMunicipalities

    }

    error={mapError}

    onChange={(areas) => {

      setServiceAreas(

        areas

      );



      setError('');

    }}

    onError={(message) => {

      setMapError(message);

      setError(message);

    }}

  />



  {serviceAreas.length > 0 ? (

    <div className="my-profile-service-areas">



      {serviceAreas.map(

        (area) => (

          <div

            key={

              `${area.stateCode}-${area.municipalityCode}`

            }

            className="my-profile-service-area"

          >

            <div>

              <strong>

                {

                  area.municipalityName

                }

              </strong>



              <span>

                {area.stateName}

              </span>

            </div>



            <button

              type="button"

              onClick={() =>

                setServiceAreas(

                  (current) =>

                    current.filter(

                      (item) =>

                        getServiceAreaKey(

                          item

                        ) !==

                        getServiceAreaKey(

                          area

                        )

                    )

                )

              }

            >

              Eliminar

            </button>

          </div>

        )

      )}



    </div>

  ) : (

    <div className="my-profile-empty">

      Todavía no has seleccionado

      zonas de servicio.

    </div>

  )}



</section>

            <div className="my-profile-actions">



              <button

                type="button"

                className="my-profile-cancel"

                disabled={saving}

                onClick={() =>

                  navigate(

                    '/specialist'

                  )

                }

              >

                Cancelar

              </button>



              <button

                type="button"

                className="my-profile-save"

                disabled={saving}

                onClick={handleSave}

              >

                {saving

                  ? 'Guardando...'

                  : 'Guardar cambios'}

              </button>



            </div>



          </section>



        </div>



      </main>



    </div>

  );

};



export default MyProfile;