const API_BASE = (
  window.location.origin.includes('127.0.0.1:8000') ||
  window.location.origin.includes('localhost:8000')
) ? '' : 'http://127.0.0.1:8000';

function sourceToApi(source) {
  if (source === 'google') return 'google_maps';
  if (source === 'paginas') return 'paginas_amarillas';
  return 'openstreetmap';
}

function statusFromApi(status) {
  if (status === 'enviado') return 'sent';
  if (status === 'error') return 'error';
  if (status === 'pendiente') return 'pending';
  return 'new';
}

function normalizeTemplateVars(text) {
  return (text || '')
    .replace(/\{\{\s*nombre_farmacia\s*\}\}/g, '{{ nombre }}')
    .replace(/\{\{\s*ciudad\s*\}\}/g, '{{ zona }}')
    .replace(/\{\{\s*codigo_postal\s*\}\}/g, '{{ codigo_postal }}');
}

function mapLeadFromApi(row) {
  return {
    id: row.id,
    name: row.nombre || '',
    ciudad: row.zona || '',
    cp: row.codigo_postal || '',
    barrio: row.direccion || '',
    phone: row.telefono || '',
    email: row.email || '',
    rating: '-',
    website: row.website || '',
    source: row.fuente || '',
    status: statusFromApi(row.estado_envio),
    checked: false,
  };
}

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  return headers;
}

function onUnauthorized() {
  authToken = '';
  currentUser = null;
  localStorage.removeItem('auth_token');
  if (typeof showAuthOverlay === 'function') showAuthOverlay();
}

async function apiGet(path, params) {
  const url = new URL(path, API_BASE || window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });
  }

  const res = await fetch(url.toString(), {
    headers: authHeaders(),
  });
  if (res.status === 401) {
    onUnauthorized();
    throw new Error('Sesion expirada. Vuelve a iniciar sesion.');
  }
  if (!res.ok) {
    let detail = 'HTTP ' + res.status;
    try {
      const payload = await res.json();
      if (payload.detail) detail = payload.detail;
    } catch (_) {}
    throw new Error(detail);
  }
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body || {}),
  });
  if (res.status === 401) {
    onUnauthorized();
    throw new Error('Sesion expirada. Vuelve a iniciar sesion.');
  }

  if (!res.ok) {
    let detail = 'HTTP ' + res.status;
    try {
      const payload = await res.json();
      if (payload.detail) detail = payload.detail;
    } catch (_) {}
    throw new Error(detail);
  }
  return res.json();
}

function collectSearchParams() {
  const type = document.getElementById('search-type').value;
  const cp = (document.getElementById('cp-input').value || '').trim();
  const ciudad = (document.getElementById('ciudad-input').value || '').trim();
  const zona = (document.getElementById('zona-input').value || '').trim();
  return {
    codigo_postal: type === 'cp' ? cp.split(',')[0].trim() : '',
    zona: type === 'ciudad' ? ciudad : (type === 'zona' ? zona : ''),
  };
}

async function loadLeadsFromApi() {
  const rows = await apiGet('/leads', { limit: 1000 });
  leads = rows.map(mapLeadFromApi);
  updateStats();
  renderLeadsTable();
}

async function startScraping() {
  if (isScraping) return;
  isScraping = true;

  const btn = document.getElementById('btn-scrape');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Buscando...';

  const card = document.getElementById('progress-card');
  card.style.display = '';
  const log = document.getElementById('scraping-log');
  log.innerHTML = '';
  const fill = document.getElementById('progress-fill');
  const pct = document.getElementById('progress-pct');
  const ptxt = document.getElementById('progress-text');
  const max = parseInt(document.getElementById('filter-max').value, 10);

  const addLog = (type, msg) => {
    const line = document.createElement('div');
    line.className = 'log-line ' + type;
    const now = new Date().toLocaleTimeString();
    line.innerHTML = `<span class="ts">[${now}]</span> ${msg}`;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  };

  try {
    const { zona, codigo_postal } = collectSearchParams();
    if (!zona && !codigo_postal) throw new Error('Introduce una zona o codigo postal');

    fill.style.width = '20%';
    pct.textContent = '20%';
    ptxt.textContent = 'Conectando con backend...';
    addLog('info', 'Conectando con API local...');

    const data = await apiPost('/capture', {
      zona,
      codigo_postal,
      fuente: sourceToApi(activeSource),
      query_extra: '',
      max_items: max,
    });

    fill.style.width = '70%';
    pct.textContent = '70%';
    ptxt.textContent = 'Actualizando leads...';
    addLog('success', `Captacion completada: ${data.found || 0} encontrados`);

    if (Array.isArray(data.warnings)) data.warnings.forEach((w) => addLog('warn', w));

    await loadLeadsFromApi();

    fill.style.width = '100%';
    pct.textContent = '100%';
    ptxt.textContent = 'Proceso completado';
    addLog('success', `Nuevos guardados: ${data.saved || 0}`);
    addActivityLog('success', `Captacion ejecutada con ${sourceToApi(activeSource)}: ${data.found || 0} resultados`);
    showToast('success', `Busqueda completada: ${data.found || 0} resultados`);
  } catch (err) {
    addLog('error', err.message || String(err));
    showToast('error', err.message || 'Error en busqueda');
  } finally {
    isScraping = false;
    btn.disabled = false;
    btn.innerHTML = 'Iniciar busqueda';
  }
}

function resetScraping() {
  document.getElementById('progress-card').style.display = 'none';
  document.getElementById('scraping-log').innerHTML = '';
  document.getElementById('progress-fill').style.width = '0%';
  document.getElementById('progress-pct').textContent = '0%';
  document.getElementById('btn-scrape').disabled = false;
  document.getElementById('btn-scrape').innerHTML = 'Iniciar busqueda';
  isScraping = false;
}

async function quickSend(id) {
  const lead = leads.find((x) => x.id === id);
  if (!lead || !lead.email) {
    showToast('error', 'Este lead no tiene email');
    return;
  }

  const tplId = document.getElementById('send-template').value;
  const tpl = templates.find((t) => t.id == tplId);
  if (!tpl) {
    showToast('error', 'Selecciona una plantilla de email');
    return;
  }

  const remitente = document.getElementById('gmail-name').value || 'Equipo Comercial';
  const firma = (document.getElementById('gmail-name').value || '') + ' | ' + (document.getElementById('gmail-from').value || '');

  try {
    await apiPost('/campaign/send', {
      asunto: normalizeTemplateVars(tpl.subject),
      remitente,
      firma,
      propuesta_valor: 'colaboracion comercial para farmacia',
      template_text: normalizeTemplateVars(tpl.body),
      only_pending: false,
      lead_ids: [id],
    });

    lead.status = 'sent';
    addHistorial(lead, tpl.subject);
    renderLeadsTable();
    updateStats();
    showToast('success', `Email enviado a ${lead.name}`);
  } catch (err) {
    showToast('error', err.message || 'Error enviando email');
  }
}

async function startCampaign() {
  if (isSending) return;

  const tplId = document.getElementById('send-template').value;
  if (!tplId) {
    showToast('error', 'Selecciona una plantilla de email');
    return;
  }

  const tpl = templates.find((t) => t.id == tplId);
  if (!tpl) {
    showToast('error', 'Plantilla no encontrada');
    return;
  }

  const targetIds = [...selectedLeads].filter((id) => !!leads.find((l) => l.id === id && l.email));
  if (targetIds.length === 0) {
    showToast('error', 'No hay leads seleccionados con email');
    return;
  }

  isSending = true;
  document.getElementById('btn-send').disabled = true;
  document.getElementById('btn-pause').disabled = false;

  const card = document.getElementById('send-progress-card');
  card.style.display = '';
  const log = document.getElementById('send-log');
  log.innerHTML = '';
  const fill = document.getElementById('send-progress-fill');
  const pct = document.getElementById('send-progress-pct');
  const ptxt = document.getElementById('send-progress-text');

  try {
    const remitente = document.getElementById('gmail-name').value || 'Equipo Comercial';
    const firma = (document.getElementById('gmail-name').value || '') + ' | ' + (document.getElementById('gmail-from').value || '');

    ptxt.textContent = 'Enviando campana...';
    fill.style.width = '35%';
    pct.textContent = '35%';

    const result = await apiPost('/campaign/send', {
      asunto: normalizeTemplateVars(tpl.subject),
      remitente,
      firma,
      propuesta_valor: 'colaboracion comercial para farmacia',
      template_text: normalizeTemplateVars(tpl.body),
      only_pending: false,
      lead_ids: targetIds,
    });

    fill.style.width = '100%';
    pct.textContent = '100%';
    ptxt.textContent = 'Campana completada';

    const now = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = 'log-line success';
    line.innerHTML = `<span class="ts">[${now}]</span> OK: ${result.sent || 0} | Errores: ${result.errors || 0}`;
    log.appendChild(line);

    await loadLeadsFromApi();
    showToast('success', `Campana enviada. OK: ${result.sent || 0}, errores: ${result.errors || 0}`);
    addActivityLog('success', `Campana finalizada. OK: ${result.sent || 0}, errores: ${result.errors || 0}`);
  } catch (err) {
    showToast('error', err.message || 'Error en campana');
  } finally {
    isSending = false;
    document.getElementById('btn-send').disabled = false;
    document.getElementById('btn-pause').disabled = true;
  }
}

function pauseCampaign() {
  isSending = false;
  clearTimeout(sendInterval);
  document.getElementById('btn-send').disabled = false;
  document.getElementById('btn-pause').disabled = true;
  showToast('error', 'Campana pausada');
  addActivityLog('warn', 'Pausa solicitada (backend envia lote atomico)');
}

async function initApp() {
  try {
    await apiGet('/health');
    await loadLeadsFromApi();
    addActivityLog('success', 'Conectado al backend API');
  } catch (err) {
    addActivityLog('error', 'No se pudo conectar al backend: ' + (err.message || err));
    showToast('error', 'Backend no disponible en ' + API_BASE);
  }
}
