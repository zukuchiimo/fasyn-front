import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Circle,
  GoogleMap,
  MarkerF,
  useJsApiLoader,
} from '@react-google-maps/api';
import './ServiceAreaGoogleMap.css';
export interface Coordinates {
  latitude: number;
  longitude: number;
}
export interface ServiceArea {
  id?: number;
  stateCode: string;
  stateName: string;
  municipalityCode: string;
  municipalityName: string;
}
interface Props {
  currentLocation: Coordinates | null;
  geoJson: any | null;
  serviceAreas: ServiceArea[];
  loading?: boolean;
  error?: string;
  onChange: (areas: ServiceArea[]) => void;
  onError?: (message: string) => void;
}
type ZonePoint = {
  key: string;
  area: ServiceArea;
  lat: number;
  lng: number;
  distanceKm: number;
};
type FeatureMeta = {
  area: ServiceArea;
  center: google.maps.LatLng;
  distanceKm: number;
  allowed: boolean;
};
const MAX_DISTANCE_KM = 80;
const MAX_DISTANCE_METERS = MAX_DISTANCE_KM * 1000;
const ZONE_MARKER_SCALE = 10;
const DEFAULT_CENTER = {
  lat: 23.6345,
  lng: -102.5528,
};
const MAP_STYLE = {
  width: '100%',
  height: '560px',
};
const GOOGLE_MAP_LIBRARIES: ('geometry')[] = ['geometry'];
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
const normalizeCode = (
  value: unknown,
  length: number
) => {
  const text = String(value ?? '').trim();
  if (!text) {
    return '';
  }
  return text.padStart(length, '0');
};
const normalizeAreaText = (
  value: unknown
) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
const normalizeStateForMatch = (
  value: unknown
) => {
  const normalized =
    normalizeAreaText(value);
  if (
    normalized === 'mexico' ||
    normalized === 'estado de mexico'
  ) {
    return 'estado de mexico';
  }
  if (
    normalized === 'distrito federal' ||
    normalized === 'ciudad de mexico'
  ) {
    return 'ciudad de mexico';
  }
  return normalized;
};
const getAreaKey = (
  area: ServiceArea
) => {
  if (
    area.stateCode &&
    area.municipalityCode
  ) {
    return `${area.stateCode}-${area.municipalityCode}`;
  }
  return `name:${normalizeStateForMatch(
    area.stateName
  )}:${normalizeAreaText(
    area.municipalityName
  )}`;
};
const normalizeText = (
  value: unknown
) =>
  String(value ?? '')
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
    (acc, [code, name]) => {
      acc[
        normalizeText(name)
      ] = code;
      return acc;
    },
    {}
  );
STATE_NAME_TO_CODE[
  'distrito federal'
] = '09';
STATE_NAME_TO_CODE[
  'mexico'
] = '15';
 const getFeatureArea = (
  feature: google.maps.Data.Feature,
  savedAreas: ServiceArea[]
): ServiceArea | null => {
  const stateName =
    String(
      feature.getProperty('NAME_1') ??
        ''
    ).trim();
  const municipalityName =
    String(
      feature.getProperty('NAME_2') ??
        ''
    ).trim();
  if (
    !stateName ||
    !municipalityName
  ) {
    return null;
  }
  /*
    El GeoJSON que usamos no contiene
    claves INEGI.
    Por eso buscamos si este polígono
    corresponde a una zona que ya tenemos
    guardada en la BD.
  */
  const savedArea =
    savedAreas.find(
      (area) =>
        normalizeStateForMatch(
          area.stateName
        ) ===
          normalizeStateForMatch(
            stateName
          ) &&
        normalizeAreaText(
          area.municipalityName
        ) ===
          normalizeAreaText(
            municipalityName
          )
    );
  /*
    Si ya estaba guardada, regresamos
    el objeto REAL de la BD.
    Así conservamos:
    stateCode
    municipalityCode
  */
  if (savedArea) {
    return savedArea;
  }
  /*
    Municipio disponible en el mapa,
    pero todavía sin clave INEGI.
  */
  return {
    stateCode: '',
    stateName,
    municipalityCode: '',
    municipalityName,
  };
};
const getFeatureCenter = (
  feature: google.maps.Data.Feature
) => {
  const geometry = feature.getGeometry();
  if (!geometry) {
    return null;
  }
  const bounds = new google.maps.LatLngBounds();
  geometry.forEachLatLng((latLng) => {
    bounds.extend(latLng);
  });
  if (bounds.isEmpty()) {
    return null;
  }
  return bounds.getCenter();
};
interface ZoneMarkerProps {
  zone: ZonePoint;
  onToggle: (area: ServiceArea) => void;
}
const ZoneMarker = memo(
  ({ zone, onToggle }: ZoneMarkerProps) => (
    <MarkerF
      position={{
        lat: zone.lat,
        lng: zone.lng,
      }}
      title={`${zone.area.municipalityName}, ${zone.area.stateName} · ${Math.round(
        zone.distanceKm
      )} km`}
      onClick={() => onToggle(zone.area)}
      zIndex={200}
      icon={{
        path: google.maps.SymbolPath.CIRCLE,
        scale: ZONE_MARKER_SCALE,
        fillColor: '#4f6df5',
        fillOpacity: 0.88,
        strokeColor: '#ffffff',
        strokeOpacity: 1,
        strokeWeight: 3,
      }}
    />
  )
);
ZoneMarker.displayName = 'ZoneMarker';
const ServiceAreaGoogleMap = ({
  currentLocation,
  geoJson,
  serviceAreas,
  loading = false,
  error = '',
  onChange,
  onError,
}: Props) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const featureMetaRef = useRef<
    WeakMap<google.maps.Data.Feature, FeatureMeta>
  >(new WeakMap());
  const clickListenerRef =
    useRef<google.maps.MapsEventListener | null>(null);
const geoDebugPrintedRef =
  useRef(false);
  const selectedAreasRef =
    useRef<ServiceArea[]>(serviceAreas);
  const selectedAreaKeysRef =
    useRef<Set<string>>(
      new Set(serviceAreas.map(getAreaKey))
    );
  const onChangeRef = useRef(onChange);
  const onErrorRef = useRef(onError);
  /*
    Evita hacer fitBounds otra vez cuando solo
    seleccionas/deseleccionas una zona.
  */
  const lastFittedLocationRef =
    useRef<string>('');
  const [mapReady, setMapReady] =
    useState(false);
  const [zonePoints, setZonePoints] =
    useState<ZonePoint[]>([]);
  useEffect(() => {
    selectedAreasRef.current = serviceAreas;
    selectedAreaKeysRef.current = new Set(
      serviceAreas.map(getAreaKey)
    );console.log(
  '🟢 SERVICE AREAS REALES:',
  JSON.stringify(serviceAreas, null, 2)
);
console.log(
  '🔎 NAUCALPAN EN BD:',
  serviceAreas.find(
    (area) =>
      normalizeAreaText(
        area.municipalityName
      ).includes('naucalpan')
  )
);
console.log(
  '🔎 TULTITLAN EN BD:',
  serviceAreas.find(
    (area) =>
      normalizeAreaText(
        area.municipalityName
      ).includes('tultitlan')
  )
);
    /*
      Solo repintamos el Data Layer.
      NO eliminamos ni volvemos a cargar el GeoJSON.
    */
    const map = mapRef.current;
    if (map) {
      map.data.setStyle((feature) => {
        const meta =
          featureMetaRef.current.get(feature);
        if (!meta) {
          return {
            visible: false,
          };
        }
        const selected =
          selectedAreaKeysRef.current.has(
            getAreaKey(meta.area)
          );
        if (selected) {
          return {
            visible: true,
            fillColor: '#22c55e',
            fillOpacity: 0.58,
            strokeColor: '#15803d',
            strokeOpacity: 1,
            strokeWeight: 3,
            clickable: true,
            cursor: 'pointer',
          };
        }
        if (!meta.allowed) {
          return {
            visible: false,
            clickable: false,
          };
        }
        return {
          visible: true,
          fillColor: '#4f6df5',
          fillOpacity: 0.28,
          strokeColor: '#3157d5',
          strokeOpacity: 0.95,
          strokeWeight: 2,
          clickable: true,
          cursor: 'pointer',
        };
      });
    }
  }, [serviceAreas]);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);
  const {
    isLoaded,
    loadError,
  } = useJsApiLoader({
    id: 'fasyn-google-map',
    googleMapsApiKey:
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAP_LIBRARIES,
  });
  const center = useMemo(() => {
    if (!currentLocation) {
      return DEFAULT_CENTER;
    }
    return {
      lat: currentLocation.latitude,
      lng: currentLocation.longitude,
    };
  }, [currentLocation]);
const toggleArea = useCallback(
  (area: ServiceArea) => {
    if (
      !area.stateCode ||
      !area.municipalityCode
    ) {
      console.warn(
        '⚠️ NO SE GUARDA ZONA SIN CLAVE:',
        area
      );
      onErrorRef.current?.(
        `No se pudo obtener la clave oficial de ${area.municipalityName}.`
      );
      return;
    }
    const current =
      selectedAreasRef.current;
    const key =
      getAreaKey(area);
    const exists =
      selectedAreaKeysRef.current.has(
        key
      );
    const next = exists
      ? current.filter(
          (item) =>
            getAreaKey(item) !== key
        )
      : [
          ...current,
          area,
        ];
    selectedAreasRef.current =
      next;
    selectedAreaKeysRef.current =
      new Set(
        next.map(getAreaKey)
      );
    const map =
      mapRef.current;
    if (map) {
      map.data.setStyle(
        (feature) => {
          const meta =
            featureMetaRef.current.get(
              feature
            );
          if (!meta) {
            return {
              visible: false,
            };
          }
          const selected =
            selectedAreaKeysRef.current.has(
              getAreaKey(
                meta.area
              )
            );
          if (selected) {
            return {
              visible: true,
              fillColor: '#22c55e',
              fillOpacity: 0.58,
              strokeColor: '#15803d',
              strokeOpacity: 1,
              strokeWeight: 3,
              clickable: true,
              cursor: 'pointer',
            };
          }
          if (!meta.allowed) {
            return {
              visible: false,
              clickable: false,
            };
          }
          return {
            visible: true,
            fillColor: '#4f6df5',
            fillOpacity: 0.28,
            strokeColor: '#3157d5',
            strokeOpacity: 0.95,
            strokeWeight: 2,
            clickable: true,
            cursor: 'pointer',
          };
        }
      );
    }
    onChangeRef.current(next);
    onErrorRef.current?.('');
  },
  []
);
  const fitCoverageCircle = useCallback(
    (map: google.maps.Map) => {
      if (
        !currentLocation ||
        !window.google?.maps
      ) {
        return;
      }
      const locationKey =
        `${currentLocation.latitude.toFixed(6)}:` +
        `${currentLocation.longitude.toFixed(6)}`;
      /*
        Esta es la corrección del "mapa se hace
        chiquito": solo hacemos fit una vez por
        ubicación real, jamás al seleccionar zonas.
      */
      if (
        lastFittedLocationRef.current ===
        locationKey
      ) {
        return;
      }
      const latDelta =
        MAX_DISTANCE_KM / 111;
      const longitudeFactor =
        Math.max(
          Math.cos(
            (currentLocation.latitude * Math.PI) /
              180
          ),
          0.2
        );
      const lngDelta =
        MAX_DISTANCE_KM /
        (111 * longitudeFactor);
      const bounds =
        new google.maps.LatLngBounds();
      bounds.extend({
        lat:
          currentLocation.latitude - latDelta,
        lng:
          currentLocation.longitude - lngDelta,
      });
      bounds.extend({
        lat:
          currentLocation.latitude + latDelta,
        lng:
          currentLocation.longitude + lngDelta,
      });
      lastFittedLocationRef.current =
        locationKey;
      map.fitBounds(bounds, 50);
    },
    [currentLocation]
  );
  const paintDataLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    map.data.setStyle((feature) => {
      const meta =
        featureMetaRef.current.get(feature);
      if (!meta) {
        return {
          visible: false,
        };
      }
      const selected =
        selectedAreaKeysRef.current.has(
          getAreaKey(meta.area)
        );
      if (selected) {
        return {
          visible: true,
          fillColor: '#22c55e',
          fillOpacity: 0.58,
          strokeColor: '#15803d',
          strokeOpacity: 1,
          strokeWeight: 3,
          clickable: true,
          cursor: 'pointer',
        };
      }
      if (!meta.allowed) {
        return {
          visible: false,
          clickable: false,
        };
      }
      return {
        visible: true,
        fillColor: '#4f6df5',
        fillOpacity: 0.28,
        strokeColor: '#3157d5',
        strokeOpacity: 0.95,
        strokeWeight: 2,
        clickable: true,
        cursor: 'pointer',
      };
    });
  }, []);
const buildFeatureCache =
  useCallback(() => {
    const map =
      mapRef.current;
    if (!map) {
      return;
    }
    const nextCache =
      new WeakMap<
        google.maps.Data.Feature,
        FeatureMeta
      >();
    const points:
      ZonePoint[] = [];
    /*
      Podemos pintar municipios aunque
      el usuario NO comparta ubicación.
      Si existe ubicación:
      calculamos el radio de 80 km.
      Si no existe:
      simplemente mostramos azul/verde.
    */
    const canCalculateDistance =
      Boolean(
        currentLocation &&
        window.google?.maps
          ?.geometry?.spherical
      );
    const origin =
      canCalculateDistance &&
      currentLocation
        ? new google.maps.LatLng(
            currentLocation.latitude,
            currentLocation.longitude
          )
        : null;
    map.data.forEach(
      (feature) => {
const area =
  getFeatureArea(
    feature,
    selectedAreasRef.current
  );
if (!geoDebugPrintedRef.current) {
  geoDebugPrintedRef.current = true;
  const properties: Record<
    string,
    unknown
  > = {};
  feature.forEachProperty(
    (value, name) => {
      properties[name] = value;
    }
  );
console.log(
  '🧩 KEYS GEOJSON:',
  Object.keys(properties)
);
console.log(
  '🧩 VALUES GEOJSON:',
  JSON.stringify(properties, null, 2)
);
  console.log(
    '🧩 PRIMER MUNICIPIO GEOJSON:',
    properties
  );
  console.log(
    '🟢 AREA INTERPRETADA:',
    area
  );
  console.log(
    '🟢 ZONAS SELECCIONADAS:',
    Array.from(
      selectedAreaKeysRef.current
    )
  );
}
const featureCenter =
  getFeatureCenter(
    feature
          );
        if (
          !area ||
          !featureCenter
        ) {
          return;
        }
        let distanceKm = 0;
        /*
          Sin ubicación dejamos visible
          la zona.
          El listener de click ya evita
          seleccionar zonas nuevas si
          todavía no existe currentLocation.
        */
        let allowed = false;
        if (
          origin &&
          window.google?.maps
            ?.geometry?.spherical
        ) {
          const meters =
            google.maps.geometry
              .spherical
              .computeDistanceBetween(
                origin,
                featureCenter
              );
          distanceKm =
            meters / 1000;
          allowed =
            distanceKm <=
            MAX_DISTANCE_KM;
        }
        nextCache.set(
          feature,
          {
            area,
            center:
              featureCenter,
            distanceKm,
            allowed,
          }
        );
        /*
          Estos puntos grandes solo
          los mostramos cuando tenemos
          ubicación y distancia.
        */
        if (
          currentLocation &&
          allowed
        ) {
          points.push({
            key:
              getAreaKey(
                area
              ),
            area,
            lat:
              featureCenter.lat(),
            lng:
              featureCenter.lng(),
            distanceKm,
          });
        }
      }
    );
    points.sort(
      (a, b) =>
        a.distanceKm -
        b.distanceKm
    );
    featureMetaRef.current =
      nextCache;
    setZonePoints(
      points
    );
  }, [
    currentLocation,
  ]);
useEffect(() => {
  if (
    !mapReady ||
    !mapRef.current
  ) {
    return;
  }
  /*
    Las zonas guardadas pueden llegar
    después de cargar los polígonos.
    Reconstruimos solo el metadata
    para asociar códigos INEGI.
    NO recargamos GeoJSON.
    NO tocamos zoom.
    NO hacemos fitBounds.
  */
  buildFeatureCache();
  paintDataLayer();
}, [
  serviceAreas,
  mapReady,
  buildFeatureCache,
  paintDataLayer,
]);
  /*
    MUY IMPORTANTE:
    este efecto solo corre cuando cambia el GeoJSON
    o la ubicación. Ya no depende de serviceAreas,
    así que seleccionar una zona NO vuelve a borrar
    y agregar todos los polígonos.
  */
  useEffect(() => {
    const map = mapRef.current;
    if (
      !map ||
      !mapReady ||
      !geoJson ||
      !isLoaded
    ) {
      return;
    }
    map.data.forEach((feature) => {
      map.data.remove(feature);
    });
    try {
      map.data.addGeoJson(geoJson);
      buildFeatureCache();
      paintDataLayer();
      if (currentLocation) {
        fitCoverageCircle(map);
      }
    } catch (geoJsonError) {
      console.error(
        'ERROR CARGANDO GEOJSON EN GOOGLE MAPS:',
        geoJsonError
      );
      onErrorRef.current?.(
        'No fue posible cargar las zonas en el mapa.'
      );
    }
  }, [
    geoJson,
    isLoaded,
    mapReady,
    currentLocation,
    buildFeatureCache,
    paintDataLayer,
    fitCoverageCircle,
  ]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }
    clickListenerRef.current?.remove();
    clickListenerRef.current =
      map.data.addListener(
        'click',
        (
          event:
            google.maps.Data.MouseEvent
        ) => {
          const meta =
            featureMetaRef.current.get(
              event.feature
            );
          if (!meta) {
            return;
          }
          if (!currentLocation) {
            onErrorRef.current?.(
              'Primero necesitamos tu ubicación para calcular la cobertura.'
            );
            return;
          }
          if (!meta.allowed) {
            onErrorRef.current?.(
              `Esta zona está aproximadamente a ${Math.round(
                meta.distanceKm
              )} km. Solo puedes seleccionar zonas dentro de 80 km.`
            );
            return;
          }
if (
  !meta.area.stateCode ||
  !meta.area.municipalityCode
) {
  console.warn(
    '⚠️ ZONA SIN CLAVE:',
    meta.area
  );
  onErrorRef.current?.(
    `No se pudo obtener la clave oficial de ${meta.area.municipalityName}.`
  );
  return;
}
toggleArea(meta.area);
        }
      );
    return () => {
      clickListenerRef.current?.remove();
      clickListenerRef.current = null;
    };
  }, [
    currentLocation,
    mapReady,
    toggleArea,
  ]);
  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      setMapReady(true);
      if (currentLocation) {
        fitCoverageCircle(map);
      }
    },
    [
      currentLocation,
      fitCoverageCircle,
    ]
  );
  const handleMapUnmount =
    useCallback(() => {
      clickListenerRef.current?.remove();
      clickListenerRef.current = null;
      mapRef.current = null;
      setMapReady(false);
    }, []);
  if (
    !import.meta.env
      .VITE_GOOGLE_MAPS_API_KEY
  ) {
    return (
      <div className="service-map-state error">
        <strong>
          Falta configurar Google Maps
        </strong>
        <p>
          Agrega VITE_GOOGLE_MAPS_API_KEY
          en el archivo .env del frontend.
        </p>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="service-map-state error">
        <strong>
          No fue posible cargar Google Maps
        </strong>
        <p>
          Revisa la API Key y que Maps JavaScript API esté habilitada.
        </p>
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div className="service-map-state">
        Cargando Google Maps...
      </div>
    );
  }
  return (
    <div className="service-map-wrapper">
      <div className="service-map-limit">
        <div>
          <span>
            RADIO DE COBERTURA
          </span>
          <strong>
            Máximo 80 km
          </strong>
        </div>
        <p>
          El círculo azul marca el límite.
          Seleccionar una zona ya no cambia
          el zoom ni vuelve a cargar el mapa.
        </p>
      </div>
      {!currentLocation && (
        <div className="service-map-warning">
          Usa tu ubicación actual para
          calcular el radio de 80 km.
        </div>
      )}
      {error && (
        <div className="service-map-warning error">
          {error}
        </div>
      )}
      <div className="service-map-container">
        <GoogleMap
          mapContainerStyle={MAP_STYLE}
          center={center}
          zoom={currentLocation ? 9 : 5}
          onLoad={handleMapLoad}
          onUnmount={handleMapUnmount}
          options={{
            mapTypeId:
              google.maps.MapTypeId.ROADMAP,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            clickableIcons: false,
            gestureHandling: 'greedy',
            minZoom: 6,
            maxZoom: 14,
          }}
        >
          {currentLocation && (
            <>
              <MarkerF
                position={center}
                title="Tu ubicación"
                zIndex={999}
              />
              <Circle
                center={center}
                radius={MAX_DISTANCE_METERS}
                options={{
                  clickable: false,
                  fillColor: '#2563eb',
                  fillOpacity: 0.055,
                  strokeColor: '#2563eb',
                  strokeOpacity: 0.95,
                  strokeWeight: 3,
                }}
              />
              {zonePoints.map((zone) => (
                <ZoneMarker
                  key={zone.key}
                  zone={zone}
                  onToggle={toggleArea}
                />
              ))}
            </>
          )}
        </GoogleMap>
        {loading && (
          <div className="service-map-loading-overlay">
            Cargando zonas cercanas...
          </div>
        )}
      </div>
      <div className="service-map-legend">
        <div>
          <span className="service-map-color available" />
          Zona disponible
        </div>
        <div>
          <span className="service-map-color selected" />
          Zona seleccionada
        </div>
      </div>
    </div>
  );
};
export default ServiceAreaGoogleMap;
