// 2026-09-09/10 (a pedido de Christian): login/signup real con cuentas
// verdaderas (email + contraseña) contra el backend -- ver
// netlify/functions/booking.mts (acciones "signup"/"login"/"verify-email")
// y src/data/profile.js (window.saveArcanaSession).
//
// El signup YA NO inicia sesión al toque: manda un email con un link de
// confirmación (verify-email) y hasta que no se hace clic ahí no existe
// una cuenta real -- así nadie puede "reservarse" el email de otra
// persona con un signup que nunca confirma. Mientras tanto este modal
// muestra una pantalla de "revisá tu email".
//
// Navegar el sitio ya NO requiere estar logeada (ver App.jsx) -- este
// modal se abre puntualmente: desde el botón "Registro / Iniciar sesión"
// del Nav, o cuando alguien intenta hacer una consulta sin sesión (ver
// requireAuth en App.jsx). dismissible={false} lo deja fijo (sin poder
// cerrarlo) para los pocos casos donde de verdad hace falta.
function AuthModal({ lang, onClose, onAuth, dismissible }) {
  const t = window.I18N[lang];
  const canDismiss = dismissible !== false;
  const [mode, setMode] = React.useState('login'); // login | signup
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [gender, setGender] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [pendingEmail, setPendingEmail] = React.useState(''); // no vacío = "revisá tu email"
  const [emailSendFailed, setEmailSendFailed] = React.useState(false); // 2026-09-10: el signup salió bien (cuenta pendiente creada) pero Resend no pudo mandar el mail -- avisamos en vez de mentir "revisá tu email"
  const isSignup = mode === 'signup';

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setPendingEmail('');
  };

  const submit = (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    const em = email.trim().toLowerCase();
    if (!em.includes('@')) {
      setError(t.auth_error_email);
      return;
    }
    if (password.length < 6) {
      setError(t.auth_error_password_short);
      return;
    }
    setBusy(true);
    const call = isSignup
      ? window.arcanaSignup({ email: em, password, name: name.trim(), gender: gender || null, lang })
      : window.arcanaLogin({ email: em, password });
    call
      .then((res) => {
        if (isSignup && res && res.pendingVerification) {
          setPendingEmail(em);
          setEmailSendFailed(!res.emailSent);
          if (!res.emailSent) console.error('[Arcana] no se pudo mandar el email de verificación:', res.emailError);
          return;
        }
        const profile = window.saveArcanaSession(res);
        onAuth(profile);
        if (canDismiss) onClose();
      })
      .catch((err) => {
        setError((err && err.message) || t.auth_error_generic);
      })
      .finally(() => setBusy(false));
  };

  if (pendingEmail) {
    return (
      <div className="modal-overlay" onClick={canDismiss ? onClose : undefined}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          {canDismiss && <button className="modal-close" onClick={onClose}>✕</button>}
          <div className="eyebrow" style={{ marginBottom: 8 }}>Lux Astral</div>
          <h2 style={{ fontSize: 24, marginBottom: 10 }}>{t.auth_verify_h}</h2>
          <p style={{ color: 'var(--ink-soft)', lineHeight: 1.6 }}>
            {t.auth_verify_body.replace('{email}', pendingEmail)}
          </p>
          {emailSendFailed && (
            <p style={{ color: '#c0392b', fontSize: 14, marginTop: 10 }}>
              {t.auth_verify_email_failed}
            </p>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            style={{ width: '100%', marginTop: 20 }}
            onClick={() => switchMode('login')}
          >
            {t.auth_switch_to_login}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={canDismiss ? onClose : undefined}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {canDismiss && <button className="modal-close" onClick={onClose}>✕</button>}
        <div className="eyebrow" style={{ marginBottom: 8 }}>Lux Astral</div>
        <h2 style={{ fontSize: 26, marginBottom: 6 }}>{isSignup ? t.auth_signup_h : t.auth_login_h}</h2>
        <p style={{ color: 'var(--ink-soft)', marginBottom: 20, fontStyle: 'italic' }}>
          {isSignup ? '“Los arcanos recuerdan las manos que los barajaron.”' : '“Bienvenida de nuevo al círculo.”'}
        </p>
        {!canDismiss && (
          <p style={{ color: 'var(--ink-soft)', marginBottom: 20, fontSize: 14 }}>{t.auth_gate_intro}</p>
        )}
        <form onSubmit={submit}>
          {isSignup && (
            <div className="form-field">
              <label>{t.auth_name}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
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
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            {isSignup && <div className="q-hint" style={{ marginTop: 4 }}>{t.auth_password_hint}</div>}
          </div>
          {error && <div className="form-error" style={{ color: '#c0392b', fontSize: 14, marginTop: 4 }}>{error}</div>}
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 12 }} disabled={busy}>
            {busy ? t.auth_loading : (isSignup ? t.auth_submit_signup : t.auth_submit_login)}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--ink-soft)' }}>
          <a
            href="#"
            style={{ color: 'var(--gold)', textDecoration: 'none' }}
            onClick={(e) => { e.preventDefault(); switchMode(isSignup ? 'login' : 'signup'); }}
          >
            {isSignup ? t.auth_switch_to_login : t.auth_switch_to_signup}
          </a>
        </p>
      </div>
    </div>
  );
}

window.AuthModal = AuthModal;
