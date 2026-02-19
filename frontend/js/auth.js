function showAuthOverlay() {
  const overlay = document.getElementById('auth-overlay');
  if (overlay) overlay.style.display = 'flex';
}

function hideAuthOverlay() {
  const overlay = document.getElementById('auth-overlay');
  if (overlay) overlay.style.display = 'none';
}

function setAuthUser(user) {
  currentUser = user || null;
  const userEl = document.getElementById('current-user');
  if (userEl) {
    userEl.textContent = currentUser ? currentUser.email : 'Sin sesion';
  }
}

function maskEmail(email) {
  const value = String(email || '').trim();
  const parts = value.split('@');
  if (parts.length !== 2) return value;
  const local = parts[0];
  const domain = parts[1];
  if (local.length <= 2) return `**@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

function setAuthStatus(type, message) {
  const status = document.getElementById('auth-status');
  if (!status) return;

  if (!message) {
    status.textContent = '';
    status.className = 'auth-status';
    return;
  }

  status.textContent = message;
  status.className = 'auth-status show ' + type;
}

function setAuthBusy(mode, busy) {
  const inputIds = mode === 'register'
    ? ['auth-register-name', 'auth-register-email', 'auth-register-password']
    : ['auth-login-email', 'auth-login-password'];
  const buttonId = mode === 'register' ? 'auth-register-submit' : 'auth-login-submit';
  const button = document.getElementById(buttonId);

  inputIds.forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.disabled = busy;
  });

  if (button) {
    button.disabled = busy;
    button.innerHTML = busy
      ? '<span class="spin"></span> ' + (mode === 'register' ? 'Creando cuenta...' : 'Entrando...')
      : (mode === 'register' ? 'Crear cuenta' : 'Entrar');
  }
}

function normalizeAuthError(message, mode) {
  const text = String(message || '').toLowerCase();

  if (text.includes('invalid login credentials')) return 'Email o password incorrectos.';
  if (text.includes('email not confirmed')) return 'Tu cuenta aun no esta verificada. Revisa tu correo y confirma el registro.';
  if (text.includes('user already registered')) return 'Este email ya esta registrado. Inicia sesion con esa cuenta.';
  if (text.includes('password should be at least')) return 'La password es demasiado corta. Usa al menos 8 caracteres.';
  if (text.includes('unable to validate email address')) return 'El formato del email no es valido.';
  if (text.includes('supabase no configurado')) return 'No se puede autenticar ahora mismo. Contacta al administrador.';
  if (text.includes('failed to fetch') || text.includes('networkerror')) return 'No hay conexion con el servidor. Intentalo de nuevo.';

  return mode === 'register' ? 'No se pudo completar el registro.' : 'No se pudo iniciar sesion.';
}

function switchAuthTab(tab) {
  const loginTab = document.getElementById('auth-tab-login');
  const registerTab = document.getElementById('auth-tab-register');
  const loginForm = document.getElementById('auth-login-form');
  const registerForm = document.getElementById('auth-register-form');

  if (tab === 'register') {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.style.display = '';
    loginForm.style.display = 'none';
    setAuthStatus('', '');
    return;
  }

  loginTab.classList.add('active');
  registerTab.classList.remove('active');
  loginForm.style.display = '';
  registerForm.style.display = 'none';
  setAuthStatus('', '');
}

async function loginUser() {
  const email = (document.getElementById('auth-login-email').value || '').trim();
  const password = document.getElementById('auth-login-password').value || '';

  console.info('[auth] login submit', { email: maskEmail(email) });
  if (!email || !password) {
    setAuthStatus('error', 'Introduce email y password.');
    return;
  }

  if (!email.includes('@')) {
    setAuthStatus('error', 'Introduce un email valido.');
    return;
  }

  setAuthBusy('login', true);
  try {
    setAuthStatus('info', 'Iniciando sesion...');
    const data = await apiPost('/auth/login', { email, password });
    authToken = data.access_token;
    localStorage.setItem('auth_token', authToken);
    setAuthUser(data.user);
    console.info('[auth] login success', { email: maskEmail(email) });
    setAuthStatus('success', 'Inicio de sesion correcto.');
    showToast('success', 'Inicio de sesion correcto. Bienvenido/a.');
    hideAuthOverlay();
    await initApp();
  } catch (err) {
    console.warn('[auth] login failed', { email: maskEmail(email), error: err.message || String(err) });
    const friendlyError = normalizeAuthError(err.message, 'login');
    setAuthStatus('error', friendlyError);
    showToast('error', friendlyError);
  } finally {
    setAuthBusy('login', false);
  }
}

async function registerUser() {
  const email = (document.getElementById('auth-register-email').value || '').trim();
  const nombre = (document.getElementById('auth-register-name').value || '').trim();
  const password = document.getElementById('auth-register-password').value || '';

  console.info('[auth] register submit', { email: maskEmail(email), hasNombre: Boolean(nombre) });
  if (!email || !password) {
    setAuthStatus('error', 'Email y password son obligatorios.');
    return;
  }

  if (!email.includes('@')) {
    setAuthStatus('error', 'Introduce un email valido.');
    return;
  }

  if (password.length < 8) {
    setAuthStatus('error', 'La password debe tener al menos 8 caracteres.');
    return;
  }

  setAuthBusy('register', true);
  try {
    setAuthStatus('info', 'Creando cuenta...');
    const data = await apiPost('/auth/register', { email, nombre, password });
    const registerMsg = data.message || 'Cuenta creada. Revisa tu correo para verificarla antes de iniciar sesion.';
    switchAuthTab('login');
    console.info('[auth] register success', { email: maskEmail(email), requiresVerification: true });
    setAuthStatus('success', registerMsg);
    showToast('success', 'Registro correcto. Revisa tu correo y confirma el enlace para poder iniciar sesion.');

    document.getElementById('auth-register-password').value = '';
    const loginEmail = document.getElementById('auth-login-email');
    if (loginEmail) loginEmail.value = email;
  } catch (err) {
    console.warn('[auth] register failed', { email: maskEmail(email), error: err.message || String(err) });
    const friendlyError = normalizeAuthError(err.message, 'register');
    setAuthStatus('error', friendlyError);
    showToast('error', friendlyError);
  } finally {
    setAuthBusy('register', false);
  }
}

async function bootstrapAuth() {
  if (!authToken) {
    showAuthOverlay();
    setAuthUser(null);
    return;
  }

  try {
    const user = await apiGet('/auth/me');
    setAuthUser(user);
    hideAuthOverlay();
    await initApp();
  } catch (_) {
    authToken = '';
    localStorage.removeItem('auth_token');
    setAuthUser(null);
    showAuthOverlay();
  }
}

function logoutUser() {
  authToken = '';
  currentUser = null;
  localStorage.removeItem('auth_token');
  setAuthUser(null);
  leads = [];
  selectedLeads = new Set();
  renderLeadsTable();
  updateStats();
  showAuthOverlay();
}
