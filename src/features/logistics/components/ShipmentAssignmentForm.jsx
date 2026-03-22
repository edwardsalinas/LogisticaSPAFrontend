import { useState, useEffect, useMemo } from 'react';
import Button from '../../../components/atoms/Button';
import Select from '../../../components/atoms/Select';
import Spinner from '../../../components/atoms/Spinner';
import apiService from '../../../services/apiService';
import { Truck, MapPin } from 'lucide-react';

function ShipmentAssignmentForm({ pkg, onSuccess, onCancel }) {
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const res = await apiService.getRoutes({ status: 'planeada' }); // Only showing planned routes
        // Wait, should also allow 'en_transito'? Usually, you don't add to a moving truck unless it's a stop.
        // For simplicity, let's show all active (not completed)
        setRoutes(res.data || []);
      } catch (err) {
        console.error('Error cargando rutas:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoutes();
  }, []);

  const compatibleRoutes = useMemo(() => {
    return routes.filter(r => 
      r.status !== 'completada' && 
      r.origin === pkg.origen && 
      r.destination === pkg.destino
    );
  }, [routes, pkg]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRouteId) {
      setError('Por favor selecciona un despacho');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiService.assignPackageToRoute(selectedRouteId, pkg.id);
      onSuccess();
    } catch (err) {
      console.error('Error asignando a despacho:', err);
      setError(err.response?.data?.message || 'Error al asignar el despacho');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center py-8">
      <Spinner size="md" />
      <p className="mt-4 text-sm text-surface-500 italic">Buscando despachos compatibles...</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-[1.4rem] border border-primary-100 bg-primary-50/50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm border border-primary-100">
            <Truck size={20} />
          </div>
          <div>
            <p className="font-display font-semibold text-surface-950">Asignar Paquete: {pkg.tracking_code}</p>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-surface-600">
              <MapPin size={12} className="text-primary-500" />
              <span>{pkg.origen} → {pkg.destino}</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
          <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
          {error}
        </div>
      )}

      {compatibleRoutes.length > 0 ? (
        <div className="space-y-4">
          <Select
            label="Despachos Disponibles (Mismo Trayecto)"
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(e.target.value)}
            required
            options={compatibleRoutes.map(r => {
                const date = r.departure_time ? new Date(r.departure_time).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit' }) : '';
                return {
                    value: r.id,
                    label: `${r.route_code || 'Ruta'} (${date}) • ${r.driver?.full_name || 'Sin conductor'}`
                };
            })}
            placeholder="Selecciona un despacho activo..."
          />
          
          <div className="pt-2">
            <p className="text-[0.65rem] text-surface-400 font-medium px-1 mb-4 italic">
              Solo se muestran despachos con origen y destino coincidentes.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
              <Button type="submit" disabled={submitting || !selectedRouteId}>
                {submitting ? 'Asignando...' : 'Confirmar Asignación'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 px-4 rounded-[1.8rem] border-2 border-dashed border-surface-200 bg-surface-50/50">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-surface-300 shadow-sm mb-4">
            <Truck size={32} />
          </div>
          <p className="text-surface-600 font-medium font-display">No hay despachos planeados para esta ruta</p>
          <p className="text-sm text-surface-400 mt-2 max-w-[240px] mx-auto italic">
            Debes crear primero un despacho (viaje) para {pkg.origen} → {pkg.destino} en la sección de rutas.
          </p>
          <div className="mt-6 flex justify-center">
            <Button variant="secondary" onClick={onCancel}>Cerrar</Button>
          </div>
        </div>
      )}
    </form>
  );
}

export default ShipmentAssignmentForm;
