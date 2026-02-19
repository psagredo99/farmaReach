function renderLeadsTable() {
  const tbody = document.getElementById('leads-tbody');
  const empty = document.getElementById('leads-empty');
  const wrap = document.getElementById('leads-table-wrap');

  if (leads.length === 0) {
    empty.style.display = '';
    wrap.style.display = 'none';
    document.getElementById('leads-count-label').textContent = '0 farmacias';
    return;
  }

  empty.style.display = 'none';
  wrap.style.display = '';

  const search = (document.getElementById('leads-search')?.value || '').toLowerCase();
  const filterStatus = document.getElementById('leads-filter-status')?.value || '';
  const filtered = leads.filter((l) =>
    (!search || l.name.toLowerCase().includes(search) || l.ciudad.toLowerCase().includes(search) || l.email.toLowerCase().includes(search)) &&
    (!filterStatus || l.status === filterStatus)
  );

  document.getElementById('leads-count-label').textContent = filtered.length + ' farmacia' + (filtered.length !== 1 ? 's' : '');
  document.getElementById('badge-count').textContent = leads.length;

  tbody.innerHTML = filtered.map((l) => `
    <tr>
      <td><input type="checkbox" ${selectedLeads.has(l.id) ? 'checked' : ''} onchange="toggleLead(${l.id}, this)"></td>
      <td>
        <div style="font-weight:600;font-size:13px;">${l.name}</div>
        <div style="font-size:11px;color:var(--muted);">${l.barrio}</div>
      </td>
      <td>${l.ciudad}</td>
      <td><span style="font-family:monospace;font-size:12px;">${l.cp}</span></td>
      <td>${l.phone}</td>
      <td>${l.email ? `<a href="mailto:${l.email}" style="color:var(--accent2);text-decoration:none;font-size:12px;">${l.email}</a>` : '<span style="color:var(--muted);font-size:11px;">-</span>'}</td>
      <td><span style="color:var(--accent3);">${l.rating}</span></td>
      <td><span class="badge badge-${l.status}">${{ new: 'Nuevo', pending: 'Pendiente', sent: 'Enviado', error: 'Error' }[l.status]}</span></td>
      <td>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-blue" style="padding:4px 10px;font-size:11px;" onclick="quickSend(${l.id})">Enviar</button>
          <button class="btn btn-danger" style="padding:4px 10px;font-size:11px;" onclick="removeLead(${l.id})">X</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterLeads() {
  renderLeadsTable();
}

function toggleLead(id, cb) {
  if (cb.checked) selectedLeads.add(id);
  else selectedLeads.delete(id);
  updateCampaignSummary();
}

function toggleAll(cb) {
  leads.forEach((l) => {
    if (cb.checked) selectedLeads.add(l.id);
    else selectedLeads.delete(l.id);
  });
  renderLeadsTable();
  updateCampaignSummary();
}

function selectAll() {
  leads.forEach((l) => selectedLeads.add(l.id));
  renderLeadsTable();
  updateCampaignSummary();
  showToast('success', `${leads.length} leads seleccionados`);
}

function removeLead(id) {
  leads = leads.filter((l) => l.id !== id);
  selectedLeads.delete(id);
  renderLeadsTable();
  updateStats();
}

function exportCSV() {
  if (leads.length === 0) {
    showToast('error', 'No hay leads para exportar');
    return;
  }

  const headers = ['Nombre', 'Ciudad', 'CP', 'Telefono', 'Email', 'Rating', 'Estado'];
  const rows = leads.map((l) => [l.name, l.ciudad, l.cp, l.phone, l.email, l.rating, l.status].join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'farmareach-leads.csv';
  a.click();
  showToast('success', 'CSV exportado correctamente');
}

async function refreshLeadsTable() {
  try {
    await loadLeadsFromApi();
    renderLeadsTable();
    showToast('success', 'Tabla de leads recargada');
  } catch (err) {
    showToast('error', err.message || 'No se pudo recargar la tabla');
  }
}
