import { Suspense, lazy, useState } from 'react';
import { Crosshair, Map as MapIcon, MapPin } from 'lucide-react';
import Input from '../../../components/atoms/Input';
import Select from '../../../components/atoms/Select';
import { BOLIVIA_CITIES, cityByKey, nearestCity } from '../../../constants/bolivia';

const LocationMap = lazy(() => import('./LocationMap'));

const round = (n) => Math.round(n * 1e6) / 1e6;

const BTN = 'inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors disabled:opacity-50';

/**
 * Elegir dónde está el paquete sin saber coordenadas: por ciudad, con el GPS del dispositivo o marcando el mapa.
 * Las coordenadas exactas quedan en un apartado avanzado. El valor vive en el formulario (campos lat/lng).
 */
export default function LocationPicker({ register, errors, setValue, lat, lng, suggestion }) {
  const [cityKey, setCityKey] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [showExact, setShowExact] = useState(false);
  const [gps, setGps] = useState({ loading: false, error: '' });

  const set = (la, ln, key = '') => {
    setValue('lat', String(round(la)), { shouldValidate: true, shouldDirty: true });
    setValue('lng', String(round(ln)), { shouldValidate: true, shouldDirty: true });
    setCityKey(key);
  };

  const onCity = (e) => {
    const city = cityByKey(e.target.value);
    if (city) set(city.lat, city.lng, city.key);
    else setCityKey('');
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setGps({ loading: false, error: 'Este navegador no permite obtener la ubicación.' });
      return;
    }
    setGps({ loading: true, error: '' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set(pos.coords.latitude, pos.coords.longitude);
        setGps({ loading: false, error: '' });
      },
      (err) => setGps({
        loading: false,
        error: err.code === 1
          ? 'Permiso denegado: habilita la ubicación en el navegador o elige una ciudad.'
          : 'No se pudo obtener tu ubicación. Elige una ciudad o márcala en el mapa.',
      }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const la = Number.parseFloat(lat);
  const ln = Number.parseFloat(lng);
  const has = Number.isFinite(la) && Number.isFinite(ln);
  const near = has ? nearestCity(la, ln) : null;
  const locationError = errors.lat?.message || errors.lng?.message;

  let placeLabel = 'punto marcado';
  if (cityKey) placeLabel = cityByKey(cityKey)?.name;
  else if (near && near.km < 30) placeLabel = `cerca de ${near.city.name}`;
  else if (near) placeLabel = `a ${Math.round(near.km)} km de ${near.city.name}`;

  return (
    <fieldset className="space-y-3">
      <legend className="mb-1.5 text-sm font-medium text-surface-700">
        Ubicación del paquete <span className="text-danger" aria-hidden="true">*</span>
      </legend>

      <Select
        label="Ciudad"
        options={BOLIVIA_CITIES.map((c) => ({ value: c.key, label: c.name }))}
        placeholder="Elige una ciudad…"
        value={cityKey}
        onChange={onCity}
        hint={suggestion && !has ? `Sugerida según el paquete: ${suggestion.name}` : ''}
      />
      {suggestion && !has && (
        <button type="button" onClick={() => set(suggestion.lat, suggestion.lng, suggestion.key)} className={`${BTN} border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100`}>
          <MapPin size={16} aria-hidden="true" /> Usar {suggestion.name}
        </button>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={useMyLocation} disabled={gps.loading} className={`${BTN} border-surface-200 bg-white text-surface-700 hover:bg-surface-50`}>
          <Crosshair size={16} aria-hidden="true" /> {gps.loading ? 'Buscando…' : 'Usar mi ubicación'}
        </button>
        <button type="button" onClick={() => setShowMap((v) => !v)} aria-expanded={showMap} className={`${BTN} border-surface-200 bg-white text-surface-700 hover:bg-surface-50`}>
          <MapIcon size={16} aria-hidden="true" /> {showMap ? 'Ocultar mapa' : 'Marcar en el mapa'}
        </button>
      </div>
      {gps.error && <p role="alert" className="text-sm text-red-600">{gps.error}</p>}

      {showMap && (
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-surface-100 motion-reduce:animate-none" aria-hidden="true" />}>
          <LocationMap lat={la} lng={ln} onPick={(a, o) => set(a, o)} />
          <p className="text-xs text-surface-600">Haz clic en el mapa para marcar el punto exacto.</p>
        </Suspense>
      )}

      {has && (
        <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
          <MapPin size={16} aria-hidden="true" className="shrink-0" />
          <span>Ubicación elegida: <strong>{placeLabel}</strong></span>
        </p>
      )}
      {locationError && <p role="alert" className="text-sm text-red-600">{locationError}</p>}

      <details open={showExact || undefined} onToggle={(e) => setShowExact(e.currentTarget.open)} className="rounded-xl border border-surface-100 bg-surface-50/60 px-4 py-3">
        <summary className="min-h-6 cursor-pointer text-sm font-semibold text-surface-700">Coordenadas exactas (opcional)</summary>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <Input label="Latitud" type="number" step="any" placeholder="Ej: -16.4897" {...register('lat')} />
          <Input label="Longitud" type="number" step="any" placeholder="Ej: -68.1193" {...register('lng')} />
        </div>
      </details>
    </fieldset>
  );
}
