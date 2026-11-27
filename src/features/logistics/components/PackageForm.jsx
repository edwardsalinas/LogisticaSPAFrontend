import { Boxes, MapPinned, PackagePlus } from 'lucide-react';
import { routeName } from '../../../utils/routeLabel';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Button from '../../../components/atoms/Button';
import Input from '../../../components/atoms/Input';
import Select from '../../../components/atoms/Select';
import Autocomplete from '../../../components/atoms/Autocomplete';
import apiService from '../../../services/apiService';
import { registerGuidedForm } from '../../ai-chat/guided/guidedForms';

// Esquema de validación (React Hook Form + Zod). Refleja las reglas del backend (logistics.schema.js).
const packageFormSchema = z.object({
  is_guest: z.boolean(),
  sender_id: z.string(),
  sender_name: z.string(),
  sender_phone: z.string(),
  recipient_name: z.string().min(3, 'El nombre del destinatario es requerido (mín. 3 caracteres)'),
  recipient_phone: z.string(),
  recipient_email: z.string().email('Email inválido').or(z.literal('')),
  origen: z.string().min(3, 'Selecciona el origen'),
  destino: z.string().min(3, 'Selecciona el destino'),
  peso: z.coerce.number({ message: 'Ingresa un peso válido' }).positive('El peso debe ser un número positivo'),
  description: z.string(),
  route_id: z.string(),
}).superRefine((data, ctx) => {
  // Remitente: invitado (nombre libre) o cliente registrado
  if (data.is_guest && data.sender_name.trim().length < 2) {
    ctx.addIssue({ code: 'custom', path: ['sender_name'], message: 'Ingresa el nombre del remitente' });
  }
  if (!data.is_guest && !data.sender_id) {
    ctx.addIssue({ code: 'custom', path: ['sender_id'], message: 'Selecciona un cliente registrado' });
  }
});

function SectionTitle({ step, icon: Icon, title, hint }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700" aria-hidden="true">
        {Icon ? <Icon size={16} strokeWidth={2.2} /> : step}
      </span>
      <div>
        <p className="text-base font-semibold text-surface-900">{step}. {title}</p>
        <p className="text-sm text-surface-600">{hint}</p>
      </div>
    </div>
  );
}

function PackageForm({ onSuccess, onCancel, initialRouteId = '', initialOrigin = '', initialDestination = '' }) {
  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitted },
  } = useForm({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      is_guest: false,
      sender_id: '',
      sender_name: '',
      sender_phone: '',
      recipient_name: '',
      recipient_phone: '',
      recipient_email: '',
      origen: initialOrigin,
      destino: initialDestination,
      peso: '',
      description: '',
      route_id: initialRouteId,
    },
  });
  const form = watch();
  const isGuest = form.is_guest;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef(null);

  // Con el formulario largo, el error puede quedar fuera de pantalla: se lleva el foco al primer campo con problema
  const focusFirstError = () => {
    requestAnimationFrame(() => {
      const bad = formRef.current?.querySelector('[aria-invalid="true"], [role="alert"]');
      bad?.scrollIntoView?.({ block: 'center', behavior: 'auto' });
      if (bad && 'focus' in bad && bad.getAttribute('role') !== 'alert') bad.focus();
    });
  };

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

  // Logi puede llenar este formulario a la vista de todos (solo pone valores; el envío real es la confirmación del servidor)
  const readyRef = useRef(false);
  readyRef.current = !loadingData;
  const applyField = (name, value) => {
    setValue(name, value, { shouldDirty: true });
    if (name === 'origen') { setValue('destino', ''); setValue('route_id', ''); }
    else if (name === 'destino') setValue('route_id', '');
  };
  const optionsRef = useRef({ origins: [], destinations: [] });
  optionsRef.current = { origins: originCities, destinations: validDestinations };
  const applyFieldRef = useRef(applyField);
  applyFieldRef.current = applyField;
  useEffect(() => registerGuidedForm('package', {
    isReady: () => readyRef.current,
    setValue: (name, value) => applyFieldRef.current(name, value),
    getElement: (name) => formRef.current?.querySelector(`[name="${name}"]`) ?? null,
    // las opciones que la persona vería en la lista: Logi las usa para entender «la paz» o «a oruro»
    getOptions: (name) => (name === 'origen' ? optionsRef.current.origins : name === 'destino' ? optionsRef.current.destinations : []),
  }), []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Tras el primer intento de envío, se revalida en cada cambio
    setValue(name, value, { shouldDirty: true, shouldValidate: isSubmitted });

    // Cascading clear logic
    if (name === 'origen') {
      setValue('destino', '');
      setValue('route_id', '');
    } else if (name === 'destino') {
      setValue('route_id', '');
    }
  };

  const onSubmit = async (values) => {
    setLoading(true);
    setError('');

    try {
      // Limpiar campos según el modo
      const { is_guest, ...payload } = values;
      if (is_guest) {
        payload.sender_id = null;
      } else {
        payload.sender_name = '';
        payload.sender_phone = '';
      }

      const created = await apiService.post('/logistics/packages', {
        ...payload,
        route_id: values.route_id || null
      });
      onSuccess(created?.data ?? created);
    } catch (err) {
      setError(err.message || 'Error al registrar paquete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit, focusFirstError)} noValidate className="space-y-6">
      {/* SECCION 1: ORIGEN Y DESTINO */}
      <div className="rounded-[1.4rem] border border-surface-100 bg-surface-50/80 p-5 space-y-4">
        <SectionTitle step={1} icon={MapPinned} title="Trayecto" hint="De dónde sale y a dónde llega el paquete." />

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Origen"
            name="origen"
            value={form.origen}
            onChange={handleChange}
            required
            error={errors.origen?.message}
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
            error={errors.destino?.message}
            options={validDestinations.map(c => ({ value: c, label: c }))}
            placeholder={form.origen ? "Seleccionar destino..." : "Escoge un origen primero"}
          />
        </div>

        <Select
          label="Viaje (opcional)"
          hint="Si todavía no sabes en qué viaje irá, déjalo vacío: se asigna después."
          name="route_id"
          value={form.route_id}
          onChange={handleChange}
          disabled={!form.origen || !form.destino || loadingData || validRoutes.length === 0}
          options={validRoutes.map(r => {
            const date = r.departure_time ? new Date(r.departure_time).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit' }) : '';
            const time = r.departure_time ? new Date(r.departure_time).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : '';
            const driver = r.driver?.full_name ? ` - ${r.driver.full_name}` : ' (Sin conductor)';
            return {
              value: r.id,
              label: `${routeName(r)} · ${date} ${time}${driver}`
            };
          })}
          placeholder={
            !form.origen || !form.destino
              ? "Elige origen y destino para ver los viajes"
              : validRoutes.length === 0
                ? "No hay viajes programados para este trayecto"
                : "Elegir un viaje (opcional)"
          }
        />
      </div>

      {/* SECCION 2: REMITENTE */}
      <div className="rounded-[1.4rem] border border-surface-100 bg-white p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle step={2} title="Quién envía" hint="El cliente que entrega el paquete." />
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-2 text-sm text-surface-700">
             <input
               type="checkbox"
               className="h-5 w-5 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
               checked={isGuest}
               onChange={(e) => setValue('is_guest', e.target.checked, { shouldValidate: isSubmitted })}
             />
             <span>No tiene cuenta (modo invitado)</span>
          </label>
        </div>

        {isGuest ? (
          <div className="grid gap-4 md:grid-cols-2 animate-in fade-in slide-in-from-top-2 duration-300">
             <Input label="Nombre de quien envía" name="sender_name" value={form.sender_name} onChange={handleChange} placeholder="Ej: Juan Perez" required={isGuest} error={errors.sender_name?.message} />
             <Input label="Teléfono (opcional)" name="sender_phone" value={form.sender_phone} onChange={handleChange} placeholder="Ej: 71223344" />
          </div>
        ) : (
          <Autocomplete
            label="Cliente"
            name="sender_id"
            value={form.sender_id}
            onChange={handleChange}
            required={!isGuest}
            options={clients.map(c => ({ value: c.id, label: c.name, subtext: c.email }))}
            placeholder={loadingData ? "Cargando clientes..." : "Buscar por nombre o correo..."}
            disabled={loadingData}
          />
        )}
        {!isGuest && errors.sender_id && (
          <p role="alert" className="text-xs text-danger">{errors.sender_id.message}</p>
        )}
      </div>

      {/* SECCION 3: DESTINATARIO */}
      <div className="rounded-[1.4rem] border border-surface-100 bg-white p-5 space-y-4 shadow-sm">
         <SectionTitle step={3} title="Quién recibe" hint="La persona que recogerá el paquete en el destino." />
         <div className="grid gap-4 md:grid-cols-2">
            <Input label="Nombre de quien recibe" name="recipient_name" value={form.recipient_name} onChange={handleChange} placeholder="Ej: Maria Lopez" required error={errors.recipient_name?.message} />
            <Input label="Teléfono (opcional)" name="recipient_phone" value={form.recipient_phone} onChange={handleChange} placeholder="Ej: 60113322" />
         </div>
         <Input label="Correo (opcional)" name="recipient_email" hint="Le avisamos por correo cuando el paquete cambie de estado." type="email" value={form.recipient_email} onChange={handleChange} placeholder="maria.lopez@ejemplo.com" error={errors.recipient_email?.message} />
      </div>

      {/* SECCION 4: CARGA */}
      <div className="rounded-[1.4rem] border border-white/40 bg-surface-100/30 p-5 space-y-4">
        <SectionTitle step={4} icon={Boxes} title="El paquete" hint="Peso y contenido." />
        <div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <Input label="Peso (kg)" name="peso" type="number" step="0.1" value={form.peso} onChange={handleChange} placeholder="Ej: 15.5" required error={errors.peso?.message} />
          <Input label="Contenido (opcional)" name="description" value={form.description} onChange={handleChange} placeholder="Ej: documentos, repuestos…" />
        </div>
      </div>

      {error && <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 font-bold">{error}</p>}

      <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex justify-end gap-3 border-t border-surface-100 bg-white/95 px-6 py-4 backdrop-blur sm:-mx-7 sm:px-7">
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Registrando...' : 'Registrar paquete'}</Button>
      </div>
    </form>
  );
}

export default PackageForm;
