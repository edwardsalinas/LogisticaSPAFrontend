import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../app/AuthContext';
import Input from '../../../components/atoms/Input';
import Button from '../../../components/atoms/Button';
import Spinner from '../../../components/atoms/Spinner';

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
      setError('Credenciales inválidas. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* ========================================
          COLUMNA IZQUIERDA - Formulario
      ======================================== */}
      <div className="login-page__form-container flex items-center justify-center p-8 lg:p-16 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="login-page__logo flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center text-white text-2xl">
              🚛
            </div>
            <div>
              <h1 className="text-xl font-bold text-surface-900">LogisticaSPA</h1>
              <p className="text-xs text-surface-500">Plataforma de Gestión Logística</p>
            </div>
          </div>

          {/* Títulos */}
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-surface-900 mb-2">
              Bienvenido
            </h2>
            <p className="text-surface-500">
              Gestiona tu cadena de suministro con eficiencia
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Campo Email */}
            <div className="form-field">
              <label className="form-field__label uppercase text-xs font-semibold tracking-wide">
                Correo Corporativo
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <Input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="nombre@empresa.com"
                  required
                  className="pl-10"
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="form-field">
              <label className="form-field__label uppercase text-xs font-semibold tracking-wide">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Recordarme + Olvidaste contraseña */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-surface-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-surface-600">Recordarme</span>
              </label>
              <a href="#" className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Botón Login */}
            <Button type="submit" disabled={loading} className="w-full py-3 text-base font-semibold">
              {loading ? (
                <Spinner size="sm" className="mx-auto" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Iniciar Sesión
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </span>
              )}
            </Button>

            {/* Solicitar acceso */}
            <div className="text-center">
              <a
                href="#"
                className="text-sm text-surface-600 hover:text-primary-500 font-medium transition-colors"
              >
                ¿No tienes acceso? → Solicitar acceso corporativo
              </a>
            </div>
          </form>

          {/* Footer */}
          <div className="login-page__footer mt-10 pt-6 border-t border-surface-200 text-center">
            <p className="text-xs text-surface-400">
              © 2026 LogisticaSPA Inc. ·{' '}
              <a href="#" className="hover:text-primary-500 transition-colors">Privacidad</a>
              {' · '}
              <a href="#" className="hover:text-primary-500 transition-colors">Soporte</a>
            </p>
          </div>
        </div>
      </div>

      {/* ========================================
          COLUMNA DERECHA - Panel Decorativo
      ======================================== */}
      <div className="login-page__decorative-panel hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200 relative overflow-hidden">
        {/* Patrón de fondo */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23137fec' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        {/* Contenido superior */}
        <div className="relative z-10">
          {/* Barra de navegador simulada */}
          <div className="login-page__browser-bar bg-white/80 backdrop-blur-sm rounded-xl p-3 mb-8 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-danger" />
                <div className="w-3 h-3 rounded-full bg-warning" />
                <div className="w-3 h-3 rounded-full bg-success" />
              </div>
              <div className="flex-1 bg-surface-100 rounded-lg px-3 py-1.5 text-xs text-surface-400">
                logistica-spa.com/dashboard
              </div>
            </div>
          </div>

          {/* Ilustración principal */}
          <div className="login-page__illustration bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg mb-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🌍</div>
              <h3 className="text-xl font-bold text-surface-900">Logística Global</h3>
              <p className="text-surface-500 text-sm mt-1">
                Conectando tu cadena de suministro en tiempo real
              </p>
            </div>

            {/* Stats en vivo */}
            <div className="login-page__live-stats space-y-3">
              <div className="bg-primary-500 text-white rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📊</span>
                  <span className="text-sm font-semibold">Tiempo Real</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold">1,284</p>
                    <p className="text-xs text-primary-100">Entregas Hoy</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">98.2%</p>
                    <p className="text-xs text-primary-100">Eficiencia</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido inferior - Features */}
        <div className="relative z-10 space-y-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center text-success flex-shrink-0">
                ✓
              </div>
              <div>
                <h4 className="font-semibold text-surface-900 text-sm">Seguridad Enterprise</h4>
                <p className="text-xs text-surface-500 mt-0.5">
                  Autenticación JWT con encriptación de extremo a extremo
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary-500/10 rounded-lg flex items-center justify-center text-primary-500 flex-shrink-0">
                ⚡
              </div>
              <div>
                <h4 className="font-semibold text-surface-900 text-sm">Actualización en Vivo</h4>
                <p className="text-xs text-surface-500 mt-0.5">
                  Monitoreo de flota y paquetes en tiempo real
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center text-warning flex-shrink-0">
                🤖
              </div>
              <div>
                <h4 className="font-semibold text-surface-900 text-sm">Asistente IA</h4>
                <p className="text-xs text-surface-500 mt-0.5">
                  Consultas inteligentes sobre tu operación logística
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
