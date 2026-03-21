import { Boxes, MapPinned, PackagePlus } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import Button from '../../../components/atoms/Button';
import Input from '../../../components/atoms/Input';
import Select from '../../../components/atoms/Select';
import Autocomplete from '../../../components/atoms/Autocomplete';
import apiService from '../../../services/apiService';

function PackageForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState({ sender_id: '', origen: '', destino: '', peso: '', description: '', route_id: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [clients, setClients] = useState([]);
  const [predefinedRoutes, setPredefinedRoutes] = useState([]);
  const [activeRoutes, setActiveRoutes] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prefRes, routesRes, clientsRes] = await Promise.all([
          apiService.getPredefinedRoutes(),
          apiService.getRoutes(),
          apiService.getClients()
        ]);
        setPredefinedRoutes(prefRes.data || []);
        setActiveRoutes(routesRes.data || []);
        setClients(clientsRes.data || []);
      } catch (err) {
        console.error("Error fetching data for package form:", err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const originCities = useMemo(() => {
    return Array.from(new Set(activeRoutes.map(r => r.origin))).sort();
  }, [activeRoutes]);

  const validDestinations = useMemo(() => {
    if (!form.origen) return [];
    return Array.from(new Set(
      activeRoutes.filter(r => r.origin === form.origen).map(r => r.destination)
    )).sort();
  }, [activeRoutes, form.origen]);

  const validRoutes = useMemo(() => {
    if (!form.origen || !form.destino) return [];
    return activeRoutes.filter(r => r.origin === form.origen && r.destination === form.destino);
  }, [activeRoutes, form.origen, form.destino]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setForm(prev => {
      const nextForm = { ...prev, [name]: value };
      
      // Cascading clear logic
      if (name === 'origen') {
        nextForm.destino = '';
        nextForm.route_id = '';
      } else if (name === 'destino') {
        nextForm.route_id = '';
      }
      
      return nextForm;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiService.post('/logistics/packages', { 
        ...form, 
        peso: parseFloat(form.peso),
        route_id: form.route_id || null // Send raw null if empty string
      });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Error al registrar paquete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-[1.4rem] border border-surface-100 bg-surface-50/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
            <PackagePlus size={18} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[0.64rem] uppercase tracking-[0.18em] text-surface-500">Nuevo registro</p>
            <p className="text-sm text-surface-600">Completa el origen, destino y datos base del paquete.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <Autocomplete
          label="Cliente remitente"
          name="sender_id"
          value={form.sender_id}
          onChange={handleChange}
          required
          options={clients.map(c => ({ value: c.id, label: c.name, subtext: c.email }))}
          placeholder={loadingData ? "Cargando clientes..." : "Buscar por nombre o correo..."}
          disabled={loadingData}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Select 
          label="Origen" 
          name="origen" 
          value={form.origen} 
          onChange={handleChange} 
          required 
          options={originCities.map(c => ({ value: c, label: c }))}
          placeholder={loadingData ? "Cargando..." : "Seleccionar origen..."}
          disabled={loadingData}
        />
        <Select 
          label="Destino" 
          name="destino" 
          value={form.destino} 
          onChange={handleChange} 
          required 
          disabled={!form.origen || loadingData}
          options={validDestinations.map(c => ({ value: c, label: c }))}
          placeholder={form.origen ? "Seleccionar destino..." : "Escoge un origen primero"}
        />
      </div>

      <div className="grid gap-4">
        <Select
          label="Asignar a Ruta (Opcional)"
          name="route_id"
          value={form.route_id}
          onChange={handleChange}
          disabled={!form.origen || !form.destino || loadingData || validRoutes.length === 0}
          options={validRoutes.map(r => ({
            value: r.id,
            label: `${r.route_code || 'Ruta'} (${r.driver_name || 'Sin conductor'})`
          }))}
          placeholder={
            !form.origen || !form.destino 
              ? "-- Escoge origen y destino para ver rutas --" 
              : validRoutes.length === 0 
                ? "-- No hay rutas activas para este trayecto --" 
                : "-- Seleccionar ruta opcional --"
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Input label="Peso (kg)" name="peso" type="number" step="0.1" value={form.peso} onChange={handleChange} placeholder="Ej: 15.5" required />
        <Input label="Descripcion" name="description" value={form.description} onChange={handleChange} placeholder="Contenido, referencia o nota operativa" />
      </div>

      {error && <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Registrando...' : 'Registrar paquete'}</Button>
      </div>
    </form>
  );
}

export default PackageForm;
