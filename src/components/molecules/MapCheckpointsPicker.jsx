import { useState, useCallback, useEffect } from 'react';
import { useMapEvents, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import BaseMap from './BaseMap';
import { MapPin, Flag, Crosshair, Loader2 } from 'lucide-react';
import clsx from 'clsx';

// SVG Icons for Leaflet markers
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const iconOrigin = createCustomIcon('#22c55e'); // emerald-500
const iconDest = createCustomIcon('#ef4444'); // red-500
const iconCheckpoint = createCustomIcon('#eab308'); // amber-500

function MapInteraction({ activeMode, onMapClick }) {
  useMapEvents({
    click(e) {
      if (activeMode && onMapClick) {
        onMapClick(e.latlng);
      }
    }
  });
  return null;
}

export default function MapCheckpointsPicker({
  origin,
  destination,
  checkpoints = [],
  onOriginSelect,
  onDestinationSelect,
  onCheckpointsChange,
}) {
  const [activeMode, setActiveMode] = useState(null); // 'origin' | 'destination' | 'checkpoint'
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [routePath, setRoutePath] = useState([]);

  // Fetch Polyline path when points change
  useEffect(() => {
    let active = true;
    
    const fetchRoute = async () => {
      if (!origin || !origin.lat || !origin.lng || !destination || !destination.lat || !destination.lng) {
        setRoutePath([]);
        return;
      }
      
      try {
        const points = [origin, ...checkpoints, destination].filter(p => p && p.lat && p.lng);
        const coordsStr = points.map(p => `${p.lng},${p.lat}`).join(';');
        
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`);
        if (!res.ok) throw new Error('OSRM request failed');
        
        const data = await res.json();
        if (data.routes && data.routes.length > 0 && active) {
          // OSRM devuelve [lng, lat], Leaflet espera [lat, lng]
          const latLngs = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
          setRoutePath(latLngs);
        }
      } catch (err) {
        console.error("OSRM Error:", err);
      }
    };

    const timeoutId = setTimeout(fetchRoute, 500); // debounce API calls
    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [origin, destination, checkpoints]);

  const fetchAddress = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`);
      const data = await res.json();
      return data.address?.city || data.address?.town || data.address?.road || data.display_name.split(',')[0];
    } catch {
      return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    }
  };

  const handleMapClick = useCallback(async (latlng) => {
    const { lat, lng } = latlng;
    
    setIsGeocoding(true);
    const locationName = await fetchAddress(lat, lng);
    setIsGeocoding(false);

    if (activeMode === 'origin') {
      onOriginSelect({ lat, lng, name: locationName });
      setActiveMode(null);
    } else if (activeMode === 'destination') {
      onDestinationSelect({ lat, lng, name: locationName });
      setActiveMode(null);
    } else if (activeMode === 'checkpoint') {
      const cpName = locationName || `Parada ${checkpoints.length + 1}`;
      onCheckpointsChange([...checkpoints, { lat, lng, name: cpName, sequence_order: checkpoints.length + 1 }]);
    }
  }, [activeMode, origin, destination, checkpoints, onOriginSelect, onDestinationSelect, onCheckpointsChange]);

  const removeCheckpoint = (idx) => {
    const updated = checkpoints.filter((_, i) => i !== idx);
    onCheckpointsChange(updated);
  };

  return (
    <div className="relative h-[480px] w-full rounded-2xl overflow-hidden border border-surface-200 shadow-inner">
      <BaseMap zoom={6} scrollWheelZoom={true}>
        <MapInteraction activeMode={activeMode} onMapClick={handleMapClick} />
        
        {origin && origin.lat && origin.lng && (
          <Marker position={[origin.lat, origin.lng]} icon={iconOrigin}>
            <Popup className="font-sans">
              <p className="font-bold text-emerald-700 m-0">Origen</p>
              <p className="text-sm m-0 mt-1">{origin.name}</p>
            </Popup>
          </Marker>
        )}

        {destination && destination.lat && destination.lng && (
          <Marker position={[destination.lat, destination.lng]} icon={iconDest}>
            <Popup className="font-sans">
              <p className="font-bold text-red-700 m-0">Destino</p>
              <p className="text-sm m-0 mt-1">{destination.name}</p>
            </Popup>
          </Marker>
        )}

        {checkpoints.map((cp, idx) => (
          cp.lat && cp.lng && (
            <Marker key={`cp-${idx}`} position={[cp.lat, cp.lng]} icon={iconCheckpoint}>
              <Popup className="font-sans">
                <p className="font-bold text-amber-700 m-0">Parada {idx + 1}</p>
                <input 
                  type="text" 
                  value={cp.name} 
                  onChange={(e) => {
                    const newCheckpoints = [...checkpoints];
                    newCheckpoints[idx].name = e.target.value;
                    onCheckpointsChange(newCheckpoints);
                  }}
                  className="mt-1 w-full border-b border-surface-200 outline-none focus:border-amber-500 text-sm py-1 bg-transparent"
                />
                <button 
                  type="button"
                  onClick={() => removeCheckpoint(idx)}
                  className="mt-2 w-full bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs p-1 font-semibold transition-colors"
                >
                  Eliminar Parada
                </button>
              </Popup>
            </Marker>
          )
        ))}
        
        {routePath.length > 0 && (
          <Polyline 
            positions={routePath} 
            color="#3b82f6" 
            weight={5} 
            opacity={0.8} 
            lineCap="round"
            lineJoin="round"
            dashArray="10, 10"
            className="animate-pulse"
          />
        )}
      </BaseMap>

      {/* Barra de herramientas Overlay - Ahora debajo del BaseMap en el DOM pero dentro de un contenedor relativo */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-surface-200 flex items-center gap-2">
        <span className="text-xs font-bold text-surface-500 uppercase tracking-wider mr-2 hidden sm:block">Fijar Pin:</span>
        <button
          type="button"
          onClick={() => setActiveMode(activeMode === 'origin' ? null : 'origin')}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all",
            activeMode === 'origin' ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "bg-white text-emerald-600 border border-emerald-100 hover:bg-emerald-50"
          )}
        >
          <MapPin size={16} /> <span className="hidden sm:inline">Origen</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMode(activeMode === 'checkpoint' ? null : 'checkpoint')}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all",
            activeMode === 'checkpoint' ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" : "bg-white text-amber-600 border border-amber-100 hover:bg-amber-50"
          )}
        >
          <Crosshair size={16} /> <span className="hidden sm:inline">Parada</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMode(activeMode === 'destination' ? null : 'destination')}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all",
            activeMode === 'destination' ? "bg-red-500 text-white shadow-md shadow-red-500/20" : "bg-white text-red-600 border border-red-100 hover:bg-red-50"
          )}
        >
          <Flag size={16} /> <span className="hidden sm:inline">Destino</span>
        </button>
      </div>

      {isGeocoding && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] bg-surface-900/80 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 backdrop-blur-sm shadow-xl">
          <Loader2 className="animate-spin" size={16} /> Calculando dirección...
        </div>
      )}

      {/* Explicacion del modo actual */}
      {activeMode && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-primary-900/90 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5">
          Haz clic en el mapa para posicionar el {activeMode === 'origin' ? 'Origen' : activeMode === 'destination' ? 'Destino' : 'Checkpoint'}
        </div>
      )}
    </div>
  );
}
