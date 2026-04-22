import { useState, useEffect } from 'react';

const API = 'https://projet-nsi-qx2j.onrender.com/api';

// --- Utilitaires ---
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function loadSession() {
  try { return JSON.parse(sessionStorage.getItem('nsi_user') || 'null'); }
  catch { return null; }
}
function saveSession(user) {
  if (user) sessionStorage.setItem('nsi_user', JSON.stringify(user));
  else sessionStorage.removeItem('nsi_user');
}

// --- Composant principal ---
export default function AuthSystem() {
  const [view, setView] = useState('login');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userCount, setUserCount] = useState(0);

  // Champs login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  // Champs register
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPwd, setShowRegPwd] = useState(false);

  // Restaurer la session et charger le compteur au démarrage
  useEffect(() => {
    const session = loadSession();
    if (session) setCurrentUser(session);
    fetchUserCount();
  }, []);

  async function fetchUserCount() {
    try {
      const res = await fetch(`${API}/users/count`);
      const data = await res.json();
      setUserCount(data.total ?? 0);
    } catch { /* serveur pas encore lancé */ }
  }

  const notify = (text, type = 'error') => setMessage({ text, type });

  // --- Inscription ---
  const handleRegister = async () => {
    setMessage({ text: '', type: '' });

    if (!regEmail || !regPassword || !regConfirm) { notify('Merci de remplir tous les champs.'); return; }
    if (!validateEmail(regEmail)) { notify('Adresse email invalide.'); return; }
    if (regPassword.length < 6) { notify('Mot de passe trop court (6 caractères min.).'); return; }
    if (regPassword !== regConfirm) { notify('Les mots de passe ne correspondent pas.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, password: regPassword })
      });
      const data = await res.json();

      if (res.ok) {
        notify(data.message, 'success');
        setView('login');
        setRegEmail(''); setRegPassword(''); setRegConfirm('');
        fetchUserCount();
      } else {
        notify(data.error);
      }
    } catch {
      notify('Impossible de contacter le serveur. Lance bien node index.js !');
    } finally {
      setLoading(false);
    }
  };

  // --- Connexion ---
  const handleLogin = async () => {
    setMessage({ text: '', type: '' });

    if (!loginEmail || !loginPassword) { notify('Merci de remplir tous les champs.'); return; }
    if (!validateEmail(loginEmail)) { notify('Adresse email invalide.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();

      if (res.ok) {
        setCurrentUser(data.user);
        saveSession(data.user);
        setMessage({ text: '', type: '' });
        setLoginEmail(''); setLoginPassword('');
      } else {
        notify(data.error);
      }
    } catch {
      notify('Impossible de contacter le serveur. Lance bien node index.js !');
    } finally {
      setLoading(false);
    }
  };

  // --- Déconnexion ---
  const handleLogout = () => {
    setCurrentUser(null);
    saveSession(null);
    notify('Tu t\'es déconnecté avec succès.', 'success');
  };

  const switchView = (v) => { setView(v); setMessage({ text: '', type: '' }); };

  // --- Vue connecté ---
  if (currentUser) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.successIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 style={s.title}>Bienvenue !</h2>
          <p style={s.subtitle}>Connecté via l'API</p>
          <div style={s.infoBox}>
            <span style={s.infoLabel}>Email</span>
            <span style={s.infoValue}>{currentUser.email}</span>
          </div>
          <div style={s.infoBox}>
            <span style={s.infoLabel}>Membre depuis</span>
            <span style={s.infoValue}>{new Date(currentUser.createdAt).toLocaleDateString('fr-FR')}</span>
          </div>
          <div style={s.infoBox}>
            <span style={s.infoLabel}>ID en base</span>
            <span style={s.infoValue}>#{currentUser.id}</span>
          </div>
          <button style={s.btnDanger} onClick={handleLogout}>Se déconnecter</button>
        </div>
      </div>
    );
  }

  // --- Vue auth ---
  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>{view === 'login' ? 'Connexion' : 'Créer un compte'}</h1>

        {message.text && (
          <div style={message.type === 'success' ? s.msgSuccess : s.msgError}>
            {message.text}
          </div>
        )}

        {view === 'login' ? (
          <>
            <Field label="Email">
              <input style={s.input} type="email" value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)} placeholder="vous@email.com"
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </Field>
            <Field label="Mot de passe">
              <PwdInput value={loginPassword} onChange={setLoginPassword}
                show={showLoginPwd} onToggle={() => setShowLoginPwd(v => !v)} onEnter={handleLogin} />
            </Field>
            <button style={loading ? s.btnDisabled : s.btnPrimary} onClick={handleLogin} disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </>
        ) : (
          <>
            <Field label="Email">
              <input style={s.input} type="email" value={regEmail}
                onChange={e => setRegEmail(e.target.value)} placeholder="vous@email.com" />
            </Field>
            <Field label="Mot de passe" hint="6 caractères minimum">
              <PwdInput value={regPassword} onChange={setRegPassword}
                show={showRegPwd} onToggle={() => setShowRegPwd(v => !v)} />
            </Field>
            <Field label="Confirmer le mot de passe">
              <PwdInput value={regConfirm} onChange={setRegConfirm}
                show={showRegPwd} onToggle={() => setShowRegPwd(v => !v)} onEnter={handleRegister} />
            </Field>
            <button style={loading ? s.btnDisabled : s.btnPrimary} onClick={handleRegister} disabled={loading}>
              {loading ? 'Création...' : 'Créer le compte'}
            </button>
          </>
        )}

        <div style={s.divider} />
        <button style={s.btnLink} onClick={() => switchView(view === 'login' ? 'register' : 'login')}>
          {view === 'login' ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
        </button>
        {userCount > 0 && (
          <p style={s.hint}>{userCount} compte(s) dans la base de données</p>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>{label}</label>
        {hint && <span style={{ fontSize: 12, color: '#999' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function PwdInput({ value, onChange, show, onToggle, onEnter }) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        style={{ ...s.input, paddingRight: 44 }}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="••••••••"
        onKeyDown={e => e.key === 'Enter' && onEnter && onEnter()}
      />
      <button type="button" onClick={onToggle} style={s.eyeBtn}>
        {show ? '🙈' : '👁️'}
      </button>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'system-ui, sans-serif' },
  card: { background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', padding: '2rem', width: '100%', maxWidth: 400 },
  title: { fontSize: 24, fontWeight: 700, textAlign: 'center', color: '#1a1a2e', marginBottom: '0.25rem' },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: '1.25rem' },
  successIcon: { width: 64, height: 64, borderRadius: '50%', background: '#e1f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' },
  infoBox: { display: 'flex', justifyContent: 'space-between', background: '#f8f9ff', borderRadius: 8, padding: '10px 14px', marginBottom: 8 },
  infoLabel: { fontSize: 13, color: '#888' },
  infoValue: { fontSize: 13, fontWeight: 600, color: '#1a1a2e' },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, color: '#1a1a2e', background: '#fafafa', outline: 'none', boxSizing: 'border-box' },
  eyeBtn: { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0 },
  btnPrimary: { width: '100%', padding: '11px', background: '#3b6ee8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  btnDisabled: { width: '100%', padding: '11px', background: '#a0aed0', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'not-allowed', marginTop: 4 },
  btnDanger: { width: '100%', padding: '11px', background: '#e24b4a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: '1rem' },
  btnLink: { background: 'none', border: 'none', color: '#3b6ee8', fontSize: 13, cursor: 'pointer', width: '100%', textAlign: 'center' },
  divider: { borderTop: '1px solid #f0f0f0', margin: '1.25rem 0 1rem' },
  msgError: { background: '#fff0f0', color: '#c0392b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: '1rem' },
  msgSuccess: { background: '#e8f8f2', color: '#0f6e56', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: '1rem' },
  hint: { fontSize: 11, color: '#bbb', textAlign: 'center', marginTop: '0.75rem' },
};
