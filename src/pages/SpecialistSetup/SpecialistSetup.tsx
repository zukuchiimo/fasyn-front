import {

  useEffect,

  useMemo,

  useState,

} from 'react';





import {



  Link,



  useNavigate,



} from 'react-router-dom';





import ServiceAreaGoogleMap



  from '../../components/ServiceAreaGoogleMap/ServiceAreaGoogleMap';





import { api } from '../../api/api';



import logo from '../../assets/logo.png';





import './SpecialistSetup.css';
import './SpecialistSetup.legal.css';





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







/*

  Para no congelar la pantalla ya no cargamos los 32 estados.

  Solo cargamos el estado del domicilio y sus estados vecinos.

  El filtro exacto de 100 km se realiza dentro de ServiceAreaGoogleMap.

*/

const SERVICE_AREA_NEIGHBOR_STATES: Record<string, string[]> = {

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



const getServiceAreaStateCodes = (stateCode: string) => {

  const initialStateCode = stateCode || '09';



  return Array.from(

    new Set([

      initialStateCode,

      ...(SERVICE_AREA_NEIGHBOR_STATES[initialStateCode] || []),

    ])

  );

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

const TOTAL_STEPS = 6;





const resolveStoredFileUrl = (fileUrl?: string | null) => {
  if (!fileUrl) return '';

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

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [legalModal, setLegalModal] = useState<
    'terms' | 'privacy' | null
  >(null);





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



        const initialStateCode =

          currentStateCode || '09';



        const stateCodes =

          getServiceAreaStateCodes(

            initialStateCode

          );



        /*

          Cargamos solo el estado del especialista

          y los estados vecinos. Esto evita cargar

          todo México y mantiene fluida la selección.

        */

        const results =

          await Promise.all(

            stateCodes.map(

              async (stateCode) => {

                try {

                  return await loadStateMunicipalities(

                    stateCode

                  );

                } catch (stateLoadError) {

                  console.warn(

                    `No se pudieron cargar los municipios del estado ${stateCode}:`,

                    stateLoadError

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



        setMunicipalitiesGeoJson({

          type: 'FeatureCollection',

          features,

        });

      } catch (mapLoadError) {

        console.error(

          'ERROR CARGANDO MUNICIPIOS:',

          mapLoadError

        );



        if (!cancelled) {

          setMapError(

            'No fue posible cargar las zonas cercanas. Revisa tu conexión e inténtalo nuevamente.'

          );

        }

      } finally {

        if (!cancelled) {

          setLoadingMunicipalities(false);

        }

      }

    };





    void loadMunicipalities();





    return () => {



      cancelled = true;



    };



  }, [step, currentStateCode]);

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

    if (step === 6 && !termsAccepted) {
      setError(
        'Debes leer y aceptar los Términos y Condiciones de Uso.'
      );

      return false;
    }

    if (step === 6 && !privacyAccepted) {
      setError(
        'Debes leer y aceptar el Aviso de Privacidad.'
      );

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

      if (!termsAccepted || !privacyAccepted) {
        setError(
          'Para finalizar tu perfil debes aceptar los Términos y Condiciones y el Aviso de Privacidad.'
        );
        setStep(6);
        return;
      }



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



                    <h2>

                      Selecciona dónde prestas servicio

                    </h2>



                    <p>

                      La cobertura está limitada a 100 km alrededor de tu

                      ubicación. Las zonas fuera del círculo quedan bloqueadas

                      y las zonas disponibles tienen controles más grandes para

                      que puedas seleccionarlas sin dificultad.

                    </p>

                  </div>



                  {loadingMunicipalities && (

                    <span className="map-resolving">

                      Cargando zonas de México...

                    </span>

                  )}

                </div>



                <ServiceAreaGoogleMap

                  currentLocation={currentLocation}

                  geoJson={municipalitiesGeoJson}

                  serviceAreas={serviceAreas}

                  loading={loadingMunicipalities}

                  error={mapError}

                  onChange={(areas) => {

                    setServiceAreas(areas);

                    setError('');

                  }}

                  onError={(message) => {

                    setMapError(message);

                    setError(message);

                  }}

                />



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

                  <h1>Revisa y acepta para finalizar</h1>

                  <p>
                    Confirma la información de tu perfil y revisa los
                    documentos que regulan el uso de FASYN.
                  </p>
                </div>

                <div className="setup-review">
                  <div className="review-row">
                    <span>Experiencia</span>
                    <strong>{form.experience || '0'} años</strong>
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

                <div className="legal-summary-card">
 
                  <div>
              

                    <button
                      type="button"
                      className="legal-inline-button"
                      onClick={() => setLegalModal('terms')}
                    >
                      Ver detalle de la comisión
                    </button>
                  </div>
                </div>

                <div className="legal-acceptance">
                  <div className="legal-acceptance-title">
                    <span>ACUERDOS Y PRIVACIDAD</span>
                    <h2>Antes de finalizar</h2>
                    <p>
                      Revisa cada documento y acepta ambos para completar
                      tu registro profesional.
                    </p>
                  </div>

                  <label
                    className={
                      termsAccepted
                        ? 'legal-check-card accepted'
                        : 'legal-check-card'
                    }
                  >
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(event) => {
                        setTermsAccepted(event.target.checked);
                        setError('');
                      }}
                    />

                    <span className="legal-custom-check">
                      {termsAccepted ? '✓' : ''}
                    </span>

                    <div className="legal-check-copy">
                      <strong>Términos y Condiciones de Uso</strong>

                      <p>
                        Incluyen las reglas de uso, pagos, comisión del
                        15%, cancelaciones y obligaciones del especialista.
                      </p>

                      <button
                        type="button"
                        className="legal-link-button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setLegalModal('terms');
                        }}
                      >
                        Leer Términos y Condiciones
                      </button>
                    </div>
                  </label>

                  <label
                    className={
                      privacyAccepted
                        ? 'legal-check-card accepted'
                        : 'legal-check-card'
                    }
                  >
                    <input
                      type="checkbox"
                      checked={privacyAccepted}
                      onChange={(event) => {
                        setPrivacyAccepted(event.target.checked);
                        setError('');
                      }}
                    />

                    <span className="legal-custom-check">
                      {privacyAccepted ? '✓' : ''}
                    </span>

                    <div className="legal-check-copy">
                      <strong>Aviso de Privacidad</strong>

                      <p>
                        Explica cómo se utilizan tus datos personales,
                        ubicación, fotografía e identificación.
                      </p>

                      <button
                        type="button"
                        className="legal-link-button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setLegalModal('privacy');
                        }}
                      >
                        Leer Aviso de Privacidad
                      </button>
                    </div>
                  </label>

                  <div className="legal-acceptance-note">
                    El botón “Finalizar perfil” se habilita cuando ambos
                    documentos hayan sido aceptados.
                  </div>
                </div>
              </section>
            )}

            {legalModal && (
              <div
                className="legal-modal-backdrop"
                role="presentation"
                onMouseDown={() => setLegalModal(null)}
              >
                <section
                  className="legal-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="legal-modal-title"
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <div className="legal-modal-header">
                    <div>
                      <span>
                        {legalModal === 'terms'
                          ? 'DOCUMENTO LEGAL'
                          : 'PRIVACIDAD'}
                      </span>

                      <h2 id="legal-modal-title">
                        {legalModal === 'terms'
                          ? 'Términos y Condiciones de Uso'
                          : 'Aviso de Privacidad'}
                      </h2>
                    </div>

                    <button
                      type="button"
                      className="legal-modal-close"
                      onClick={() => setLegalModal(null)}
                      aria-label="Cerrar"
                    >
                      ×
                    </button>
                  </div>

                  <div className="legal-modal-body">
                    {legalModal === 'terms' ? (
                      <>
                        <p className="legal-document-intro">
                          Estos Términos regulan el uso de FASYN por
                          especialistas que ofrecen servicios a clientes
                          mediante la plataforma.
                        </p>

                        <h3>1. Uso de FASYN</h3>
                        <p>
                          El especialista deberá proporcionar información
                          verdadera, mantenerla actualizada y utilizar la
                          plataforma únicamente para ofrecer servicios
                          lícitos.
                        </p>

                        <h3>2. Perfil e identidad</h3>
                        <p>
                          FASYN puede solicitar información profesional,
                          fotografía e identificación para verificar el
                          perfil. El registro no crea por sí mismo una
                          relación laboral entre FASYN y el especialista.
                        </p>

                        <h3>3. Solicitudes y prestación del servicio</h3>
                        <p>
                          El especialista es responsable de revisar cada
                          solicitud, confirmar que puede realizar el trabajo
                          y cumplir las condiciones acordadas con el cliente.
                        </p>

                        <h3>4. Precios y pagos</h3>
                        <p>
                          Los servicios pueden establecerse por hora, día,
                          actividad u otra modalidad disponible. En pagos
                          procesados dentro de FASYN podrá mostrarse el monto
                          bruto, las deducciones y el monto neto.
                        </p>

                        <div className="legal-highlight">
                          <span>COMISIÓN FASYN</span>
                          <strong>15%</strong>

                          <p>
                            Por cada servicio contratado, pagado y completado
                            a través de FASYN se aplicará una comisión del
                            15% del importe del servicio. El especialista
                            podrá consultar el monto bruto, la comisión
                            aplicada y el monto neto correspondiente.
                          </p>
                        </div>

                        <h3>5. Cancelaciones y reembolsos</h3>
                        <p>
                          Las cancelaciones, reembolsos o ajustes se
                          sujetarán a las reglas aplicables a cada operación.
                          Un reembolso puede modificar el monto final sujeto
                          a comisión.
                        </p>

                        <h3>6. Obligaciones del especialista</h3>
                        <p>
                          El especialista debe prestar el servicio con
                          diligencia, proteger la información del cliente y
                          abstenerse de realizar conductas fraudulentas,
                          engañosas o ilícitas.
                        </p>

                        <h3>7. Obligaciones fiscales y profesionales</h3>
                        <p>
                          Cada especialista es responsable de cumplir las
                          obligaciones fiscales, administrativas y
                          profesionales aplicables a su actividad.
                        </p>

                        <h3>8. Suspensión de cuenta</h3>
                        <p>
                          FASYN podrá limitar o suspender cuentas ante
                          incumplimientos, información falsa, fraude, uso
                          indebido o riesgos para otros usuarios.
                        </p>

                        <h3>9. Cambios a los Términos</h3>
                        <p>
                          Los cambios relevantes podrán mostrarse mediante
                          una nueva versión y podrá solicitarse una nueva
                          aceptación cuando corresponda.
                        </p>

                        <div className="legal-draft-warning">
                          Texto base para desarrollo. Antes de producción
                          debe revisarse jurídicamente y completarse con
                          razón social, domicilio, jurisdicción y demás
                          datos legales de FASYN.
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="legal-document-intro">
                          Este Aviso describe de forma general el tratamiento
                          de los datos personales proporcionados durante el
                          registro y uso de FASYN.
                        </p>

                        <h3>1. Responsable</h3>
                        <p>
                          Responsable:
                          <strong> [RAZÓN SOCIAL PENDIENTE]</strong>.
                          Domicilio y contacto de privacidad:
                          <strong> [PENDIENTE]</strong>.
                        </p>

                        <h3>2. Datos que pueden recabarse</h3>
                        <p>
                          Datos de identificación y contacto, información
                          profesional, teléfono, ubicación y domicilio,
                          fotografía, imágenes de identificación,
                          especialidades, zonas de servicio y datos
                          relacionados con solicitudes, pagos y uso.
                        </p>

                        <h3>3. Finalidades principales</h3>
                        <p>
                          Crear y administrar la cuenta; verificar identidad
                          y perfil; mostrar información profesional a
                          clientes; calcular cobertura; gestionar solicitudes
                          y operaciones; prevenir fraude; brindar soporte y
                          mantener la seguridad de la plataforma.
                        </p>

                        <h3>4. Identificación oficial</h3>
                        <p>
                          Las imágenes de identificación se utilizan para
                          verificación y seguridad del perfil y no deben
                          mostrarse públicamente a otros usuarios.
                        </p>

                        <h3>5. Ubicación</h3>
                        <p>
                          La ubicación puede utilizarse para identificar el
                          domicilio general del especialista, calcular el
                          radio de cobertura y determinar zonas disponibles.
                        </p>

                        <h3>6. Conservación y seguridad</h3>
                        <p>
                          Los datos deberán conservarse durante el tiempo
                          necesario para las finalidades informadas y
                          protegerse con medidas razonables de seguridad.
                        </p>

                        <h3>7. Derechos sobre los datos</h3>
                        <p>
                          El titular podrá solicitar acceso, rectificación,
                          cancelación u oposición y ejercer otros derechos
                          aplicables mediante el canal de privacidad que
                          FASYN defina.
                        </p>

                        <h3>8. Cambios al Aviso</h3>
                        <p>
                          Los cambios relevantes deberán ponerse a
                          disposición de los usuarios mediante la plataforma
                          o el medio que se establezca.
                        </p>

                        <div className="legal-draft-warning">
                          Antes de producción completa razón social,
                          domicilio, correo de privacidad, procedimiento
                          ARCO, transferencias de datos y demás elementos
                          que determine tu asesoría jurídica.
                        </div>
                      </>
                    )}
                  </div>

                  <div className="legal-modal-footer">
                    <button
                      type="button"
                      className="legal-modal-secondary"
                      onClick={() => setLegalModal(null)}
                    >
                      Cerrar
                    </button>

                    <button
                      type="button"
                      className="legal-modal-primary"
                      onClick={() => {
                        if (legalModal === 'terms') {
                          setTermsAccepted(true);
                        } else {
                          setPrivacyAccepted(true);
                        }

                        setError('');
                        setLegalModal(null);
                      }}
                    >
                      {legalModal === 'terms'
                        ? 'Aceptar términos'
                        : 'Aceptar aviso'}
                    </button>
                  </div>
                </section>
              </div>
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



                  disabled={
                    saving ||
                    !termsAccepted ||
                    !privacyAccepted
                  }



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