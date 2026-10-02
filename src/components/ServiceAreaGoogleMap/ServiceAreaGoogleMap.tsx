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

const MAX_DISTANCE_KM = 100;
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

const getAreaKey = (area: ServiceArea) =>
  `${area.stateCode}-${area.municipalityCode}`;

const getFeatureArea = (
  feature: google.maps.Data.Feature
): ServiceArea | null => {
  const fullCode = String(
    feature.getProperty('cvegeo') ??
      feature.getProperty('CVEGEO') ??
      feature.getProperty('CVE_GEO') ??
      ''
  ).trim();

  const stateCode = normalizeCode(
    feature.getProperty('cve_agee') ??
      feature.getProperty('CVE_ENT') ??
      feature.getProperty('state_code') ??
      (fullCode.length >= 5
        ? fullCode.slice(0, 2)
        : ''),
    2
  );

  const municipalityCode = normalizeCode(
    feature.getProperty('cve_agem') ??
      feature.getProperty('CVE_MUN') ??
      feature.getProperty('mun_code') ??
      (fullCode.length >= 5
        ? fullCode.slice(2, 5)
        : ''),
    3
  );

  const municipalityName = String(
    feature.getProperty('nom_agem') ??
      feature.getProperty('NOM_MUN') ??
      feature.getProperty('NOMGEO') ??
      feature.getProperty('mun_name') ??
      feature.getProperty('NAME_2') ??
      feature.getProperty('municipality') ??
      feature.getProperty('name') ??
      ''
  ).trim();

  const stateName = String(
    feature.getProperty('nom_agee') ??
      feature.getProperty('NOM_ENT') ??
      feature.getProperty('state_name') ??
      STATE_NAMES[stateCode] ??
      ''
  ).trim();

  if (
    !stateCode ||
    !municipalityCode ||
    !municipalityName
  ) {
    return null;
  }

  return {
    stateCode,
    stateName:
      stateName ||
      STATE_NAMES[stateCode] ||
      stateCode,
    municipalityCode,
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

        if (!meta.allowed) {
          return {
            visible: true,
            fillColor: '#dbe2ea',
            fillOpacity: 0.035,
            strokeColor: '#cbd5e1',
            strokeOpacity: 0.15,
            strokeWeight: 1,
            clickable: false,
          };
        }

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
      const current = selectedAreasRef.current;
      const key = getAreaKey(area);

      const exists =
        selectedAreaKeysRef.current.has(key);

      const next = exists
        ? current.filter(
            (item) => getAreaKey(item) !== key
          )
        : [...current, area];

      /*
        Actualizamos refs ANTES de notificar al padre.
        Así el mapa responde al instante y no espera
        a todo el re-render de SpecialistSetup.
      */
      selectedAreasRef.current = next;
      selectedAreaKeysRef.current = new Set(
        next.map(getAreaKey)
      );

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

          if (!meta.allowed) {
            return {
              visible: true,
              fillColor: '#dbe2ea',
              fillOpacity: 0.035,
              strokeColor: '#cbd5e1',
              strokeOpacity: 0.15,
              strokeWeight: 1,
              clickable: false,
            };
          }

          return selected
            ? {
                visible: true,
                fillColor: '#22c55e',
                fillOpacity: 0.58,
                strokeColor: '#15803d',
                strokeOpacity: 1,
                strokeWeight: 3,
                clickable: true,
                cursor: 'pointer',
              }
            : {
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

      if (!meta.allowed) {
        return {
          visible: true,
          fillColor: '#dbe2ea',
          fillOpacity: 0.035,
          strokeColor: '#cbd5e1',
          strokeOpacity: 0.15,
          strokeWeight: 1,
          clickable: false,
        };
      }

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
      const map = mapRef.current;

      if (
        !map ||
        !currentLocation ||
        !window.google?.maps?.geometry
          ?.spherical
      ) {
        featureMetaRef.current =
          new WeakMap();

        setZonePoints([]);
        return;
      }

      const origin =
        new google.maps.LatLng(
          currentLocation.latitude,
          currentLocation.longitude
        );

      const nextCache =
        new WeakMap<
          google.maps.Data.Feature,
          FeatureMeta
        >();

      const points: ZonePoint[] = [];

      map.data.forEach((feature) => {
        const area =
          getFeatureArea(feature);

        const featureCenter =
          getFeatureCenter(feature);

        if (!area || !featureCenter) {
          return;
        }

        const meters =
          google.maps.geometry.spherical
            .computeDistanceBetween(
              origin,
              featureCenter
            );

        const distanceKm =
          meters / 1000;

        const allowed =
          distanceKm <= MAX_DISTANCE_KM;

        nextCache.set(feature, {
          area,
          center: featureCenter,
          distanceKm,
          allowed,
        });

        if (allowed) {
          points.push({
            key: getAreaKey(area),
            area,
            lat: featureCenter.lat(),
            lng: featureCenter.lng(),
            distanceKm,
          });
        }
      });

      points.sort(
        (a, b) =>
          a.distanceKm - b.distanceKm
      );

      featureMetaRef.current =
        nextCache;

      setZonePoints(points);
    }, [currentLocation]);

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
              )} km. Solo puedes seleccionar zonas dentro de 100 km.`
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
            Máximo 100 km
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
          calcular el radio de 100 km.
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

        <div>
          <span className="service-map-color blocked" />
          Fuera de 100 km
        </div>
      </div>

      <p className="service-map-tip">
        Puedes tocar directamente el municipio
        o el punto grande en su centro. Las zonas
        pequeñas tienen un punto amplio para
        facilitar la selección.
      </p>

    </div>
  );
};

export default ServiceAreaGoogleMap;
