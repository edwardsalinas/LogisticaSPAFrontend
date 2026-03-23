import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';

/**
 * Componente para dibujar la ruta real en carretera entre checkpoints
 */
function RoutePath({ route, checkpoints: propCheckpoints, color = '#137fec', weight = 4, isCompleted = false, fitBounds = true }) {
  const map = useMap();
  const finishedStatuses = ['completed', 'finalizada', 'completada'];
  const actualColor = isCompleted ? '#64748b' : color; // Slate Gray vs Blue
  const actualWeight = isCompleted ? weight : (weight + 1); 
  const actualOpacity = isCompleted ? 0.6 : 1; 

  useEffect(() => {
    const cps = route?.checkpoints || propCheckpoints || [];
    if (!map) return;

    const waypoints = [];

    // 1. Origen (o primer punto si es segmento intermedio)
    if (route && route.origin_lat && route.origin_lng) {
      waypoints.push(L.latLng(route.origin_lat, route.origin_lng));
    }

    // 2. Checkpoints
    const validCheckpoints = [...cps].sort((a,b) => a.sequence_order - b.sequence_order).filter(cp => cp.lat && cp.lng);
    validCheckpoints.forEach(cp => waypoints.push(L.latLng(cp.lat, cp.lng)));

    // 3. Destino
    if (route && route.dest_lat && route.dest_lng) {
      waypoints.push(L.latLng(route.dest_lat, route.dest_lng));
    }
    
    // Auto-enfocar solo si fitBounds es true
    if (fitBounds && waypoints.length > 0) {
      if (waypoints.length === 1) {
        map.flyTo(waypoints[0], 14, { duration: 1 });
      } else {
        const bounds = L.latLngBounds(waypoints);
        map.flyToBounds(bounds, { padding: [50, 50], duration: 1 });
      }
    }

    if (waypoints.length < 2) return;

    const routingControl = L.Routing.control({
      waypoints,
      lineOptions: {
        styles: isCompleted 
          ? [{ color: '#94a3b8', weight: weight, opacity: 0.6 }] // Surface-400 (Soft Gray)
          : [{ color: color, weight: weight + 1, opacity: 1, dashArray: '12, 12' }] // Primary Blue (Dashed)
      },
      show: false,
      addWaypoints: false,
      routeWhileDragging: false,
      fitSelectedRoutes: false,
      showAlternatives: false,
      createMarker: () => null
    }).addTo(map);

    return () => {
      if (map && routingControl) {
        try {
          if (routingControl.getPlan) routingControl.getPlan().setWaypoints([]);
          routingControl._updateLines = () => {};
          routingControl._clearLines = () => {};
          routingControl.route = () => {};
          map.removeControl(routingControl);
        } catch (err) {}
      }
    };
  }, [map, route, propCheckpoints, actualColor, actualWeight, actualOpacity, fitBounds]);

  return null;
}

export default RoutePath;
