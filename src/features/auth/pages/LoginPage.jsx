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
    <div className="min-h-screen flex items-center justify-center bg-surface-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-surface-800">🚚 LogísticaSPA</h1>
          <p className="text-surface-500 mt-2">Inicia sesión para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="admin@test.com"
            required
          />
          <Input
            label="Contraseña"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
          />

          {error && (
            <p className="text-danger text-sm">{error}</p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Spinner size="sm" className="mx-auto" /> : 'Iniciar Sesión'}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-surface-50 rounded-lg text-xs text-surface-500">
          <p className="font-semibold mb-2">Credenciales de prueba:</p>
          <p>Email: <code className="bg-white px-1 rounded">admin@test.com</code></p>
          <p>Contraseña: <code className="bg-white px-1 rounded">Password123!</code></p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
