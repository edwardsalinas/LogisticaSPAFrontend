import React from 'react';
import { Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import BaseMap from '../../../components/molecules/BaseMap';
import RoutePath from '../../../components/molecules/RoutePath';
import CheckpointMarker from '../../../components/molecules/CheckpointMarker';
import OriginDestMarker from '../../../components/molecules/OriginDestMarker';

// Custom icon for the truck/current position
const vehicleIcon = L.divIcon({
  className: 'custom-vehicle-marker',
  html: `
    <div style="
      background: linear-gradient(135deg, #137fec 0%, #0d5bbd 100%);
      border: 3px solid white;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      box-shadow: 0 3px 14px rgba(19, 127, 236, 0.5);
    ">
      🚛
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Fallback city coordinates (Bolivia)
const cityCoords = {
  'La Paz': [-16.4897, -68.1193],
  'Oruro': [-17.9647, -67.1060],
  'Cochabamba': [-17.3895, -66.1568],
  'Santa Cruz': [-17.7833, -63.1821],
  'Potosí': [-19.5892, -65.7535],
  'Sucre': [-19.0333, -65.2627],
  'Tarija': [-21.5355, -64.7296],
  'Beni': [-14.8333, -64.9000],
  'Pando': [-11.0267, -68.7692],
};

function TrackingMap({ pkg, route, completedCheckpointIds = [] }) {
  // 1. Determinar centro y zoom inicial
  const hasRouteCoords = route?.origin_lat && route?.origin_lng;
  const initialCenter = hasRouteCoords 
    ? [route.origin_lat, route.origin_lng] 
    : cityCoords[pkg?.origen] || [-16.2902, -63.5887];
    
  const zoom = pkg ? 12 : 6;

  // 2. Filtrar checkpoints completados para la línea verde
  const completedCheckpoints = (route?.checkpoints || [])
    .filter(cp => completedCheckpointIds.includes(cp.id))
    .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));

  return (
    <div className="h-full w-full rounded-[2.5rem] overflow-hidden border border-surface-100 shadow-inner group">
      <BaseMap 
        center={initialCenter} 
        zoom={zoom} 
        className="h-full w-full"
      >
        {route ? (
          <>
            {/* RUTA BASE (Pendiente en color tenue) */}
            <RoutePath 
              route={route} 
              color="#64748b" 
              weight={3} 
              fitBounds={true} 
            />

            {/* RUTA COMPLETADA (Verde sólido) */}
            {completedCheckpoints.length > 0 && (
              <RoutePath 
                route={{
                  ...route,
                  checkpoints: completedCheckpoints
                }}
                isCompleted={true}
                fitBounds={false}
              />
            )}

            {/* MARCADORES DE INICIO Y FIN */}
            {route.origin_lat && route.origin_lng && (
              <OriginDestMarker 
                type="origin" 
                position={[route.origin_lat, route.origin_lng]} 
                title="Punto de Inicio" 
                subtitle={route.origin || pkg?.origen} 
              />
            )}
            {route.dest_lat && route.dest_lng && (
              <OriginDestMarker 
                type="dest" 
                position={[route.dest_lat, route.dest_lng]} 
                title="Destino Final" 
                subtitle={route.destination || pkg?.destino} 
              />
            )}

            {/* CHECKPOINTS DINÁMICOS */}
            {route.checkpoints?.map(cp => (
              <CheckpointMarker 
                key={cp.id} 
                checkpoint={cp} 
                isCompleted={completedCheckpointIds.includes(cp.id)}
              />
            ))}

            {/* ICONO DEL VEHÍCULO (Si está en tránsito, lo ponemos en el último checkpoint alcanzado o en origen) */}
            {pkg?.status === 'in_transit' && (
              <Marker 
                position={
                  completedCheckpoints.length > 0 
                    ? [completedCheckpoints[completedCheckpoints.length - 1].lat, completedCheckpoints[completedCheckpoints.length - 1].lng]
                    : [route.origin_lat, route.origin_lng]
                } 
                icon={vehicleIcon}
              >
                <Popup>
                  <div className="font-bold text-primary-700">Vehículo en ruta</div>
                  <p className="text-xs text-surface-500">Paquete: {pkg.tracking_code}</p>
                </Popup>
              </Marker>
            )}
          </>
        ) : (
          /* FALLBACK: Si no hay ruta asignada aún, mostrar marcadores simples de ciudad si existen */
          <>
            {cityCoords[pkg?.origen] && (
              <OriginDestMarker 
                type="origin" 
                position={cityCoords[pkg.origen]} 
                title="Origen Previsto" 
                subtitle={pkg.origen} 
              />
            )}
            {cityCoords[pkg?.destino] && (
              <OriginDestMarker 
                type="dest" 
                position={cityCoords[pkg.destino]} 
                title="Destino Previsto" 
                subtitle={pkg.destino} 
              />
            )}
            {cityCoords[pkg?.origen] && cityCoords[pkg?.destino] && (
               <Polyline 
                 positions={[cityCoords[pkg.origen], cityCoords[pkg.destino]]} 
                 color="#cbd5e1" 
                 dashArray="10, 10" 
                 weight={2} 
               />
            )}
          </>
        )}
      </BaseMap>
    </div>
  );
}

export default TrackingMap;
