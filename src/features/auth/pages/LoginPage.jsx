import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, Radar } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../../app/AuthContext';
import Spinner from '../../../components/atoms/Spinner';
import Captcha, { CAPTCHA_ENABLED } from '../../../components/molecules/Captcha';
import apiService from '../../../services/apiService';

// El único efecto de la pantalla (React Bits): carga bajo demanda para no pesar en el paquete principal
const DotGrid = lazy(() => import('@/components/DotGrid'));

// Esquema de validación del formulario (React Hook Form + Zod)
const loginSchema = z.object({
  email: z.string().min(1, 'Ingresa tu correo').email('Correo electrónico inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const captchaRef = useRef(null);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [stats, setStats] = useState({
    efficiency: '---',
    movements: '---',
    activeUnits: '---'
  });

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiService.getPublicStats();
        if (response.success) {
          const s = response.data;
          setStats({
            efficiency: `${Number(s.efficiency).toLocaleString('es-BO')}%`,
            movements: s.totalPackages?.toLocaleString() || '0',
            activeUnits: s.activeUnits > 0 ? `${s.activeUnits}` : '24/7'
          });
        }
      } catch (error) {
        console.error('Error fetching public stats:', error);
      }
    };
    fetchStats();
  }, []);

  const onSubmit = async ({ email, password }) => {
    if (CAPTCHA_ENABLED && !captchaToken) {
      setError('Completa la verificación de seguridad (captcha).');
      return;
    }
    setLoading(true);
    setError('');

    try {
      await login(email, password, captchaToken);
      navigate('/');
    } catch (err) {
      // Mensajes específicos para límite de intentos y captcha; credenciales inválidas en otro caso
      const isGuardError = err.status === 429 || String(err.code || '').startsWith('CAPTCHA');
      if (isGuardError) setError(err.message);
      else if (err.isNetworkError) setError('No se pudo conectar con el servidor. Revisa tu conexión o inténtalo en unos minutos.');
      else if (err.status >= 500) setError('El servidor tuvo un problema. Inténtalo de nuevo en unos minutos.');
      else setError('Credenciales invalidas. Verifica tus datos e intenta nuevamente.');
    } finally {
      // Los tokens de captcha son de un solo uso
      captchaRef.current?.reset();
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#f4f7fb] text-surface-900 relative">
      <main className="grid min-h-screen grid-cols-1 md:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-[#06111f] md:block">
          {/* Cuadrícula de puntos que reacciona al cursor. Respeta prefers-reduced-motion y se pausa con la pestaña oculta */}
          <div className="absolute inset-0" aria-hidden="true">
            <Suspense fallback={null}>
              <DotGrid dotSize={3} gap={26} baseColor="#1d3557" activeColor="#38bdf8" proximity={130} glow={0.35} swell={0.5} stretch={0.3} clickShock={false} />
            </Suspense>
          </div>
          <div className="relative z-10 flex h-full flex-col justify-between p-10 lg:p-16">
            <div className="flex items-center justify-between">
              <div className="inline-flex w-fit items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400 text-sm font-bold tracking-[0.2em] text-[#022448]">
                  LS
                </div>
                <div>
                  <p className="text-sm font-bold text-white">LogisticaSPA</p>
                </div>
              </div>
            </div>

            <div className="max-w-xl">
              <h1 className="max-w-lg text-5xl font-extrabold leading-[0.95] tracking-tight text-white lg:text-6xl">
                Controla el flujo completo de tu operación.
              </h1>
              <p className="mt-6 max-w-md text-base leading-relaxed text-white/72">
                Flota, rutas, entregas y trazabilidad en una sola capa de control
                visual, clara y confiable.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/public-tracking')}
                  className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-bold tracking-tight text-white backdrop-blur-md transition-all hover:bg-white/20 hover:-translate-y-0.5"
                >
                  <Radar size={18} className="text-sky-300" />
                  Rastrear mi paquete
                </button>
              </div>

            </div>

            <div className="grid max-w-lg grid-cols-3 gap-4">
              <div className="border-l border-white/20 pl-4">
                <p className="text-2xl font-bold text-white">{stats.efficiency}</p>
                <p className="mt-1 text-xs text-sky-100/75">
                  Paquetes entregados
                </p>
              </div>
              <div className="border-l border-white/20 pl-4">
                <p className="text-2xl font-bold text-white">{stats.movements}</p>
                <p className="mt-1 text-xs text-sky-100/75">
                  Movimientos hoy
                </p>
              </div>
              <div className="border-l border-white/20 pl-4">
                <p className="text-2xl font-bold text-white">{stats.activeUnits}</p>
                <p className="mt-1 text-xs text-sky-100/75">
                  Visibilidad
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-[#eef3f9] px-6 py-10 sm:px-8 lg:px-16 relative">

          <div className="w-full max-w-[30rem] rounded-2xl border border-white/70 bg-white p-8 shadow-lg sm:p-10">
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient text-sm font-bold tracking-[0.18em] text-white shadow-md">
                LS
              </div>
              <div>
                <p className="text-xl font-bold tracking-tight text-[#022448]">LogisticaSPA</p>
                <p className="text-xs uppercase tracking-[0.22em] text-surface-500">
                  Acceso corporativo
                </p>
              </div>
            </div>

            <header className="mb-8">
              <h2 className="text-3xl font-extrabold tracking-tight text-[#111827]">
                Bienvenido de nuevo
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-surface-500">
                Ingresa con tus credenciales para acceder al centro de control
                logístico.
              </p>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-[0.18em] text-surface-500"
                >
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="nombre@logisticaspa.com"
                  aria-invalid={!!errors.email}
                  {...register('email')}
                  className="h-12 w-full rounded-xl border border-surface-200 bg-white px-4 text-sm text-surface-900 outline-none transition-all focus:border-primary-500 focus:ring-4 focus:ring-primary-100"
                />
                {errors.email && <p role="alert" className="text-xs font-semibold text-red-600">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold uppercase tracking-[0.18em] text-surface-500"
                  >
                    Contraseña
                  </label>
                </div>

                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    aria-invalid={!!errors.password}
                    {...register('password')}
                    className="h-12 w-full rounded-xl border border-surface-200 bg-white px-4 pr-12 text-sm text-surface-900 outline-none transition-all focus:border-primary-500 focus:ring-4 focus:ring-primary-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-surface-500 hover:text-surface-800"
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                {errors.password && <p role="alert" className="text-xs font-semibold text-red-600">{errors.password.message}</p>}
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-surface-300 text-primary-500 focus:ring-primary-500"
                />
                <label htmlFor="remember" className="text-sm font-medium text-surface-700">
                  Recordarme en este dispositivo
                </label>
              </div>

              <Captcha ref={captchaRef} onToken={setCaptchaToken} />

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[linear-gradient(135deg,#163d70_0%,#0b4ea2_100%)] text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:translate-y-0"
              >
                {loading ? <Spinner size="sm" className="mx-auto" /> : 'Ingresar al panel'}
              </button>
            </form>

            <div className="mt-8 border-t border-surface-100 pt-6 text-center">
              <p className="mb-2 text-sm text-surface-600">¿No tienes acceso todavía?</p>
              <button
                type="button"
                className="text-sm font-bold text-primary-600 transition-colors hover:text-primary-800"
              >
                Solicitar acceso
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default LoginPage;
