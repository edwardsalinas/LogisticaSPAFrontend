import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';

/**
 * Componente para dibujar la ruta real en carretera entre checkpoints
 */
function RoutePath({ route, checkpoints: propCheckpoints, color = '#137fec', weight = 4 }) {
  const map = useMap();

  useEffect(() => {
    const cps = route?.checkpoints || propCheckpoints || [];
    if (!map) return;

    const waypoints = [];

    // 1. Origen de la ruta
    if (route && route.origin_lat && route.origin_lng) {
      waypoints.push(L.latLng(route.origin_lat, route.origin_lng));
    }

    // 2. Tramos Intermedios (Checkpoints)
    const validCheckpoints = [...cps].sort((a,b) => a.sequence_order - b.sequence_order).filter(cp => cp.lat && cp.lng);
    validCheckpoints.forEach(cp => waypoints.push(L.latLng(cp.lat, cp.lng)));

    // 3. Destino de la ruta
    if (route && route.dest_lat && route.dest_lng) {
      waypoints.push(L.latLng(route.dest_lat, route.dest_lng));
    }
    
    // Auto-enfocar el mapa en los puntos ingresados
    if (waypoints.length > 0) {
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
        styles: [{ color, weight, opacity: 0.8 }]
      },
      show: false, // hide instructions panel
      addWaypoints: false,
      routeWhileDragging: false,
      fitSelectedRoutes: false,
      showAlternatives: false,
      createMarker: () => null // We already render our own checkpoint markers
    }).addTo(map);

    return () => {
      if (map && routingControl) {
        try {
          // Cancel pending routing queries to avoid trailing async map manipulation
          if (routingControl.getPlan) {
            routingControl.getPlan().setWaypoints([]);
          }
          
          // Patch internal methods to ensure no delayed execution
          routingControl._updateLines = () => {};
          routingControl._clearLines = () => {};
          routingControl.route = () => {};

          map.removeControl(routingControl);
        } catch (err) {
          // ignore leaflet teardown errors
        }
      }
    };
  }, [map, route, propCheckpoints, color, weight]);

  return null;
}

export default RoutePath;
