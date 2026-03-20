import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../app/AuthContext';
import Spinner from '../../../components/atoms/Spinner';

const heroImage =
  'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=1400&q=80';

function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError('Credenciales invalidas. Verifica tus datos e intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#f4f7fb] text-surface-900">
      <main className="grid min-h-screen grid-cols-1 md:grid-cols-2">
        <section className="relative hidden overflow-hidden md:block">
          <img
            src={heroImage}
            alt="Centro logistico moderno"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(2,36,72,0.92)_0%,rgba(30,58,95,0.72)_100%)]" />
          <div className="relative z-10 flex h-full flex-col justify-between p-10 lg:p-16">
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/15 bg-white/8 px-4 py-2 backdrop-blur-md">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400 text-sm font-bold tracking-[0.2em] text-[#022448]">
                LS
              </div>
              <div>
                <p className="text-sm font-bold text-white">LogisticaSPA</p>
                <p className="text-[0.62rem] uppercase tracking-[0.24em] text-sky-100/60">
                  Precision Global Logistics
                </p>
              </div>
            </div>

            <div className="max-w-xl">
              <p className="mb-4 text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-sky-100/75">
                Plataforma empresarial
              </p>
              <h1 className="max-w-lg text-5xl font-extrabold leading-[0.95] tracking-tight text-white lg:text-6xl">
                Controla el flujo completo de tu operacion.
              </h1>
              <p className="mt-6 max-w-md text-base leading-relaxed text-white/72">
                Flota, rutas, entregas y trazabilidad en una sola capa de control
                visual, clara y confiable.
              </p>
              <div className="mt-8 h-1 w-24 rounded-full bg-sky-300" />
            </div>

            <div className="grid max-w-lg grid-cols-3 gap-4">
              <div className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
                <p className="text-2xl font-bold text-white">98.2%</p>
                <p className="mt-1 text-[0.65rem] uppercase tracking-[0.16em] text-sky-100/70">
                  Entregas a tiempo
                </p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
                <p className="text-2xl font-bold text-white">1,284</p>
                <p className="mt-1 text-[0.65rem] uppercase tracking-[0.16em] text-sky-100/70">
                  Movimientos hoy
                </p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
                <p className="text-2xl font-bold text-white">24/7</p>
                <p className="mt-1 text-[0.65rem] uppercase tracking-[0.16em] text-sky-100/70">
                  Visibilidad
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-[#eef3f9] px-6 py-10 sm:px-8 lg:px-16">
          <div className="w-full max-w-[30rem] rounded-[2rem] border border-white/70 bg-white p-8 shadow-[0_28px_80px_-40px_rgba(15,23,42,0.28)] sm:p-10">
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0b4ea2_0%,#137fec_100%)] text-sm font-bold tracking-[0.18em] text-white shadow-[0_16px_34px_-20px_rgba(19,127,236,0.8)]">
                LS
              </div>
              <div>
                <p className="text-xl font-bold tracking-tight text-[#022448]">LogisticaSPA</p>
                <p className="text-[0.62rem] uppercase tracking-[0.22em] text-surface-500">
                  Acceso corporativo
                </p>
              </div>
            </div>

            <header className="mb-8">
              <h2 className="text-3xl font-extrabold tracking-tight text-[#111827]">
                Welcome back
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-surface-500">
                Ingresa con tus credenciales para acceder al centro de control
                logistico.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-surface-500"
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="nombre@logisticaspa.com"
                  required
                  className="h-12 w-full rounded-xl border border-surface-200 bg-white px-4 text-sm text-surface-900 outline-none transition-all focus:border-primary-500 focus:ring-4 focus:ring-primary-100"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-surface-500"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-[0.72rem] font-semibold text-primary-500 transition-colors hover:text-primary-700"
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    className="h-12 w-full rounded-xl border border-surface-200 bg-white px-4 pr-12 text-sm text-surface-900 outline-none transition-all focus:border-primary-500 focus:ring-4 focus:ring-primary-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-surface-500 hover:text-surface-800"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
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

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[linear-gradient(135deg,#163d70_0%,#0b4ea2_100%)] text-sm font-bold uppercase tracking-[0.12em] text-white shadow-[0_20px_40px_-24px_rgba(11,78,162,0.75)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-24px_rgba(11,78,162,0.85)] disabled:translate-y-0"
              >
                {loading ? <Spinner size="sm" className="mx-auto" /> : 'Sign in to dashboard'}
              </button>
            </form>

            <div className="mt-8 border-t border-surface-100 pt-6 text-center">
              <p className="text-sm text-surface-500">No tienes acceso todavia?</p>
              <button
                type="button"
                className="mt-3 text-sm font-bold uppercase tracking-[0.12em] text-primary-600 transition-colors hover:text-primary-800"
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
