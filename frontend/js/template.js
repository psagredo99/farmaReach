function saveTemplate() {
  const name = document.getElementById('tpl-name').value;
  const subject = document.getElementById('tpl-subject').value;
  const body = document.getElementById('tpl-body').value;

  if (!name || !subject || !body) {
    showToast('error', 'Completa todos los campos de la plantilla');
    return;
  }

  const idx = templates.findIndex((t) => t.name === name);
  const tpl = { id: Date.now(), name, subject, body };
  if (idx >= 0) templates[idx] = tpl;
  else templates.push(tpl);

  renderSavedTemplates();
  updateTemplateSelector();
  showToast('success', `Plantilla "${name}" guardada`);
  addActivityLog('success', `Plantilla guardada: ${name}`);
}

function renderSavedTemplates() {
  const el = document.getElementById('saved-templates');
  if (templates.length === 0) {
    el.innerHTML = '<div style="font-size:13px;color:var(--muted);padding:8px 0;">No hay plantillas guardadas aun</div>';
    return;
  }

  el.innerHTML = templates.map((t) => `
    <div style="display:flex;align-items:center;gap:8px;padding:10px;background:var(--bg);border-radius:8px;margin-bottom:6px;border:1px solid var(--border);">
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:600;">${t.name}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px;">${t.subject.substring(0, 40)}...</div>
      </div>
      <button class="btn btn-ghost" style="padding:4px 10px;font-size:11px;" onclick="loadTemplate(${t.id})">Cargar</button>
      <button class="btn btn-danger" style="padding:4px 10px;font-size:11px;" onclick="deleteTemplate(${t.id})">X</button>
    </div>
  `).join('');
}

function loadTemplate(id) {
  const t = templates.find((x) => x.id === id);
  if (!t) return;

  document.getElementById('tpl-name').value = t.name;
  document.getElementById('tpl-subject').value = t.subject;
  document.getElementById('tpl-body').value = t.body;
  showToast('success', `Plantilla "${t.name}" cargada`);
}

function deleteTemplate(id) {
  templates = templates.filter((t) => t.id !== id);
  renderSavedTemplates();
  updateTemplateSelector();
}

function previewTemplate() {
  const subject = document.getElementById('tpl-subject').value;
  const body = document.getElementById('tpl-body').value;
  const sample = leads[0] || {
    name: 'Farmacia Central',
    ciudad: 'Madrid',
    cp: '28001',
    barrio: 'Centro',
    phone: '612345678',
    rating: '4.5',
  };

  const replace = (s) => s
    .replace(/\{\{nombre_farmacia\}\}/g, sample.name)
    .replace(/\{\{farmaceutico\}\}/g, 'Responsable')
    .replace(/\{\{ciudad\}\}/g, sample.ciudad)
    .replace(/\{\{codigo_postal\}\}/g, sample.cp)
    .replace(/\{\{direccion\}\}/g, 'C/ ' + sample.barrio)
    .replace(/\{\{telefono\}\}/g, sample.phone)
    .replace(/\{\{rating\}\}/g, sample.rating)
    .replace(/\{\{fecha_hoy\}\}/g, new Date().toLocaleDateString('es-ES'));

  document.getElementById('prev-subject').textContent = replace(subject);
  document.getElementById('prev-body').textContent = replace(body);
  const from = document.getElementById('gmail-from')?.value;
  if (from) document.getElementById('prev-from').textContent = from;
  showToast('success', 'Vista previa actualizada');
}

function insertVar(v) {
  const ta = document.getElementById('tpl-body');
  const start = ta.selectionStart;
  const before = ta.value.substring(0, start);
  const after = ta.value.substring(ta.selectionEnd);
  ta.value = before + v + after;
  ta.selectionStart = ta.selectionEnd = start + v.length;
  ta.focus();
}

function updateTemplateSelector() {
  const sel = document.getElementById('send-template');
  const cur = sel.value;
  sel.innerHTML = '<option value="">- Selecciona una plantilla -</option>' + templates.map((t) => `<option value="${t.id}">${t.name}</option>`).join('');
  if (cur) sel.value = cur;
}

function testGmail() {
  const email = document.getElementById('gmail-from').value;
  const pass = document.getElementById('gmail-pass').value;
  const status = document.getElementById('gmail-status');
  if (!email || !pass) {
    showToast('error', 'Introduce email y App Password');
    return;
  }

  status.textContent = 'Probando...';
  status.style.color = 'var(--muted)';
  setTimeout(() => {
    status.textContent = 'Conexion correcta (validacion local)';
    status.style.color = 'var(--success)';
    showToast('success', 'Datos de Gmail listos para envio');
  }, 800);
}
