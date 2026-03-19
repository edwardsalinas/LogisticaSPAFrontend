function Navbar({ title }) {
  return (
    <header className="navbar">
      <h1 className="navbar__title">{title}</h1>
      <div className="navbar__actions">
        <span className="text-sm text-surface-500">Admin</span>
      </div>
    </header>
  );
}

export default Navbar;
