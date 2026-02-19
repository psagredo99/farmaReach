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
    return;
  }

  loginTab.classList.add('active');
  registerTab.classList.remove('active');
  loginForm.style.display = '';
  registerForm.style.display = 'none';
}

async function loginUser() {
  const email = (document.getElementById('auth-login-email').value || '').trim();
  const password = document.getElementById('auth-login-password').value || '';
  const status = document.getElementById('auth-status');

  if (!email || !password) {
    status.textContent = 'Introduce email y password.';
    return;
  }

  try {
    status.textContent = 'Iniciando sesion...';
    const data = await apiPost('/auth/login', { email, password });
    authToken = data.access_token;
    localStorage.setItem('auth_token', authToken);
    setAuthUser(data.user);
    hideAuthOverlay();
    status.textContent = '';
    await initApp();
  } catch (err) {
    status.textContent = err.message || 'Error al iniciar sesion.';
  }
}

async function registerUser() {
  const email = (document.getElementById('auth-register-email').value || '').trim();
  const nombre = (document.getElementById('auth-register-name').value || '').trim();
  const password = document.getElementById('auth-register-password').value || '';
  const status = document.getElementById('auth-status');

  if (!email || !password) {
    status.textContent = 'Email y password son obligatorios.';
    return;
  }

  try {
    status.textContent = 'Creando cuenta...';
    const data = await apiPost('/auth/register', { email, nombre, password });
    authToken = data.access_token;
    localStorage.setItem('auth_token', authToken);
    setAuthUser(data.user);
    hideAuthOverlay();
    status.textContent = '';
    await initApp();
  } catch (err) {
    status.textContent = err.message || 'No se pudo crear la cuenta.';
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
