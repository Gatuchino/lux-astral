function AuthModal({ lang, onClose, onAuth }) {
  const t = window.I18N[lang];
  const [mode, setMode] = React.useState('login'); // login | signup
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [gender, setGender] = React.useState('');
  const isSignup = mode === 'signup';
  const submit = (e) => {
    e.preventDefault();
    onAuth({
      name: name || (email ? email.split('@')[0] : 'Buscador'),
      email,
      gender: gender || null,
      since: new Date().toISOString(),
    });
    onClose();
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Lux Astral</div>
        <h2 style={{ fontSize: 26, marginBottom: 6 }}>{isSignup ? t.auth_signup_h : t.auth_login_h}</h2>
        <p style={{ color: 'var(--ink-soft)', marginBottom: 20, fontStyle: 'italic' }}>
          {isSignup ? '“Los arcanos recuerdan las manos que los barajaron.”' : '“Bienvenida de nuevo al círculo.”'}
        </p>
        <form onSubmit={submit}>
          {isSignup && (
            <div className="form-field">
              <label>{t.auth_name}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          {isSignup && (
            <div className="form-field">
              <label>{t.onb_gender_label}</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">—</option>
                <option value="femenino">{t.onb_gender_femenino}</option>
                <option value="masculino">{t.onb_gender_masculino}</option>
                <option value="no-binario">{t.onb_gender_no_binario}</option>
                <option value="prefiero-no-decir">{t.onb_gender_prefiero_no_decir}</option>
              </select>
            </div>
          )}
          <div className="form-field">
            <label>{t.auth_email}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-field">
            <label>{t.auth_password}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8 }}>
            {isSignup ? t.auth_submit_signup : t.auth_submit_login}
          </button>
        </form>
        <div className="divider">{t.auth_or}</div>
        <div style={{ display: 'grid', gap: 10 }}>
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => onAuth({ name: 'Buscador', email: 'g@example.com', since: new Date().toISOString() }) || onClose()}>
            {t.auth_google}
          </button>
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => onAuth({ name: 'Buscador', email: 'a@example.com', since: new Date().toISOString() }) || onClose()}>
            {t.auth_apple}
          </button>
        </div>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--ink-soft)' }}>
          <a
            href="#"
            style={{ color: 'var(--gold)', textDecoration: 'none' }}
            onClick={(e) => { e.preventDefault(); setMode(isSignup ? 'login' : 'signup'); }}
          >
            {isSignup ? t.auth_switch_to_login : t.auth_switch_to_signup}
          </a>
        </p>
      </div>
    </div>
  );
}

window.AuthModal = AuthModal;
