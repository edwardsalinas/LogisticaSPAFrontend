import { useAuth } from '../../app/AuthContext';

function Navbar({ title }) {
  const { logout } = useAuth();

  return (
    <header className="navbar">
      <h1 className="navbar__title">{title}</h1>
      <div className="navbar__actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span className="text-sm text-surface-500">Admin</span>
        <button 
          onClick={logout} 
          style={{ cursor: 'pointer', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', padding: '0.25rem 0.5rem', borderRadius: '4px' }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;
