import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';

/**
 * Componente que dibuja una ruta sobre las carreteras reales usando OSRM.
 * Se integra con react-leaflet como un hijo de <MapContainer> o <BaseMap>.
 * 
 * Props:
 * - waypoints: array de { lat, lng } (m├¡nimo 2 puntos: origen y destino)
 * - onRouteClick: callback(latlng) cuando el usuario hace click en la ruta dibujada
 * - color: color de la l├¡nea de ruta (default: '#137fec')
 * - showInstructions: mostrar instrucciones de navegaci├│n (default: false)
 */
function RoutingMachine({ waypoints = [], onRouteClick, color = '#137fec', showInstructions = false }) {
  const map = useMap();
  const routingControlRef = useRef(null);
  const routeLineRef = useRef(null);

  useEffect(() => {
    if (!map || waypoints.length < 2) return;

    // Limpiar instancia anterior
    if (routingControlRef.current) {
      try {
        map.removeControl(routingControlRef.current);
      } catch (e) {
        // Ignorar errores de limpieza
      }
    }

    const latlngs = waypoints.map((wp) => L.latLng(wp.lat, wp.lng));

    const routingControl = L.Routing.control({
      waypoints: latlngs,
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: showInstructions,
      createMarker: () => null, // No crear marcadores por defecto (usamos los propios)
      lineOptions: {
        styles: [
          { color, opacity: 0.85, weight: 6 },
          { color: '#ffffff', opacity: 0.3, weight: 2 }
        ],
        extendToWaypoints: true,
        missingRouteTolerance: 100,
      },
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        profile: 'car',
      }),
    });

    // Escuchar cuando la ruta se ha calculado
    routingControl.on('routesfound', (e) => {
      const route = e.routes[0];
      if (route && route.coordinates) {
        // Guardar referencia a la polyline de la ruta
        routeLineRef.current = route.coordinates;

        // Si hay callback de click, a├▒adir listener a la polyline
        if (onRouteClick) {
          // Buscar la polyline del routing control
          map.eachLayer((layer) => {
            if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
              layer.on('click', (event) => {
                onRouteClick(event.latlng);
              });
            }
          });
        }
      }
    });

    routingControl.addTo(map);
    routingControlRef.current = routingControl;

    // Ocultar el panel de instrucciones si no se necesita
    if (!showInstructions) {
      const container = routingControl.getContainer();
      if (container) {
        container.style.display = 'none';
      }
    }

    return () => {
      if (routingControlRef.current) {
        try {
          map.removeControl(routingControlRef.current);
        } catch (e) {
          // Ignorar
        }
      }
    };
  }, [map, waypoints, color, showInstructions, onRouteClick]);

  return null;
}

export default RoutingMachine;
